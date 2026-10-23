import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { handleRequest } from '../server.mjs';
import { buildFrame, demoPayload, renderOutput } from '../public/lab.mjs';

test('the fixed version never writes to an HTML sink', () => {
  let text;
  const target = { set textContent(value) { text = value; }, set innerHTML(_) { throw Error('HTML forbidden'); } };
  for (const input of [demoPayload, '<script>alert(1)</script>', '<b>Hello</b>', 'A & B']) {
    renderOutput(target, input, false);
    assert.equal(text, input);
  }
});

test('the vulnerable version forwards the unchanged payload to innerHTML', () => {
  const target = {};
  renderOutput(target, demoPayload, true);
  assert.equal(target.innerHTML, demoPayload);
});

test('input cannot terminate the iframe transport script', () => {
  const input = '</script><script>throw new Error("escape")</script>\u2028';
  for (const vulnerable of [true, false]) {
    const html = buildFrame(input, vulnerable);
    assert.equal((html.match(/<\/script>/g) || []).length, 1);
    const output = {};
    const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
    vm.runInNewContext(script, { document: { getElementById: () => output } });
    assert.equal(output[vulnerable ? 'innerHTML' : 'textContent'], input);
  }
});

test('HTTP handler serves only public files and rejects writes', async () => {
  // Exercise real responses without requiring sockets or network access in CI.
  async function request(url, method = 'GET') {
    const result = {};
    await handleRequest({ url, method }, {
      writeHead(status, headers) { result.status = status; result.headers = headers; },
      end(body) { result.body = body?.toString() ?? ''; },
    });
    return result;
  }
  for (const route of ['/', '/app.js', '/lab.mjs', '/style.css']) {
    const response = await request(route);
    assert.equal(response.status, 200);
    assert.match(response.headers['Content-Security-Policy'], /connect-src 'none'/);
  }
  const html = (await request('/')).body;
  assert.equal((html.match(/sandbox="allow-scripts"/g) || []).length, 3);
  for (const route of ['/server.mjs', '/package.json', '/%2e%2e/README.md']) {
    assert.equal((await request(route)).status, 404);
  }
  assert.equal((await request('/', 'POST')).status, 405);
  assert.equal((await request('/', 'HEAD')).body, '');
});
