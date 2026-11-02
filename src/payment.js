import { PAY_PROVIDER } from './data/shopConfig';

// Opens the SSLCommerz payment page (bKash + cards) for an order that is already saved.
// Resolves with the page address, or throws an Error with a message that can be shown to the customer.
export async function getPaymentUrl(orderNumber, method = 'any') {
  let r;
  try {
    r = await fetch(PAY_PROVIDER === 'uddokta' ? '/api/uddokta-init' : '/api/sslcommerz-init', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNumber, method }) });
  } catch (e) {
    throw new Error('No internet connection. Please try again.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) throw new Error(j.error || 'Online payment is not available right now.');
  return j.url;
}

export async function startOnlinePayment(orderNumber) {
  const url = await getPaymentUrl(orderNumber);
  window.location.href = url;
}
