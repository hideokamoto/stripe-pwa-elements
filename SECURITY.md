# Security Policy

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Use one of the following channels instead:

1. **GitHub Security Advisories (preferred)** — open a private advisory at
   `https://github.com/wpkyoto/stripe-pwa-elements/security/advisories/new`.
2. **Direct email** — contact the lead maintainer Hidetaka Okamoto at the email
   address listed on his GitHub profile (<https://github.com/hideokamoto>).

### Response SLA

| Step | Target time |
|---|---|
| Initial acknowledgement | Within **2 business days** |
| Triage / impact assessment | Within **5 business days** |
| Fix or mitigation published | Within **30 days** for critical/high; best-effort for lower severity |

We will coordinate a responsible-disclosure timeline with you before publishing any advisory.

---

## Supported Versions

| Version | Supported |
|---|---|
| 3.x (latest) | Yes |
| 2.x | Security fixes only (best-effort) |
| < 2.x | No |

---

## Scope

This package wraps Stripe's official JavaScript SDK (`@stripe/stripe-js`) and Stripe Elements.
Card data **never** passes through this library's DOM, JavaScript memory, or network requests —
all sensitive fields are rendered inside Stripe-hosted iframes (see the SAQ-A note in
[`readme.md`](./readme.md#security--pci-dss-saq-a)).

Vulnerabilities in `@stripe/stripe-js` itself should be reported directly to Stripe at
<https://stripe.com/docs/security/stripe>.

---

## Supply Chain

### npm provenance

We recommend publishing releases with attestation so consumers can verify that a package
on npm was built from this exact source tree:

```bash
# Requires npm ≥ 9.5 and a GitHub Actions environment with id-token permission
npm publish --provenance
```

When the CI publish workflow is added in the future, include this flag.
Maintainers publishing locally should also pass `--provenance` if their npm version
supports it and they are authenticated to a supported registry.

For reference, the recommended `publishConfig` entry in `package.json` to opt in
automatically is:

```json
{
  "publishConfig": {
    "provenance": true
  }
}
```

This entry is **not yet present** in `package.json` because releases currently use `np`
locally rather than a CI publish workflow. It will be added once the CI workflow is in place.

---

## Acknowledgements

We follow the [Contributor Covenant Code of Conduct](.github/CODE_OF_CONDUCT.md).
