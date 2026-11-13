# Contributing to Duskmoth

Thank you for contributing. Contact: hello@duskmoth.xyz.

1. Open an issue describing a reproducible bug or a narrowly scoped proposal.
2. Fork the repository and create a descriptive branch.
3. Add regression tests and run `npm test` and `npm run check:package` before submitting a pull request.
4. Describe the behavior change, test results, and any remaining limitations.

## Safety requirements

- Never submit API tokens, seed phrases, wallet private keys, signed payloads, real user data, or .env files.
- Use ephemeral unfunded fixtures for automated tests. No CI job may move mainnet funds.
- Keep wallet approval separate from AI intent parsing; an AI response is not transaction authorization.
- Do not replace unknown balances with zero, screening failures with approval, or pending transactions with success.
- Report vulnerabilities privately using GitHub's private reporting feature when available, or contact hello@duskmoth.xyz first for a secure reporting channel. Do not email keys or private financial records.
- Include upstream notices. The project license does not replace dependency or asset licenses.

Use real commits with an accurate author identity. Do not backdate commits, fabricate contributors, or generate contribution activity.

By submitting code, you agree to license your original contribution under this repository's MIT license.

## Where to start

- Use [Discussions](https://github.com/duskmoth-dev/duskmoth-sdk/discussions) for integration questions.
- Pick an open `good first issue` or `help wanted` item and discuss your scope before starting.
- Keep examples import-safe and use offline fixtures. Read-only examples must not consume passes.
- Preserve zero runtime dependencies unless a concrete need and security review justify a change.
- Keep CI actions pinned to reviewed commit hashes; dependency updates are proposals, not automatic merges.
- Follow [publishing instructions](docs/publishing.md); maintainers own releases and npm access.

Useful upstream contributions require an actual reproducible issue, a focused change, and regression
tests. Do not create empty forks, duplicate listing requests, fabricated bugs, or activity-only PRs.
