// The package's self-registering ESM bundle — same file the CDN `unpkg`
// field points at, loaded through npm. Registers <stripe-address-element>
// (and all other components) with no extra calls.
import 'stripe-pwa-elements/dist/stripe-elements/stripe-elements.esm.js';
import { fetchPublishableKey } from './helpers.js';

const renderBtn = document.getElementById('render-btn');
const keyStatus = document.getElementById('key-status');
const errorMsg = document.getElementById('error-msg');
const demoContainer = document.getElementById('demo-container');
const resultLog = document.getElementById('result-log');

let publishableKey = null;

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.hidden = false;
}

function clearError() {
  errorMsg.textContent = '';
  errorMsg.hidden = true;
}

function maskKey(key) {
  return key.length > 12 ? `${key.slice(0, 8)}…${key.slice(-4)}` : key;
}

function logResult(label, detail) {
  resultLog.textContent += `${label}\n${JSON.stringify(detail, null, 2)}\n\n`;
}

// Fetch the demo publishable key on load so the user only has to click Render.
(async () => {
  try {
    publishableKey = await fetchPublishableKey();
    keyStatus.textContent = `Using demo key: ${maskKey(publishableKey)}`;
    renderBtn.disabled = false;
  } catch (err) {
    keyStatus.textContent = 'Could not load the demo key.';
    showError(err.message);
  }
})();

renderBtn.addEventListener('click', async () => {
  if (!publishableKey) {
    return;
  }
  clearError();
  renderBtn.disabled = true;
  demoContainer.innerHTML = '';
  demoContainer.hidden = false;
  resultLog.textContent = '';

  try {
    const el = document.createElement('stripe-address-element');
    el.setAttribute('publishable-key', publishableKey);
    el.setAttribute('sheet-title', 'Billing address');
    el.setAttribute('button-label', 'Save');

    el.addEventListener('stripeLoaded', () => logResult('event: stripeLoaded', { loaded: true }));
    el.addEventListener('formSubmit', ({ detail }) => {
      // detail carries the collected address (and the stripe instance for
      // further calls, e.g. creating a PaymentMethod or Customer update).
      logResult('event: formSubmit', detail);
    });

    demoContainer.appendChild(el);
  } catch (err) {
    demoContainer.innerHTML = '';
    demoContainer.hidden = true;
    showError(`Error: ${err.message}`);
  } finally {
    renderBtn.disabled = false;
  }
});
