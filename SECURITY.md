# Security policy

## Intended scope

This repository is a local educational lab. `renderOutput` and the exercise starter deliberately demonstrate an unsafe HTML sink. The inline-script allowance is deliberate. These known teaching behaviors are documented in the README and are not undisclosed findings.

The shipped editable renderer is corrected. Preview frames omit `allow-same-origin`; the server binds to loopback and serves an explicit allowlist. There are no real accounts, sessions, or stored comments.

## Reporting an unexpected issue

Examples of unexpected issues include access to private files through the server or demonstration code gaining access to the main document despite the stated isolation.

Use GitHub private vulnerability reporting if it is enabled for the repository. Otherwise, open an issue describing the affected component and requesting a private reporting channel; do not include secrets or a detailed harmful exploit in the public issue. This project does not promise a response SLA.

Test only your own local instance. Do not use personal data, deploy the intentionally vulnerable lab publicly, or target third-party systems without explicit authorization.
