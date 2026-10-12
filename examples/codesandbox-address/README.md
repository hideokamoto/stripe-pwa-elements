# stripe-pwa-elements — CodeSandbox demo (Address Element)

Interactive demo of [`<stripe-address-element>`](https://github.com/hideokamoto/stripe-pwa-elements)
running as a real Vite project inside a CodeSandbox **devbox**: the element
collects a billing address and the `formSubmit` event payload is shown.

## Try it

Open in CodeSandbox:

```
https://codesandbox.io/p/devbox/github/hideokamoto/stripe-pwa-elements/tree/main/examples/codesandbox-address
```

1. Wait for the devbox to install dependencies (`npm install`) and start Vite (`npm start` on port 3000 — `vite.config.js` already allows the `*.csb.app` / `*.csb.run` preview hosts).
   The preview lives at `https://<sandbox-id>-3000.csb.app`.
2. Click **Render address form**.
3. Fill the address form and click **Save** — the submitted address appears in the log panel.

The wiring in `index.js` is what a production bundler integration uses
(see `docs/guides/bundler-integration`), except it imports the self-registering
`stripe-elements.esm.js` bundle — the same file the `unpkg` field points at.

```js
import 'stripe-pwa-elements/dist/stripe-elements/stripe-elements.esm.js';
```

## How it works

```
GET  /api/config            -> publishable key (pk_test_…)
                              stripe-address-element renders the address form
Submit                       -> formSubmit event with the collected address
```

The demo server runs in **test mode** — nothing is charged and no data is
stored.
