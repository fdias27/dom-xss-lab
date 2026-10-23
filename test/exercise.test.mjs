import test from 'node:test';
import assert from 'node:assert/strict';
import { demoPayload, buildFrame, renderComment } from '../public/lab.mjs';
import vm from 'node:vm';

for (const [name, input] of Object.entries({
  'ordinary text': 'Thanks for sharing!',
  'HTML-like text': '<b>This must stay literal</b>',
  'event-handler payload': demoPayload,
  'script terminator': '</script><script>alert(1)</script>',
  'Unicode and line breaks': 'Olá 🌍\nA & B < C',
  'empty comment': '',
})) {
  test(`exercise preserves ${name} without writing HTML`, () => {
    let text;
    const target = {
      set textContent(value) { text = value; },
      set innerHTML(_) { assert.fail('Unsafe HTML sink reached. Comments must be plain text.'); },
    };
    renderComment(target, input);
    assert.equal(text, input, 'The whole comment must be preserved.');
  });
}

test('the third preview executes the editable renderer with the original comment', () => {
  const html = buildFrame(demoPayload, false, renderComment);
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const target = {};
  vm.runInNewContext(script, { document: { getElementById: () => target } });
  assert.equal(target.textContent, demoPayload);
  assert.equal(target.innerHTML, undefined);
});
