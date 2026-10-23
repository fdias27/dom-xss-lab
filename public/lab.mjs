export const demoPayload = `<img src="data:image/png;base64,AA==" onerror="document.getElementById('proof').textContent='XSS executed: you controlled JavaScript in this panel.'; this.remove()">`;

// EDITABLE EXERCISE: this working solution preserves comments as plain text.
// To practice, replace only this function with the starter in exercises/.
export function renderComment(target, comment) {
  target.textContent = comment;
}

// Same input, two ways to update a text element.
export function renderOutput(target, input, vulnerable) {
  if (vulnerable) {
    target.innerHTML = input; // INTENTIONALLY VULNERABLE: sandbox only.
  } else {
    target.textContent = input; // Fix for this text context.
  }
}

export function buildFrame(input, vulnerable, renderer = renderOutput) {
  // Prevent input from closing the script block used to transport data.
  // The demonstrated flaw stays exclusively in renderOutput innerHTML.
  const serialized = JSON.stringify(input).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
    <style>body{font:14px/1.6 system-ui;color:#dbe4ef;background:#101923;padding:18px;overflow-wrap:anywhere;margin:0}.author{color:#a1afbc;font-size:11px;letter-spacing:1px}.avatar{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#253d40;color:#b8e6bd;margin-right:8px}#proof{color:#b8e6bd;font-size:12px;border-top:1px solid #2a3642;padding-top:14px;margin-top:22px}#output{white-space:pre-wrap;margin-top:16px}</style>
    <div class="author"><span class="avatar">JD</span>JAMIE D. / COMMENT PREVIEW</div>
    <div id="output"></div><p id="proof" role="status">No injected JavaScript has executed.</p>
    <script>(${renderer.toString()})(document.getElementById('output'), ${serialized}, ${Boolean(vulnerable)});<\/script></html>`;
}
