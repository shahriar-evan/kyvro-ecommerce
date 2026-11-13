import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Truck, Clock, Wallet, RotateCcw, PackageSearch } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppButton';
import { WHATSAPP_NUMBER, deliveryNote, ONLINE_PAY_ON } from '../data/shopConfig';
import { totalStock, supplierOutFor, productColors } from '../data/catalog';

// The website's help chat (bottom-right button).
//  - Quick buttons (delivery charge / time, Cash on Delivery, returns) answer here in the browser: free, no AI.
//  - Track order (button, or an order code + phone typed in the chat): api/plan?action=chat op 'order' (status only; the phone
//    must match the order) → one friendly sentence (Bangla, then English) + the order card.
//  - Anything typed → api/plan?action=chat op 'ask' (AI on OpenRouter) with this page's in-stock products and the store facts;
//    the answer can show product cards that open the product.
// Never sends or shows supplier data or anyone's personal details.

const STATUS_BN = { Pending: 'অর্ডার গ্রহণ করা হয়েছে', Processing: 'প্রসেসিং চলছে', Shipped: 'শিপ করা হয়েছে', Delivered: 'ডেলিভার্ড', Cancelled: 'বাতিল' };
const DELIVERY_TIME = { en: 'Delivery time: inside Dhaka 1–2 days, outside Dhaka 3–4 days.', bn: 'ডেলিভারি সময়: ঢাকার ভিতরে ১–২ দিন, ঢাকার বাইরে ৩–৪ দিন।' };
const COD = {
  en: `Yes, Cash on Delivery is available all over Bangladesh: pay when the product arrives.${ONLINE_PAY_ON ? ' You can also pay online with bKash / Nagad.' : ''}`,
  bn: `হ্যাঁ, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি আছে: পণ্য হাতে পেয়ে টাকা দিন।${ONLINE_PAY_ON ? ' চাইলে বিকাশ / নগদে অনলাইনেও পেমেন্ট করতে পারেন।' : ''}`,
};
const RETURNS = {
  en: 'Please check the product in front of the delivery person. If anything is wrong, return it to them right then (you pay only the delivery charge). After the delivery person leaves, a return or exchange needs an extra delivery charge. Online payments for orders not delivered are refunded within 14 days to the same bKash / Nagad.',
  bn: 'ডেলিভারি ম্যানের সামনেই পণ্য চেক করুন। সমস্যা থাকলে তখনই ফেরত দিন (শুধু ডেলিভারি চার্জ দিতে হবে)। ডেলিভারি ম্যান চলে যাওয়ার পর রিটার্ন বা এক্সচেঞ্জে অতিরিক্ত ডেলিভারি চার্জ লাগবে। ডেলিভারি না হলে অনলাইন পেমেন্ট ১৪ দিনের মধ্যে একই বিকাশ / নগদে ফেরত দেওয়া হয়।',
};

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const bnNum = (s) => String(s).replace(/[0-9]/g, (d) => BN_DIGITS[d]);
const dayText = (iso, bn) => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return bn ? bnNum(d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' })) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
// One friendly sentence (Bangla + English) for an order's status
function statusSentence(o) {
  const inside = o.area === 'Inside Dhaka';
  const outside = o.area === 'Outside Dhaka';
  const eta = inside ? ['১–২ দিনের', '1–2 days'] : outside ? ['৩–৪ দিনের', '3–4 days'] : ['২–৪ দিনের', '2–4 days'];
  const when = dayText(o.statusAt);
  const whenBn = dayText(o.statusAt, true);
  const head = [`অর্ডার ${o.number}:`, `Order ${o.number}:`];
  switch (o.status) {
    case 'Processing':
      return { bn: `${head[0]} আপনার অর্ডার কনফার্ম হয়েছে ✅ এখন প্যাকিং / প্রসেসিং চলছে। শিপ হওয়ার পর ${eta[0]} মধ্যে আপনার কাছে পৌঁছে যাবে।`,
        en: `${head[1]} your order is confirmed ✅ and is being packed now. After it ships, it reaches you within ${eta[1]}.` };
    case 'Shipped':
      return { bn: `${head[0]} আপনার অর্ডার শিপ হয়ে গেছে 🚚${whenBn ? ` (${whenBn})` : ''}, ডেলিভারির পথে আছে। আগামী ${inside ? '১–২' : outside ? '২–৩' : '১–৩'} দিনের মধ্যে আপনার কাছে পৌঁছে যাবে।`,
        en: `${head[1]} your order has shipped 🚚${when ? ` (${when})` : ''} and is on the way. It will reach you in the next ${inside ? '1–2' : outside ? '2–3' : '1–3'} days.` };
    case 'Delivered':
      return { bn: `${head[0]} আপনার অর্ডার ডেলিভার হয়ে গেছে 🎉${whenBn ? ` (${whenBn})` : ''}। Kyvro থেকে কেনার জন্য ধন্যবাদ!`,
        en: `${head[1]} your order has been delivered 🎉${when ? ` (${when})` : ''}. Thank you for shopping with Kyvro!` };
    case 'Cancelled':
      return { bn: `${head[0]} এই অর্ডারটি বাতিল করা হয়েছে। কোনো প্রশ্ন থাকলে WhatsApp এ আমাদের জানান।`,
        en: `${head[1]} this order was cancelled. If you have any question, message us on WhatsApp.`, wa: true };
    default:
      return { bn: `${head[0]} আমরা আপনার অর্ডার পেয়েছি 👍 খুব শীঘ্রই কনফার্ম করে প্রসেসিং শুরু হবে। তারপর ${eta[0]} মধ্যে ডেলিভারি।`,
        en: `${head[1]} we have received your order 👍 We will confirm it and start processing soon, then delivery within ${eta[1]}.` };
  }
}

// an order code and / or a Bangladeshi phone number typed in the chat
const CODE_RE = /KYV[\s-]?(\d{6})[\s-]?(\d{4})/i;
function findOrderBits(q) {
  const m = q.match(CODE_RE);
  const code = m ? `KYV-${m[1]}-${m[2]}` : '';
  const rest = (m ? q.replace(m[0], ' ') : q).replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
  const digits = (rest.match(/(?:\+?88)?[\s-]*0[\s-]*1(?:[\s-]*\d){9}/) || [''])[0].replace(/\D/g, '');
  const phone = digits ? digits.slice(-11) : '';
  return { code, phone: /^01[3-9]\d{8}$/.test(phone) ? phone : '' };
}

const api = async (body) => {
  const r = await fetch('/api/plan?action=chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let j = {};
  try { j = await r.json(); } catch (e) { /* not json */ }
  return { ok: r.ok, ...j };
};

// in-stock products of this page, one short line each: id|name|category|price|colours
function catalogText(products) {
  return products.filter((p) => totalStock(p) > 0).slice(0, 400).map((p) => {
    const colours = productColors(p).filter((c) => !supplierOutFor(p, c)).join(', ');
    const cat = [p.gender, p.category].filter(Boolean).join(' / ');
    return [p.id, p.name, cat, Math.round(Number(p.price) || 0), colours].map((x) => String(x || '').replace(/[|\n]/g, ' ').slice(0, 70)).join('|');
  }).join('\n');
}

// A bot message that appears like someone typing it: letter by letter (about 25 letters a second, at most ~6 s).
// With a Bangla line, the Bangla comes first and the English under it.
function TypeText({ text: en, bn: bnText, animate, onTick, onDone }) {
  const text = bnText || en;
  const bn = bnText ? en : '';
  const full = text + (bn ? `\n${bn}` : '');
  const [n, setN] = useState(animate ? 0 : full.length);
  useEffect(() => {
    if (!animate) return undefined;
    const step = Math.max(1, Math.ceil(full.length / 150)); // about 25 letters a second; a long answer at most ~6 s
    const t = setInterval(() => {
      setN((v) => {
        const next = Math.min(full.length, v + step);
        if (next >= full.length) { clearInterval(t); setTimeout(() => onDone && onDone(), 0); }
        return next;
      });
      if (onTick) onTick();
    }, 40);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const main = full.slice(0, Math.min(n, text.length));
  const rest = bn && n > text.length + 1 ? full.slice(text.length + 1, n) : '';
  const typing = n < full.length;
  return (
    <>
      <p className="whitespace-pre-line">{main}{typing && n <= text.length && <span className="ml-0.5 inline-block w-1.5 h-3.5 align-middle bg-current opacity-60 animate-pulse" />}</p>
      {rest && <p className="mt-1 text-xs text-gray-500">{rest}{typing && <span className="ml-0.5 inline-block w-1 h-3 align-middle bg-current opacity-60 animate-pulse" />}</p>}
    </>
  );
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function ChatWidget({ products = [], storeSettings, formatPrice, isDarkMode, onOpenProduct, shopName = '', raise = false, setCurrentView }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [track, setTrack] = useState(false);
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const pending = useRef({ code: '', phone: '' }); // an order code / phone typed in the chat, waiting for the other half
  const endRef = useRef(null);

  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ block: 'end' }); }, [msgs, track, busy, open]);

  const scroll = () => { if (endRef.current) endRef.current.scrollIntoView({ block: 'end' }); };
  const add = (m) => setMsgs((prev) => [...prev, { key: `${Date.now()}-${Math.random()}`, ...m }].slice(-40));
  const settle = (key) => setMsgs((prev) => prev.map((m) => (m.key === key ? { ...m, anim: false } : m)));
  // bot answers: "typing…" dots first, then the text types itself out
  const botSay = (m) => add({ role: 'bot', anim: true, ...m });
  const quick = async (label, en, bn, extra) => {
    if (busy) return;
    add({ role: 'user', text: label });
    setBusy(true);
    await wait(1400 + Math.random() * 1200);
    setBusy(false);
    botSay({ text: en, bn, ...extra });
  };
  const delivery = () => { const d = deliveryNote(storeSettings); quick('Delivery charge?', d.en, d.bn); };

  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Kyvro${shopName ? ` (${shopName})` : ''}, I need help.`)}`;

  const facts = () => {
    const d = deliveryNote(storeSettings);
    return [d.en, DELIVERY_TIME.en, COD.en, `Returns: ${RETURNS.en}`, 'Sizes and colours are chosen on the product page. Orders can also be placed on WhatsApp.', shopName ? `This page is the shop "${shopName}" on Kyvro.` : ''].filter(Boolean).join('\n');
  };

  const send = async (e) => {
    if (e) e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    const history = msgs.filter((m) => m.text && !m.order).slice(-6).map((m) => ({ role: m.role, text: m.text }));
    add({ role: 'user', text: q });
    setText('');
    setBusy(true);
    const started = Date.now();
    let m;
    const bits = findOrderBits(q);
    if (bits.code || bits.phone) {
      const code = bits.code || pending.current.code;
      const ph = bits.phone || pending.current.phone;
      if (code && ph) {
        pending.current = { code: '', phone: '' };
        m = await lookup(code, ph);
      } else {
        pending.current = { code, phone: ph };
        m = code
          ? { bn: 'ধন্যবাদ! এখন অর্ডারে দেওয়া ফোন নম্বরটি লিখুন।', text: 'Thanks! Now type the phone number used on the order.' }
          : { bn: 'অর্ডারের অবস্থা দেখতে অর্ডার কোডটি লিখুন (যেমন KYV-261030-1234)।', text: 'To check your order, type the order code too (like KYV-261030-1234).' };
      }
      await wait(Math.max(0, 1600 - (Date.now() - started)));
      setBusy(false);
      botSay(m);
      return;
    }
    try {
      const r = await api({ op: 'ask', message: q, history, catalog: catalogText(products), faq: facts() });
      m = r.ok ? { text: r.reply, ids: r.ids || [] }
        : { text: r.error === 'too-fast' ? 'Please wait a moment and try again.' : 'Sorry, I cannot answer right now. Please use the buttons below or tap WhatsApp to talk to us.', wa: true };
    } catch (err) {
      m = { text: 'No internet connection. Please try again.' };
    }
    await wait(Math.max(0, 1500 - (Date.now() - started)));
    setBusy(false);
    botSay(m);
  };

  // order status → a bot message (sentence + the order card)
  async function lookup(c, ph) {
    try {
      const r = await api({ op: 'order', order: String(c).trim().toUpperCase(), phone: ph });
      if (r.ok && r.order) return { order: r.order, ...statusSentence(r.order), text: statusSentence(r.order).en };
      if (r.error === 'bad-code') return { bn: 'অর্ডার কোড দেখতে এমন: KYV-261030-1234', text: 'The order code looks like KYV-261030-1234.' };
      if (r.error === 'bad-phone') return { bn: 'অর্ডারে দেওয়া ফোন নম্বরটি লিখুন।', text: 'Please enter the phone number used on the order.' };
      return { bn: 'অর্ডার কোড বা ফোন নম্বর মিলছে না। একবার চেক করে আবার লিখুন।', text: 'Order code and phone number do not match. Please check and try again.', wa: true };
    } catch (err) {
      return { bn: 'ইন্টারনেট সংযোগ নেই। আবার চেষ্টা করুন।', text: 'No internet connection. Please try again.' };
    }
  }

  const trackSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const started = Date.now();
    const m = await lookup(code, phone);
    if (m.order) { setTrack(false); setCode(''); setPhone(''); }
    await wait(Math.max(0, 1500 - (Date.now() - started)));
    setBusy(false);
    botSay(m);
  };

  const byId = (id) => products.find((p) => String(p.id) === String(id));
  const panel = isDarkMode ? 'bg-[#121212] border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900';
  const bubbleBot = isDarkMode ? 'bg-[#1c1c1c] border border-gray-800' : 'bg-gray-100';
  const chip = `inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition hover:border-[#D4AF37] ${isDarkMode ? 'border-gray-700 bg-[#161616]' : 'border-gray-300 bg-white'}`;
  const input = `w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#0f0f0f] border-gray-700' : 'bg-white border-gray-300'}`;

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="Help chat"
          className={`fixed right-4 z-40 flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-3 text-black shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] transition hover:-translate-y-0.5 ${raise ? 'bottom-24 md:bottom-5' : 'bottom-5'}`}>
          <MessageCircle size={20} />
          <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Help</span>
        </button>
      )}
      {open && (
        <div role="dialog" aria-label="Kyvro help chat"
          className={`fixed z-50 inset-x-2 bottom-2 top-16 sm:inset-auto sm:right-5 sm:bottom-5 sm:top-auto sm:w-[370px] sm:h-[560px] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${panel}`}>
          <div className="flex items-center justify-between bg-[#D4AF37] px-4 py-3 text-black">
            <div>
              <p className="text-sm font-bold">{shopName || 'Kyvro'} Help</p>
              <p className="text-[11px]">Ask anything · যেকোনো প্রশ্ন করুন</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 hover:bg-black/10"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 text-sm">
            <div className={`max-w-[88%] rounded-lg px-3 py-2 ${bubbleBot}`}>
              হাই! 👋 কী খুঁজছেন লিখুন (যেমন "১০০০ টাকার নিচে কালো শার্ট"), অর্ডার কোড + ফোন নম্বর দিয়ে অর্ডারের অবস্থা জানুন, অথবা নিচের বাটনে চাপুন।
              <span className="block mt-1 text-xs text-gray-500">Hi! Type what you are looking for, your order code + phone to check an order, or tap a button below.</span>
            </div>
            {msgs.map((m, i) => (
              m.role === 'user'
                ? <div key={m.key} className="ml-auto max-w-[85%] w-fit rounded-lg bg-[#D4AF37] px-3 py-2 text-black whitespace-pre-line">{m.text}</div>
                : (
                  <div key={m.key} className={`max-w-[92%] rounded-lg px-3 py-2 ${bubbleBot}`}>
                    <TypeText text={m.text || ''} bn={m.bn || ''} animate={!!m.anim} onTick={scroll} onDone={() => { settle(m.key); setTimeout(scroll, 30); }} />
                    {!m.anim && m.policy && setCurrentView && <button type="button" onClick={() => { setOpen(false); setCurrentView('refund'); window.scrollTo(0, 0); }} className="mt-1.5 text-xs font-semibold text-[#B8941F] underline">Read the full Return &amp; Refund Policy</button>}
                    {!m.anim && m.wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-green-600"><WhatsAppIcon size={13} /> WhatsApp</a>}
                    {!m.anim && m.order && (
                      <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${isDarkMode ? 'border-gray-700' : 'border-gray-300 bg-white'}`}>
                        <p className="font-bold">{m.order.status}{STATUS_BN[m.order.status] ? <span className="font-normal text-gray-500"> · {STATUS_BN[m.order.status]}</span> : null}</p>
                        <p className="text-gray-500 mt-0.5">{[...new Set([m.order.paymentMethod, m.order.paymentStatus].filter(Boolean))].join(' · ')}{m.order.total ? ` · ${formatPrice(m.order.total)}` : ''}</p>
                        <ul className="mt-1 space-y-0.5">
                          {m.order.items.map((it, k) => <li key={k}>{it.qty} × {it.name}{[it.size, it.color].filter(Boolean).length ? ` (${[it.size, it.color].filter(Boolean).join(', ')})` : ''}</li>)}
                        </ul>
                      </div>
                    )}
                    {!m.anim && Array.isArray(m.ids) && m.ids.map(byId).filter(Boolean).length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {m.ids.map(byId).filter(Boolean).map((p) => (
                          <button key={p.id} type="button" onClick={() => { onOpenProduct(p); setOpen(window.innerWidth >= 640); }}
                            className={`text-left rounded-lg border overflow-hidden transition hover:border-[#D4AF37] ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-white'}`}>
                            <div className={`aspect-square ${isDarkMode ? 'bg-[#161616]' : 'bg-gray-50'}`}>{p.image && <img src={p.image} alt="" loading="lazy" className="w-full h-full object-cover" />}</div>
                            <p className="px-2 pt-1.5 text-[11px] leading-tight line-clamp-2">{p.name}</p>
                            <p className="px-2 pb-1.5 text-xs font-bold text-[#B8941F]">{formatPrice(p.price)}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
            ))}
            {track && (
              <form onSubmit={trackSubmit} className={`rounded-lg px-3 py-3 space-y-2 ${bubbleBot}`}>
                <p className="text-xs font-semibold">অর্ডার ট্র্যাক করুন · Track your order</p>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Order code (KYV-261030-1234)" className={input} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number on the order" inputMode="tel" className={input} />
                <div className="flex gap-2">
                  <button type="submit" disabled={busy} className="flex-1 rounded bg-[#D4AF37] py-2 text-xs font-bold uppercase tracking-wider text-black disabled:opacity-50">Check</button>
                  <button type="button" onClick={() => setTrack(false)} className="rounded border px-3 text-xs">Cancel</button>
                </div>
              </form>
            )}
            {busy && (
              <div className={`w-fit rounded-lg px-3 py-2.5 flex items-center gap-1 ${bubbleBot}`} aria-label="Typing">
                {[0, 150, 300].map((d) => <span key={d} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className={`border-t px-3 pt-2 pb-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none]">
              <button type="button" className={chip} disabled={busy} onClick={delivery}><Truck size={12} /> Delivery charge</button>
              <button type="button" className={chip} disabled={busy} onClick={() => quick('Delivery time?', DELIVERY_TIME.en, DELIVERY_TIME.bn)}><Clock size={12} /> Delivery time</button>
              <button type="button" className={chip} disabled={busy} onClick={() => quick('Cash on Delivery?', COD.en, COD.bn)}><Wallet size={12} /> Cash on Delivery</button>
              <button type="button" className={chip} disabled={busy} onClick={() => quick('Return policy?', RETURNS.en, RETURNS.bn, { policy: true })}><RotateCcw size={12} /> Returns</button>
              <button type="button" className={chip} disabled={busy} onClick={() => setTrack(true)}><PackageSearch size={12} /> Track order</button>
              <a href={wa} target="_blank" rel="noopener noreferrer" className={`${chip} text-green-600`}><WhatsAppIcon size={12} /> WhatsApp</a>
            </div>
            <form onSubmit={send} className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Type your question… / প্রশ্ন লিখুন" className={input} />
              <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="shrink-0 rounded bg-[#D4AF37] px-3 text-black disabled:opacity-40"><Send size={16} /></button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
