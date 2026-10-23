# Technical report: DOM XSS in a comment preview

## Summary

The intentionally vulnerable implementation passes an untrusted comment to `innerHTML`. The browser interprets it as markup, including event handlers. A crafted invalid image runs an `onerror` handler and changes the preview's status message.

The corrected implementation uses `textContent` because comments are required to be plain text. The input is preserved, but it no longer creates elements or handlers.

**Classification:** DOM-based Cross-Site Scripting; CWE-79. This is a local training finding, not a report against a real service. No CVSS score is assigned: the lab has no real users, sessions, or production deployment assumptions.

## Feature and trust boundary

A discussion-board author writes a comment and previews it before submitting. In this lab, only the preview exists: no comment is posted or saved.

1. `app.js` reads user-controlled `input.value`.
2. `buildFrame` JSON-serializes the string and escapes `<` to prevent premature termination of the transport script.
3. A sandboxed iframe receives a preview document.
4. `renderOutput(target, input, true)` assigns the original comment to `target.innerHTML`.
5. The browser creates HTML elements and their event handlers.

The unsafe sink is step 4. The transport escaping in step 2 protects a different context; it does not sanitize the final HTML. The fixed reference uses `renderOutput(..., false)`. The editable solution is `renderComment` in `public/lab.mjs`.

## Reproduction

Start the lab with `npm start` and open `http://127.0.0.1:3000`.

### Establish markup interpretation

Enter:

```html
<b>This comment should be plain text.</b>
```

The vulnerable preview creates a bold element. The fixed preview displays the full string. This alone proves HTML interpretation, not script execution.

### Establish JavaScript execution

Choose challenge 02 and load its input:

```html
<img src="data:image/png;base64,AA==" onerror="document.getElementById('proof').textContent='XSS executed: you controlled JavaScript in this panel.'; this.remove()">
```

The data does not represent a valid PNG. The image's load error triggers the handler, which updates `#proof` and removes the image.

**Observed vulnerable behavior:** `XSS executed: you controlled JavaScript in this panel.`

**Observed fixed behavior:** the entire payload remains visible as text; the original status message remains unchanged.

![Observed execution and literal rendering](images/execution-comparison.png)

## Impact and constraints

The demonstrated capability is execution of input-controlled JavaScript inside the vulnerable preview frame. In a real application without these boundaries, XSS could affect visible data or actions available to a victim's browser session. Those outcomes are not reproduced here.

There is no sharing mechanism, stored input, authentication, session cookie, or other user's visit in this lab. Input is entered manually by the learner. The sandbox omits `allow-same-origin`, so the preview has an opaque origin and cannot read the main document. A separate browser check confirmed that attempting `parent.document` throws and can be caught as “Parent access blocked”.

This is DOM XSS because client-side code processes the data unsafely. “Reflected” and “stored” describe how a payload arrives; these categories can overlap with DOM-based processing. This lab does not implement stored XSS or a server-reflected payload.

## Remediation

For a normal element whose content must be plain text:

```diff
 export function renderComment(target, comment) {
-  target.innerHTML = comment;
+  target.textContent = comment;
 }
```

The fix preserves ordinary text, Unicode, line breaks, angle brackets, and the entire demonstration payload without creating HTML elements. Rejecting every comment containing `<`, stripping a few tags, or removing the word `script` does not meet this feature's requirement.

If formatted HTML were a product requirement, this remediation would change rendering behavior. That different requirement needs a maintained HTML sanitizer, an explicit allowed-formatting policy, and relevant regression tests. Do not copy this text-only solution into other execution contexts without reviewing the data flow.

## Verification

- Regression tests assert preservation of ordinary comments, HTML-like text, event payloads, script terminators, Unicode, and empty input.
- Transport tests ensure comments cannot terminate the iframe's transport script.
- Browser scenarios assert event execution in the vulnerable frame, literal output in the corrected and editable renderers, and denied parent-document access.
- Additional browser scenarios cover reset, self-review progress, exported notes, and a narrow viewport.

See [TESTING.md](TESTING.md) for the actual verification status. A test file's existence is not evidence that it passed.

## Defense in depth

Loopback binding and an explicit file allowlist limit the server's exposure. Iframe sandboxing isolates the preview origin. CSP limits resources and connections. Inline script is intentionally permitted for this demonstration; that exception is not suitable as a production security baseline.

The primary fix remains selecting the right sink. The lab is not designed to safely execute arbitrary hostile JavaScript: CPU denial of service and deceptive content inside a frame are still possible.

## References

- [OWASP: DOM based XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [MDN: innerHTML security considerations](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML)
