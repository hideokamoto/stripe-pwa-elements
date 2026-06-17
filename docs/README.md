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

The docs site exposes API endpoints that let demo HTML (e.g. StackBlitz embeds) obtain the demo
account's public `pk_test_` key and a Stripe `clientSecret`, all without any key in the page source.
The secret key stays on the server.

> **WARNING**: Only Stripe test keys (`sk_test_*` or `rk_test_*`) are permitted. Never configure a live key (`sk_live_*` / `rk_live_*`).
> The server validates the key prefix and will refuse to start if a live key is found.

### Endpoints

#### `GET /api/config`

Returns the demo account's Stripe **publishable** key. Browser demos call this so they never need to
hardcode or ask the user to paste a key. The returned key belongs to the same account as
`STRIPE_SECRET_KEY`, so any `clientSecret` from the endpoints below is usable with it (Stripe.js
requires the publishable key and the `clientSecret` to come from the same account).

**Response** (200):

```json
{ "publishableKey": "pk_test_xxx" }
```

**Error responses**:
- `403` — origin not allowed
- `500` — `STRIPE_PUBLISHABLE_KEY` not configured or not a `pk_test_` key

---

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
- Any `*.stackblitz.io` subdomain

Set `ALLOWED_ORIGINS` to a comma-separated list to **fully override** the defaults (the StackBlitz
entries are no longer trusted unless you include them). Each entry may be an exact origin
(`https://example.com`) or a `*.suffix` wildcard (`*.stackblitz.io`, matched as a host suffix).

---

### Local development

1. Copy `.dev.vars.example` to `.dev.vars`:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Edit `.dev.vars` and fill in your test key:

   ```bash
   STRIPE_SECRET_KEY=sk_test_or_rk_test_your_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   ALLOWED_ORIGINS=http://localhost:4321
   ```

   `STRIPE_PUBLISHABLE_KEY` must be the **publishable** key from the **same Stripe account** as the
   secret key above. The `/api/config` endpoint serves it to browser demos.

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
# When prompted, paste your sk_test_ or rk_test_ key

wrangler secret put STRIPE_PUBLISHABLE_KEY
# When prompted, paste the pk_test_ key from the SAME Stripe account
```

> The publishable key is public by design, so it can also be set as a plain `var` instead of a secret
> if you prefer. It must belong to the same account as `STRIPE_SECRET_KEY`.

Then deploy:

```bash
pnpm run deploy
```

> **Reminder**: Only test-mode keys (`sk_test_` or `rk_test_`) are accepted. Providing a live key
> (`sk_live_` / `rk_live_`) will cause the endpoint to return a 500 error without leaking any
> secret or stack trace.
>
> **Recommended**: Use a **restricted key** (`rk_test_`) with only these permissions:
> - `PaymentIntents: Write`
> - `Checkout Sessions: Write`
>
> This minimises blast radius if the key is ever exposed.
