# stripe-pwa-elements docs

このディレクトリは **Astro + Starlight** で作ったドキュメントサイトです。

## 開発

```bash
npm run docs:dev
```

## ビルド

```bash
npm run docs:build
```

## コンポーネントAPIの同期

`src/components/**/readme.md`（Stencil `docs-readme` 出力）を `docs/src/content/docs/components/` に同期します。

- `docs/package.json` の `sync:components`
- `docs:build` はビルド前に自動で同期します

---

## Serverless API Endpoints

The docs site exposes two API endpoints that allow demo HTML (e.g. StackBlitz embeds) to obtain a Stripe
`clientSecret` using only a public `pk_test_` key in the browser. The secret key stays on the server.

> **WARNING**: Only Stripe test keys (`sk_test_*`) are permitted. Never configure a `sk_live_` key.
> The server validates the key prefix and will refuse to start if a live key is found.

### Endpoints

#### `POST /api/create-payment-intent`

Creates a Stripe PaymentIntent with `automatic_payment_methods` enabled.

**Request body** (JSON):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currency` | string | No | ISO 4217 lower-case currency code. Defaults to `usd`. |

**Allowed currencies and demo amounts**:

| Currency | Amount (smallest unit) |
|----------|----------------------|
| `usd` | 1000 (= $10.00) |
| `eur` | 1000 (= €10.00) |
| `gbp` | 1000 (= £10.00) |
| `aud` | 1000 (= A$10.00) |
| `jpy` | 1000 (= ¥1000) |

**Response** (200):

```json
{ "clientSecret": "pi_xxx_secret_xxx" }
```

**Error responses**:
- `400` — unsupported currency
- `500` — server configuration error or Stripe API failure (no secrets or stack traces included)

---

#### `POST /api/create-checkout-session`

Creates an embedded Stripe Checkout Session (`ui_mode: 'embedded'`).

**Request body** (JSON):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currency` | string | No | ISO 4217 lower-case currency code. Defaults to `usd`. |

Same allowed currencies and demo amounts as above.

The `return_url` is set to the `Origin` header of the incoming request (falling back to the production
docs URL `https://stripe-pwa-elements-docs.workers.dev`) with `?session_id={CHECKOUT_SESSION_ID}` appended.

**Response** (200):

```json
{ "clientSecret": "cs_xxx_secret_xxx" }
```

**Error responses**:
- `400` — unsupported currency
- `500` — server configuration error or Stripe API failure

---

### CORS

CORS headers are emitted only when the `Origin` request header matches the allowlist. Preflight (`OPTIONS`)
requests receive a `204` response with the appropriate headers.

**Default allowed origins** (when `ALLOWED_ORIGINS` is not set):
- `https://stripe-pwa-elements-docs.workers.dev`
- `http://localhost:4321`
- `https://stackblitz.com`
- Any `*.stackblitz.io` subdomain (suffix match)

To override, set `ALLOWED_ORIGINS` to a comma-separated list of exact origins (suffix match for
`.stackblitz.io` always applies).

---

### Local development

1. Copy `.dev.vars.example` to `.dev.vars`:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Edit `.dev.vars` and fill in your test key:

   ```
   STRIPE_SECRET_KEY=sk_test_your_key_here
   ALLOWED_ORIGINS=http://localhost:4321
   ```

   The `@astrojs/cloudflare` adapter reads `.dev.vars` automatically during `astro dev` — no extra
   configuration is needed.

3. Start the dev server:

   ```bash
   pnpm dev
   ```

---

### Production deployment (Cloudflare Workers)

Set the secret via Wrangler — never commit it to the repository:

```bash
wrangler secret put STRIPE_SECRET_KEY
# When prompted, paste your sk_test_ key
```

Then deploy:

```bash
pnpm run deploy
```

> **Reminder**: Only `sk_test_` keys are accepted. Providing a `sk_live_` key will cause the endpoint
> to return a 500 error without leaking any secret or stack trace.
