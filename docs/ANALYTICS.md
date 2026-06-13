# Docs Site Analytics

This document explains how to enable web analytics on the documentation site and lists the remaining operational measurement tasks that are not automated by this repository.

## In-repo instrumentation: Cloudflare Web Analytics

The docs site (`docs/`) uses **Cloudflare Web Analytics** for privacy-friendly, cookie-free traffic measurement. The beacon script is injected at build time via the Starlight `head` configuration in `docs/astro.config.mjs`.

The beacon is **only included in the built output when the `PUBLIC_CF_ANALYTICS_TOKEN` environment variable is set**. If the variable is absent the site builds normally with no analytics code emitted — so local development and CI builds remain clean without any configuration.

### Enabling analytics

1. Create a Cloudflare Web Analytics site in the Cloudflare dashboard (<https://dash.cloudflare.com/>) and copy the token shown in the beacon snippet.
2. Set the environment variable before building or in your deployment environment:

   ```bash
   # Local build with analytics enabled
   PUBLIC_CF_ANALYTICS_TOKEN=your_token_here pnpm run build
   ```

   For Cloudflare Workers / Wrangler deployments, add the variable as a secret or in `wrangler.jsonc` under `[vars]` (do **not** commit a real token):

   ```jsonc
   // wrangler.jsonc — use wrangler secret put PUBLIC_CF_ANALYTICS_TOKEN for production
   {
     "name": "stripe-pwa-elements-docs",
     "compatibility_date": "2025-01-01",
     "assets": { "directory": "./dist" }
   }
   ```

   Recommended: store the token as a Wrangler secret so it never appears in source control:

   ```bash
   wrangler secret put PUBLIC_CF_ANALYTICS_TOKEN
   ```

3. Deploy as usual (`pnpm run deploy`). Cloudflare Web Analytics will appear in the dashboard within a few minutes of the first page views.

### What is tracked

Cloudflare Web Analytics collects page views, referrers, browsers, and countries without setting cookies or storing personal data. It is compliant with GDPR and CCPA without requiring a consent banner.

---

## Operational measurement tasks (not automated by this repository)

The following KPI measurements are manual or operational. They do not require any code changes and are not managed by this repository.

### npm download tracking

- **npm-stat** (<https://npm-stat.com/charts.html?package=stripe-pwa-elements>): provides download history charts for the package. Bookmark and check periodically.
- **pkgstats** (<https://pkgstats.dev/pkg/stripe-pwa-elements>): alternative dashboard for npm download trends.
- Both services read from the public npm registry — no setup required, no credentials needed.

### GitHub repository Insights

The GitHub repository provides built-in traffic and engagement metrics under the **Insights** tab (only visible to repository collaborators):

- **Traffic → Views**: unique visitors and total page views over the last 14 days.
- **Traffic → Clones**: how often the repository is cloned.
- **Stars / Forks**: tracked automatically; historical trends visible on third-party tools such as [Star History](https://star-history.com/#wpkyoto/stripe-pwa-elements).

These metrics are not exportable via a public API without authentication; recording them over time requires a manual snapshot process or a scheduled script using the GitHub API with a personal access token.
