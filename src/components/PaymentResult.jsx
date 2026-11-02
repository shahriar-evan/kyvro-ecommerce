import React, { useState } from 'react';
import { Check, Clock, X, Truck, ShoppingBag, Copy, MessageCircle } from 'lucide-react';
import { startOnlinePayment } from '../payment';
import { WHATSAPP_NUMBER, toBanglaDigits, PAY_PROVIDER } from '../data/shopConfig';

// Shown when the customer comes back from the SSLCommerz payment page (?pay=ok|fail|cancel|check&order=...)
export default function PaymentResult({ result, isDarkMode, setCurrentView }) {
  const { status, order, kind, amount } = result || {};
  const adv = kind === 'advance';
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const ok = status === 'ok';
  const check = status === 'check';
  const tone = ok ? { ring: '#22c55e', soft: 'rgba(34,197,94,.14)', Icon: Check } : check ? { ring: '#f59e0b', soft: 'rgba(245,158,11,.14)', Icon: Clock } : { ring: '#ef4444', soft: 'rgba(239,68,68,.14)', Icon: X };
  const retry = async () => {
    setBusy(true); setErr('');
    try { await startOnlinePayment(order); } catch (e) { setErr(e.message); setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(order); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) { /* ignore */ }
  };
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Kyvro, I could not complete the online payment${order ? ` for my order ${order}` : ''}. I would like to order through WhatsApp.`)}`;

  const title = ok ? (adv ? 'Delivery charge paid' : 'Payment received') : check ? 'We are checking your payment' : status === 'cancel' ? 'Payment cancelled' : 'Payment not completed';
  const titleBn = ok ? (adv ? 'ডেলিভারি চার্জ পরিশোধ হয়েছে' : 'পেমেন্ট সফল হয়েছে') : check ? 'পেমেন্ট যাচাই করা হচ্ছে' : status === 'cancel' ? 'পেমেন্ট বাতিল হয়েছে' : 'পেমেন্ট সম্পন্ন হয়নি';
  const amt = amount ? `৳${amount}` : '';
  const amtBn = amount ? `৳${toBanglaDigits(String(amount))}` : '';

  let bn; let en;
  if (ok && !adv) { bn = 'আপনার পেমেন্ট সফল হয়েছে। আমরা শীঘ্রই আপনার অর্ডারটি কনফার্ম করব।'; en = 'Your order is paid. Our team will confirm it shortly.'; }
  else if (ok) { bn = `আপনার ডেলিভারি চার্জ${amtBn ? ` ${amtBn}` : ''} পরিশোধ হয়েছে। বাকি টাকা পণ্য হাতে পেয়ে ডেলিভারি বয়ের কাছে দিবেন।`; en = `Your delivery charge${amt ? ` (${amt})` : ''} is paid. Pay the rest in cash to the delivery person when the parcel arrives. We will confirm your order shortly.`; }
  else if (check) { bn = 'পেমেন্টটি যাচাই করতে একটু সময় লাগছে। টাকা কেটে গেলে চিন্তা করবেন না, আমরা অর্ডারটি চেক করে নিব।'; en = 'If money was deducted, do not worry. We will verify it and update your order.'; }
  else if (status === 'cancel') { bn = 'আপনি পেমেন্ট বাতিল করেছেন। চিন্তা নেই, আপনার অর্ডার সেভ করা আছে। পেমেন্ট না করলে অর্ডার কনফার্ম হবে না, তাই নিচের বাটনে আবার পেমেন্ট করুন।'; en = 'You cancelled the payment. Your order is saved, but it will not be confirmed until you pay. Tap the button below to pay again.'; }
  else { bn = 'আপনার অর্ডারটি সেভ করা আছে, কিন্তু পেমেন্ট সম্পন্ন হয়নি। পেমেন্ট না হলে অর্ডার কনফার্ম করা হবে না, তাই আবার পেমেন্ট করুন।'; en = 'Your order is saved, but the payment was not completed. You can try again.'; }

  const dark = isDarkMode;
  return (
    <div className="flex-1 w-full flex items-center justify-center px-4 py-10 min-h-[70vh]">
      <style>{`@keyframes kvPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}@keyframes kvRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes kvPulse{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.7);opacity:0}}`}</style>
      <div className={`relative w-full max-w-2xl overflow-hidden rounded-2xl border text-center ${dark ? 'bg-[#141414] border-gray-800 shadow-[0_20px_60px_rgba(0,0,0,.6)]' : 'bg-white border-gray-200 shadow-[0_20px_60px_rgba(0,0,0,.10)]'}`} style={{ animation: 'kvRise .5s ease both' }}>
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg,#8a6d1f,#D4AF37,#f3dc8b,#D4AF37,#8a6d1f)' }} />
        <div className="px-5 sm:px-8 pt-9 pb-8 space-y-5">
          <div className="relative mx-auto h-20 w-20">
            {ok && <span className="absolute inset-0 rounded-full" style={{ background: tone.ring, animation: 'kvPulse 1.8s ease-out 2' }} />}
            <span className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: tone.soft, border: `2px solid ${tone.ring}`, color: tone.ring, animation: 'kvPop .55s ease both' }}>
              <tone.Icon size={36} strokeWidth={3} />
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-[28px] font-serif font-bold leading-tight">{titleBn}</h1>
            <p className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold mt-1.5">{title}</p>
          </div>

          {order && (
            <div className={`mx-auto inline-flex items-center gap-3 rounded-full border px-4 py-2 ${dark ? 'border-gray-700 bg-[#0f0f0f]' : 'border-gray-200 bg-gray-50'}`}>
              <span className="text-[11px] uppercase tracking-widest text-gray-500">Order</span>
              <strong className="text-[#D4AF37] text-base tracking-wide">{order}</strong>
              <button type="button" onClick={copy} aria-label="Copy order number" className="text-gray-400 hover:text-[#D4AF37] transition">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          )}
          {ok && amt && (
            <p className={`mx-auto w-fit rounded-lg px-4 py-2 text-sm font-semibold ${dark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'}`}>
              {adv ? 'Delivery charge paid' : 'Paid'}: {amt}
            </p>
          )}

          <div className="space-y-2 max-w-md mx-auto">
            <p className="text-[15px] leading-relaxed">{bn}</p>
            <p className="text-sm text-gray-500 leading-relaxed">{en}</p>
          </div>

          {err && <p className="text-xs p-3 rounded border border-red-500/40 text-red-500 bg-red-500/10">{err}</p>}

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center items-stretch pt-2">
            {!ok && !check && order && (
              <button type="button" disabled={busy} onClick={retry} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-center text-black text-xs font-bold px-5 sm:px-7 py-3.5 tracking-widest uppercase rounded-lg shadow-lg shadow-[#D4AF37]/25 hover:-translate-y-0.5 hover:shadow-xl transition disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#f3dc8b,#D4AF37 55%,#b8932a)' }}>
                {busy ? 'Please wait...' : (adv ? 'Pay delivery charge again' : (PAY_PROVIDER === 'uddokta' ? 'Pay again (bKash / Nagad)' : 'Pay again (bKash / Card)'))}
              </button>
            )}
            {order && (
              <button type="button" onClick={() => setCurrentView('tracking')} className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 text-center text-xs font-bold px-5 sm:px-7 py-3.5 tracking-widest uppercase rounded-lg hover:-translate-y-0.5 transition ${ok ? 'text-black shadow-lg shadow-[#D4AF37]/25 hover:shadow-xl' : 'border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10'}`} style={ok ? { background: 'linear-gradient(135deg,#f3dc8b,#D4AF37 55%,#b8932a)' } : undefined}>
                <Truck size={16} /> Track Order
              </button>
            )}
            <button type="button" onClick={() => setCurrentView('shop')} className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 text-center text-xs font-bold px-5 sm:px-7 py-3.5 tracking-widest uppercase rounded-lg border hover:-translate-y-0.5 transition ${dark ? 'border-gray-600 hover:border-[#D4AF37] hover:text-[#D4AF37]' : 'border-gray-300 hover:border-[#D4AF37] hover:text-[#8a6d1f]'}`}>
              <ShoppingBag size={16} /> Continue Shopping
            </button>
          </div>

          {!ok && (
            <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#D4AF37] underline underline-offset-2">
              <MessageCircle size={14} /> অনলাইনে অর্ডার করতে না পারলে WhatsApp-এ মেসেজ দিয়ে অর্ডার করুন
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
