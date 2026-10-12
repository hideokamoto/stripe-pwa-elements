// Same import a Vite / webpack / Capacitor project uses — see
// docs/guides/bundler-integration. Registers <stripe-payment-element>.
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
import { fetchPublishableKey, fetchPaymentIntentClientSecret } from './helpers.js';

const renderBtn = document.getElementById('render-btn');
const keyStatus = document.getElementById('key-status');
const errorMsg = document.getElementById('error-msg');
const currencySelect = document.getElementById('currency');
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
    // A real integration creates the PaymentIntent on its own server and passes
    // the clientSecret to the component. Here the demo server does it for you.
    const clientSecret = await fetchPaymentIntentClientSecret(currencySelect.value);

    const el = document.createElement('stripe-payment-element');
    el.setAttribute('publishable-key', publishableKey);
    el.setAttribute('intent-client-secret', clientSecret);
    el.setAttribute('intent-type', 'payment');
    el.setAttribute('button-label', 'Pay now');
    el.setAttribute('sheet-title', 'Demo checkout');

    el.addEventListener('stripeLoaded', () => logResult('event: stripeLoaded', { loaded: true }));
    el.addEventListener('formSubmit', () => logResult('event: formSubmit', { submitted: true }));
    el.addEventListener('defaultFormSubmitResult', ({ detail }) => {
      // detail is Error | PaymentIntentResult | SetupIntentResult
      if (detail instanceof Error) {
        logResult('payment failed', { message: detail.message });
      } else {
        logResult('payment result', detail);
      }
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
