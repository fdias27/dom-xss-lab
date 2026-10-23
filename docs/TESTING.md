# Testing and verification evidence

## Recorded verification — 2026-10-23

| Check | Result | Method |
| --- | --- | --- |
| Unit and exercise regression suite | **11 passed** | Node.js v24.22.1, `node --test test/*.test.mjs` |
| Exercise starter negative control | **7 failed as expected** | Started the exercise in an isolated working copy; exercised the actual regression suite |
| Exercise reset recovery | **7 passed** | Restored the solution in that copy and reran the exercise suite |
| HTML interpretation | **Confirmed** | Local app browser: one bold element in the vulnerable output; literal tags in the fixed output |
| Event-handler execution | **Confirmed** | Local app browser: vulnerable status changed; fixed status remained unchanged |
| Editable renderer | **Confirmed** | Third preview preserved the full payload as text and created zero injected child elements |
| Parent-origin isolation | **Confirmed** | Attempted `parent.document` from the vulnerable frame; access was blocked |
| Review progress and reset | **Confirmed** | Reviewing the same step twice counted once; reset restored zero reviewed steps and the initial comment |
| Markdown export | **Confirmed** | Downloaded the report and checked its observations and explicit self-review disclaimer |
| Mobile breakpoint | **Confirmed at 390 × 844** | No horizontal page overflow; challenge navigation and the third preview remained available |
| Standalone Playwright suite | **Included; local launch blocked** | The environment closed the Edge automation process before a page could open |
| GitHub Actions | **Configured; not yet run** | Requires publishing the repository and enabling Actions |

The browser observations were checked through the integrated app browser against the local application. They are not a claim that the standalone Playwright suite passed. Re-run that suite on your own machine or inspect GitHub Actions after publishing. The browser version of the integrated preview was not recorded.

## Unit and regression coverage

```sh
npm test
```

No third-party packages are required. Tests cover:

- Choosing the vulnerable and corrected sinks.
- Protecting the iframe transport from an input containing a closing script tag.
- Returning only allowlisted public resources, rejecting HTTP writes, and handling HEAD requests.
- Preserving ordinary text, HTML-looking text, the demonstration event payload, script terminators, Unicode with line breaks, and empty input in `renderComment`.
- Executing the editable renderer in the generated third-preview document.

The sink tests use property setters to reject HTML assignments. The VM checks exercise JavaScript transport and renderer behavior; they do not model a browser's HTML parser or events. HTTP tests call the request handler directly without socket transport.

## Exercise red/green control

Follow [EXERCISE.md](EXERCISE.md), or use a disposable copy of the repository:

```sh
node scripts/exercise.mjs start
npm run test:exercise
# Expected: 7 failures with the intentionally vulnerable starter.
node scripts/exercise.mjs reset
npm run test:exercise
# Expected: 7 passing tests with the working solution.
```

The helper overwrites only the editable renderer. The final distributed project contains the solution, not the failing starter.

## Standalone browser suite

```sh
npm install
npx playwright install chromium
npm run test:browser
```

There are seven browser scenarios:

1. Bold markup renders only in the vulnerable preview.
2. The invalid-image event handler executes only in the vulnerable iframe.
3. The editable renderer preserves adversarial and ordinary comments in a real DOM, creating no injected elements.
4. The sandbox blocks parent-document access.
5. Review progress is idempotent and reset clears the lab state.
6. The Markdown download contains the learner's notes and an honest self-review checklist.
7. The mobile layout avoids horizontal overflow and retains working controls.

Each scenario uses a fresh browser context. Requests for `http://lab.test` are fulfilled through the actual `handleRequest` function, including its security headers; requests to other origins are aborted. This keeps tests independent of server ports and external websites. It does **not** verify listening sockets, proxies, or production hosting.

For installed Microsoft Edge on Windows, you can select that channel instead of downloading Chromium:

```powershell
$env:BROWSER_CHANNEL = "msedge"
npm run test:browser
```

The configured Linux CI job installs Chromium and its system dependencies, then runs the same suite. Unit tests run separately on Node.js 22 and 24. The app itself has no runtime dependencies; Playwright is development-only.

## Screenshots

- [Desktop investigation view](images/lab-overview.png)
- [Execution comparison](images/execution-comparison.png)
- [Mobile workbench](images/lab-mobile.png)

These are captures of the actual local UI. The execution comparison is cropped from the desktop capture without changing its content.

To refresh screenshots during a successful automated browser run:

```powershell
$env:CAPTURE_SCREENSHOTS = "1"
npm run test:browser
```

On macOS/Linux: `CAPTURE_SCREENSHOTS=1 npm run test:browser`.

## Limits

This suite is not a comprehensive security audit. It does not test stored or server-reflected XSS, sessions, credential access, all browser engines, or every possible hostile input. The UI progress indicator is self-reported and has no role in deciding whether a patch is secure.
