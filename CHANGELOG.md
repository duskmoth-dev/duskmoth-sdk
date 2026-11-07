# Changelog

## 0.2.0

- Add Moth Pass configuration, existing-burn issuance, and split-withdraw redemption HTTP methods.
- Add AI Pack planning and Private Payroll batch authorization HTTP methods.
- Add TypeScript premium request and response contracts.
- Use operation-specific timeouts: screening/redemption 30s, issuance 60s, and AI/Payroll 90s.
- Preserve the global timeout override and support individual operation overrides.
- Validate premium request structure and send only supported fields.
- Expose sanitized HTTP status, error code, request reference and numeric retry delay without raw response bodies.
- Reject HTTP redirects and never retry pass-consuming operations automatically.
- Document exact-request recovery, separate AI/Payroll charges, seven-day AI result recovery and bearer-proof protection.
- Include side-effect-free examples and expanded offline regression tests.

Existing basic API methods remain available. No new runtime dependencies, automatic wallet signing,
cryptographic pass generation, blockchain execution, or npm registry publication is introduced.

## 0.1.0

Initial dependency-free HTTP client for configuration, intent, activity, screening, score and relayer configuration.
