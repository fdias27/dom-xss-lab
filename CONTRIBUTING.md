# Contributing

Keep changes focused on the documented comment-preview data flow. Explain the behavior you are changing, why it matters, and which tests you ran.

- Run `npm test` for unit and exercise regressions.
- Run `npm run test:browser` after changing rendering, sandboxing, challenge controls, or exports.
- Keep the corrected renderer and regression tests intact. Isolate intentionally vulnerable exercise code and label it clearly.
- Update the technical report when the data flow, threat model, or remediation changes.
- Keep browser screenshots consistent with the actual UI, and distinguish executed checks from planned coverage.
- Use English for repository documentation and interface text.

See `SECURITY.md` for reporting unexpected security issues.
