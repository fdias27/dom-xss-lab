import { buildFrame, demoPayload, renderComment } from './lab.mjs';

const initialComment = 'Thanks for the walkthrough. This preview looks useful!';
const challenges = [
  { name: 'OBSERVE', title: 'When does a comment become HTML?', description: 'You are reviewing the preview feature of a discussion board. Comments should be plain text. Test whether the renderer respects that requirement.', input: '<b>This comment should be plain text.</b>', expected: 'Only the vulnerable preview renders bold text. The fixed preview shows the angle brackets and tags. HTML interpretation alone is not proof of JavaScript execution.', hint: 'Trace input.value into renderOutput in public/lab.mjs. Which assignment asks the browser to parse HTML?' },
  { name: 'DEMONSTRATE', title: 'Prove execution, without collecting data.', description: 'Use an invalid image with an error handler to change a message inside the preview. This gives you a visible, local proof of JavaScript execution.', input: demoPayload, expected: 'The vulnerable preview says “XSS executed”. The fixed preview displays the entire input literally and keeps its original status message.', hint: 'The image data is invalid. The resulting error event runs the onerror handler only when the string becomes an actual HTML element.' },
  { name: 'REMEDIATE', title: 'Fix the sink. Keep the comment intact.', description: 'The product requirement is plain text. Inspect public/lab.mjs and follow docs/EXERCISE.md to reproduce a regression and repair the renderer yourself.', input: demoPayload, expected: 'The fixed preview and your patched renderer display the payload as literal text. Run both the regression tests and the browser tests before calling the fix complete.', hint: 'Use target.textContent = comment. Do not strip tags or delete the input: ordinary comments, Unicode, and HTML-looking text must remain intact.' },
];
const input = document.getElementById('input');
let currentStep = 0;
const reviewed = new Set();
function run() {
  document.getElementById('vulnerable').srcdoc = buildFrame(input.value, true);
  document.getElementById('fixed').srcdoc = buildFrame(input.value, false);
  document.getElementById('exercise').srcdoc = buildFrame(input.value, false, renderComment);
  document.getElementById('status').textContent = 'Previews updated. Compare interpretation, execution, and literal text.';
}
function selectStep(index) {
  currentStep = index;
  const challenge = challenges[index];
  document.getElementById('mission-number').textContent = `CHALLENGE 0${index + 1} / ${challenge.name}`;
  document.getElementById('mission-title').textContent = challenge.title;
  document.getElementById('mission-description').textContent = challenge.description;
  document.getElementById('expected-result').textContent = challenge.expected;
  document.getElementById('hint').textContent = challenge.hint;
  document.getElementById('patch-section').hidden = index !== 2;
  document.querySelectorAll('.step').forEach((button, i) => {
    button.classList.toggle('active', i === index);
    if (i === index) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  updateProgress();
}
function updateProgress() {
  document.getElementById('progress-label').textContent = `${reviewed.size} / 3 steps reviewed`;
  document.getElementById('progress-bar').style.width = `${reviewed.size / 3 * 100}%`;
  document.getElementById('mark-reviewed').textContent = reviewed.has(currentStep) ? 'Reviewed ✓' : 'Mark this step reviewed ✓';
  document.querySelectorAll('.step').forEach((button, i) => button.classList.toggle('reviewed', reviewed.has(i)));
}
document.querySelectorAll('.step').forEach(button => button.addEventListener('click', () => selectStep(Number(button.dataset.step))));
document.getElementById('load-example').addEventListener('click', () => { input.value = challenges[currentStep].input; run(); });
document.getElementById('mark-reviewed').addEventListener('click', () => { reviewed.add(currentStep); updateProgress(); });
document.getElementById('run').addEventListener('click', run);
document.getElementById('payload').addEventListener('click', () => { input.value = demoPayload; run(); });
document.getElementById('reset').addEventListener('click', () => { input.value = initialComment; reviewed.clear(); document.getElementById('notes').value = ''; document.getElementById('export-status').textContent = ''; selectStep(0); run(); });
document.getElementById('export').addEventListener('click', () => {
  const notes = document.getElementById('notes').value.trim() || '(No observations recorded yet.)';
  const report = `# DOM XSS — Investigation notes\n\nDate: ${new Date().toISOString().slice(0, 10)}\n\nScope: local, sandboxed comment preview.\n\n## Self-review checklist\n${challenges.map((c, i) => `- [${reviewed.has(i) ? 'x' : ' '}] ${c.name}`).join('\n')}\n\nThis checklist is self-reported, not an automated security result.\n\n## Observations\n${notes}\n\n## Regression evidence\nRecord the commands, results, and browser version you actually tested.\n`;
  const url = URL.createObjectURL(new Blob([report], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'dom-xss-investigation.md'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.getElementById('export-status').textContent = 'Your Markdown notes have been exported.';
});
selectStep(0);
run();
