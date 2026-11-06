import { WHATSAPP_NUMBER } from './data/shopConfig';

// Every "Order on WhatsApp" message ends with the same empty address form (same fields as the checkout page),
// so the customer only has to fill it in and press send.
export const WA_ADDRESS_LINES = [
  '',
  'My details:',
  'Name:',
  'Phone:',
  'City / District (জেলা):',
  'Zone / Thana (থানা / উপজেলা):',
  'Area:',
  'House / Road / Village (বাড়ি, রাস্তা, গ্রামের নাম):',
];

export const bdt = (n) => `BDT ${Math.round(Number(n) || 0)}`;

// lines = the order part of the message (products); the address form is added at the end
export const waOrderText = (lines) => [...lines, ...WA_ADDRESS_LINES].join('\n');
export const waLinkFor = (text) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
export const waOrderLink = (lines) => waLinkFor(waOrderText(lines));

// The shop link the customer is on (set by App.jsx; null = the main store). Every WhatsApp order message then says
// which shop it came from and links the product inside that shop, so the team can open it and place the order for
// that shop (the seller earns the markup).
let waShop = null;
export const setWaShop = (s) => { waShop = s && s.url ? { name: String(s.name || ''), url: String(s.url) } : null; };
const shopLines = () => (waShop ? [`* Shop: ${waShop.name} (${waShop.url})`] : []);
const productUrl = (id) => (id ? `${waShop ? waShop.url : (typeof window !== 'undefined' ? window.location.origin : 'https://www.kyvro.store')}?product=${encodeURIComponent(id)}` : '');

// One product (card or detail page). color / size / id are optional.
export const waProductLines = ({ id, name, color, size, qty = 1, price }) => [
  'Hello Kyvro, I want to order:',
  '',
  ...shopLines(),
  `* Name: ${name}`,
  ...(id ? [`* Link: ${productUrl(id)}`] : []),
  ...(color ? [`* Color: ${color}`] : []),
  ...(size ? [`* Size: ${size}`] : []),
  `* Quantity: ${qty}`,
  `* Price: ${bdt(price)}${qty > 1 ? ` x ${qty} = ${bdt((Number(price) || 0) * qty)}` : ''}`,
];

// The whole cart
export const waCartLines = (items) => {
  const list = (items || []).slice(0, 30);
  const total = list.reduce((a, it) => a + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  return [
    'Hello Kyvro, I want to order these items:',
    '',
    ...shopLines(),
    ...(waShop ? [''] : []),
    ...list.map((it, i) => {
      const opts = [it.selectedColor ? `Color: ${it.selectedColor}` : '', it.selectedSize ? `Size: ${it.selectedSize}` : '', `Qty: ${it.quantity}`].filter(Boolean).join(' | ');
      return `${i + 1}. ${it.name}\n   ${opts}\n   Price: ${bdt(it.price)} x ${it.quantity} = ${bdt(it.price * it.quantity)}${it.id ? `\n   Link: ${productUrl(it.id)}` : ''}`;
    }),
    '',
    `Items total: ${bdt(total)}`,
  ];
};
