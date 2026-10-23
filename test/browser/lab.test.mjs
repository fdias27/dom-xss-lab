import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { handleRequest } from '../../server.mjs';
import { demoPayload } from '../../public/lab.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
let browser;
before(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  console.log(`Browser evidence: ${browser.version()}`);
});
after(async () => { await browser?.close(); });

async function openLab(t, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Fulfill navigation and module requests with the real HTTP handler, including
  // its actual CSP headers. No running server or external network is required.
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://lab.test') return route.abort();
    const response = { status: 500, headers: {}, body: '' };
    await handleRequest({ url: url.pathname + url.search, method: request.method() }, {
      writeHead(status, headers) { response.status = status; response.headers = headers; },
      end(body) { response.body = body ?? ''; },
    });
    await route.fulfill(response);
  });
  await page.goto('http://lab.test/');
  await page.locator('#status').filter({ hasText: 'Previews updated' }).waitFor();
  return { page, errors };
}
async function waitForFrame(page, id, expected, proof) {
  const frame = page.frameLocator(`#${id}`);
  // Poll for this particular run, not the previous iframe document.
  await frame.locator('#output').filter({ hasText: expected }).waitFor();
  if (proof) await frame.locator('#proof').filter({ hasText: proof }).waitFor();
  return frame;
}
test('HTML markup renders only in the vulnerable preview', async t => {
  const { page, errors } = await openLab(t);
  await page.locator('#load-example').click();
  const unsafe = await waitForFrame(page, 'vulnerable', 'This comment should be plain text.');
  const safe = await waitForFrame(page, 'fixed', '<b>This comment should be plain text.</b>');
  assert.equal(await unsafe.locator('#output b').count(), 1);
  assert.equal(await safe.locator('#output b').count(), 0);
  assert.deepEqual(errors, []);
});

test('the event handler executes only in the vulnerable iframe', async t => {
  const { page, errors } = await openLab(t);
  await page.locator('[data-step="1"]').click();
  await page.locator('#load-example').click();
  const unsafe = page.frameLocator('#vulnerable');
  await unsafe.locator('#proof').filter({ hasText: 'XSS executed:' }).waitFor();
  const safe = await waitForFrame(page, 'fixed', demoPayload, 'No injected JavaScript has executed.');
  assert.equal(await safe.locator('#output').textContent(), demoPayload);
  assert.equal(await safe.locator('#output img').count(), 0);
  assert.equal(await unsafe.locator('#output img').count(), 0, 'The executing payload removes its image.');
  assert.equal(await page.locator('#mission-title').textContent(), 'Prove execution, without collecting data.');
  assert.deepEqual(errors, []);
  if (process.env.CAPTURE_SCREENSHOTS) {
    const directory = new URL('../../docs/images/', import.meta.url);
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: fileURLToPath(new URL('lab-overview.png', directory)), fullPage: true });
    await page.locator('.comparison').screenshot({ path: fileURLToPath(new URL('execution-comparison.png', directory)) });
  }
});

test('the editable patch preserves malicious and ordinary comments in a real DOM', async t => {
  const { page } = await openLab(t);
  await page.locator('[data-step="2"]').click();
  for (const input of [demoPayload, '<script>window.bad=true</script>', '</script><img src=x onerror=alert(1)>', 'A & B < C — 🌍', '<b>Hello</b>']) {
    await page.locator('#input').fill(input);
    await page.locator('#run').click();
    const frame = await waitForFrame(page, 'exercise', input, 'No injected JavaScript has executed.');
    assert.equal(await frame.locator('#output').textContent(), input);
    assert.equal(await frame.locator('#output *').count(), 0);
  }
});

test('sandbox prevents injected code from reading the parent document', async t => {
  const { page } = await openLab(t);
  const payload = `<img src="data:image/png;base64,AA==" onerror="try { parent.document.body; document.getElementById('proof').textContent='PARENT ACCESS'; } catch(e) { document.getElementById('proof').textContent='Parent access blocked'; } this.remove()">`;
  await page.locator('#input').fill(payload);
  await page.locator('#run').click();
  await page.frameLocator('#vulnerable').locator('#proof').filter({ hasText: 'Parent access blocked' }).waitFor();
});

test('self-review progress is idempotent and reset clears the lab', async t => {
  const { page } = await openLab(t);
  await page.locator('#mark-reviewed').click();
  await page.locator('#mark-reviewed').click();
  assert.equal(await page.locator('#progress-label').textContent(), '1 / 3 steps reviewed');
  for (const step of [1, 2]) {
    await page.locator(`[data-step="${step}"]`).click();
    await page.locator('#mark-reviewed').click();
  }
  assert.equal(await page.locator('#progress-label').textContent(), '3 / 3 steps reviewed');
  await page.locator('#notes').fill('My observations');
  await page.locator('#reset').click();
  assert.equal(await page.locator('#progress-label').textContent(), '0 / 3 steps reviewed');
  assert.equal(await page.locator('#notes').inputValue(), '');
  assert.equal(await page.locator('#patch-section').isVisible(), false);
  await waitForFrame(page, 'vulnerable', 'Thanks for the walkthrough. This preview looks useful!', 'No injected JavaScript has executed.');
});

test('field notes download contains observations and the honest self-review checklist', async t => {
  const { page } = await openLab(t);
  await page.locator('#notes').fill('Root cause: innerHTML. Fix: textContent.');
  await page.locator('#mark-reviewed').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'dom-xss-investigation.md');
  const contents = await readFile(await download.path(), 'utf8');
  assert.match(contents, /Root cause: innerHTML/);
  assert.match(contents, /\[x\] OBSERVE/);
  assert.match(contents, /self-reported, not an automated security result/);
});

test('mobile layout has no horizontal page overflow and retains usable controls', async t => {
  const { page } = await openLab(t, { width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('[data-step="2"]').click();
  assert.equal(await page.locator('#patch-section').isVisible(), true);
  await page.locator('#payload').click();
  await waitForFrame(page, 'exercise', demoPayload);
  if (process.env.CAPTURE_SCREENSHOTS) {
    const directory = new URL('../../docs/images/', import.meta.url);
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: fileURLToPath(new URL('lab-mobile.png', directory)), fullPage: true });
  }
});
