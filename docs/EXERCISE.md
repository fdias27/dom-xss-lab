# Patch the comment preview

## Goal

Turn an unsafe comment renderer into a plain-text renderer, while preserving the complete comment. The finished project ships with the solution. This exercise deliberately reintroduces the flaw only in `renderComment`; the reference comparison stays available.

## 1. Establish the baseline

From the project folder:

```sh
npm test
```

The unit and exercise tests should pass. Open the app and select **03 Remediate** to see the third preview, which executes your editable function.

## 2. Reproduce the regression

Run:

```sh
node scripts/exercise.mjs start
npm run test:exercise
```

The helper replaces only `renderComment` in `public/lab.mjs` with the starter function from `exercises/comment-renderer.starter.mjs`. Other demonstration code remains intact. It does not run automatically on installation or startup.

Expected result: the exercise tests fail because the renderer reaches an unsafe HTML sink instead of displaying literal text. This red result is intentional at this stage.

Reload the app, choose challenge 03, and load its example. **Your patch output** now behaves like the vulnerable preview. The fixed reference still displays literal text.

## 3. Trace the source and sink

Find the value read from the draft-comment textarea in `public/app.js`, then follow it into `buildFrame` and `renderComment` in `public/lab.mjs`.

Explain these separately:

- Why JSON serialization and escaping `<` protect transport into the frame.
- Why passing that original string to `innerHTML` still permits HTML interpretation.
- Why HTML interpretation alone is not yet evidence of JavaScript execution.
- Why this feature should use plain text rather than accepted HTML formatting.

## 4. Repair the code

Edit only the body of `renderComment`. Preserve every input character and stop treating the comment as HTML. Do not change or disable the tests, remove the payload, or hide the vulnerable preview to get a green result.

<details>
<summary>Show the solution</summary>

```js
export function renderComment(target, comment) {
  target.textContent = comment;
}
```

This works for a normal element used to display plain text. It is not a general-purpose sanitizer.

</details>

## 5. Verify the patch

```sh
npm run test:exercise
npm test
npm install
npx playwright install chromium
npm run test:browser
```

The first two commands need only Node.js. Browser testing also needs the development dependency and a browser installation. Reload the app after saving code; the browser tests use the current files automatically.

Confirm that the payload appears literally in your third preview and its status message does not change. Also test a normal comment, `<b>Hello</b>`, Unicode, and line breaks. Use the field notes to record your actual observations and test output.

## Reset or recover

To restore the reference solution without replacing other lab code:

```sh
node scripts/exercise.mjs reset
```

The helper expects the original exported function signature. If you changed that signature, copy the solution function from `exercises/comment-renderer.solution.mjs` back into `public/lab.mjs` manually. Starting/resetting the exercise overwrites edits inside that function; save your work first if needed.
