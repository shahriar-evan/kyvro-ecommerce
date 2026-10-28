import { FB_PIXEL_ID, GA_MEASUREMENT_ID } from './analyticsConfig';

// Facebook Pixel + Google Analytics 4. Nothing is loaded until an ID is filled in src/analyticsConfig.js.
// All calls are safe: if a tracker is off or blocked (ad blocker), they do nothing and never break the website.
const CURRENCY = 'BDT';
let started = false;

const safe = (fn) => { try { fn(); } catch (e) { /* tracking must never break the shop */ } };

export function initAnalytics() {
  if (started || typeof window === 'undefined') return;
  started = true;

  if (FB_PIXEL_ID) {
    safe(() => {
      /* eslint-disable */
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq('init', FB_PIXEL_ID);
    });
  }

  if (GA_MEASUREMENT_ID) {
    safe(() => {
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
    });
  }
}

const fb = (...args) => safe(() => { if (FB_PIXEL_ID && window.fbq) window.fbq(...args); });
const ga = (...args) => safe(() => { if (GA_MEASUREMENT_ID && window.gtag) window.gtag(...args); });

const gaItem = (p, qty = 1) => ({
  item_id: String(p.id ?? p.name),
  item_name: p.name,
  item_category: p.category || '',
  price: Number(p.price) || 0,
  quantity: qty,
  ...(p.selectedColor ? { item_variant: p.selectedColor } : {}),
});

// Every time the customer moves to another page of the shop (the website is one page, so this is done by hand)
export function trackPageView(view) {
  ga('event', 'page_view', { page_path: `/${view}`, page_title: view, page_location: window.location.origin + '/' + view });
  fb('track', 'PageView');
}

export function trackViewContent(product) {
  if (!product) return;
  fb('track', 'ViewContent', { content_ids: [String(product.id)], content_name: product.name, content_type: 'product', value: Number(product.price) || 0, currency: CURRENCY });
  ga('event', 'view_item', { currency: CURRENCY, value: Number(product.price) || 0, items: [gaItem(product)] });
}

export function trackAddToCart(product, qty = 1) {
  const value = (Number(product.price) || 0) * qty;
  fb('track', 'AddToCart', { content_ids: [String(product.id)], content_name: product.name, content_type: 'product', value, currency: CURRENCY });
  ga('event', 'add_to_cart', { currency: CURRENCY, value, items: [gaItem(product, qty)] });
}

export function trackInitiateCheckout(cart, total) {
  const num = cart.reduce((n, i) => n + i.quantity, 0);
  fb('track', 'InitiateCheckout', { content_ids: cart.map((i) => String(i.id)), num_items: num, value: Number(total) || 0, currency: CURRENCY });
  ga('event', 'begin_checkout', { currency: CURRENCY, value: Number(total) || 0, items: cart.map((i) => gaItem(i, i.quantity)) });
}

export function trackPurchase(order) {
  const value = Number(order.total) || 0;
  const items = order.items || [];
  fb('track', 'Purchase', { content_ids: items.map((i) => String(i.id)), content_type: 'product', num_items: items.reduce((n, i) => n + i.quantity, 0), value, currency: CURRENCY });
  ga('event', 'purchase', {
    transaction_id: order.orderNumber,
    currency: CURRENCY,
    value,
    shipping: Number(order.shipping) || 0,
    items: items.map((i) => ({ item_id: String(i.id), item_name: i.name, price: Number(i.price) || 0, quantity: i.quantity })),
  });
}
