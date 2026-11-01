import React, { useState } from 'react';
import { startOnlinePayment } from '../payment';
import { WHATSAPP_NUMBER } from '../data/shopConfig';

// Shown when the customer comes back from the SSLCommerz payment page (?pay=ok|fail|cancel|check&order=...)
export default function PaymentResult({ result, isDarkMode, setCurrentView }) {
  const { status, order, kind, amount } = result || {};
  const adv = kind === 'advance';
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const panel = `rounded-lg border p-6 sm:p-8 text-center space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-gray-50 border-gray-200'}`;
  const ok = status === 'ok';
  const check = status === 'check';
  const retry = async () => {
    setBusy(true); setErr('');
    try { await startOnlinePayment(order); } catch (e) { setErr(e.message); setBusy(false); }
  };
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Kyvro, I need help with the payment of my order ${order || ''}.`)}`;

  return (
    <div className="flex-1 max-w-xl mx-auto px-4 py-14 sm:py-20 w-full">
      <div className={panel}>
        <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center text-3xl ${ok ? 'bg-green-500/15 text-green-600' : check ? 'bg-yellow-500/15 text-yellow-600' : 'bg-red-500/15 text-red-600'}`}>{ok ? '✓' : check ? '…' : '!'}</div>
        <h1 className="text-2xl font-serif font-bold">
          {ok ? (adv ? 'Delivery charge paid. Thank you!' : 'Payment received. Thank you!') : check ? 'We are checking your payment' : status === 'cancel' ? 'Payment cancelled' : 'Payment not completed'}
        </h1>
        {order && <p className="text-sm">Order number: <strong className="text-[#D4AF37] text-lg">{order}</strong></p>}
        <p className="text-sm text-gray-500 leading-relaxed">
          {ok && !adv && 'আপনার পেমেন্ট সফল হয়েছে। আমরা শীঘ্রই আপনার অর্ডারটি কনফার্ম করব। / Your order is paid. Our team will confirm it shortly.'}
          {ok && adv && `আপনার ডেলিভারি চার্জ${amount ? ` ৳${amount}` : ''} পরিশোধ হয়েছে। অর্ডার কনফার্ম হলে বাকি টাকা পণ্য হাতে পেয়ে দিবেন। / Your delivery charge${amount ? ` (৳${amount})` : ''} is paid. Pay the rest in cash when the parcel arrives. We will confirm your order shortly.`}
          {check && 'পেমেন্টটি যাচাই করতে একটু সময় লাগছে। টাকা কেটে গেলে চিন্তা করবেন না, আমরা অর্ডারটি চেক করে নিব। / If money was deducted, do not worry, we will verify it and update your order.'}
          {!ok && !check && 'আপনার অর্ডারটি সেভ করা আছে, কিন্তু পেমেন্ট সম্পন্ন হয়নি। পেমেন্ট না হলে অর্ডার কনফার্ম করা হবে না, তাই আবার পেমেন্ট করুন। / Your order is saved, but the payment was not completed. You can try again.'}
        </p>
        {err && <p className="text-xs p-3 rounded border border-red-500/40 text-red-500 bg-red-500/10">{err}</p>}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          {!ok && !check && order && (
            <button type="button" disabled={busy} onClick={retry} className="bg-[#D4AF37] text-black text-xs font-bold px-6 py-3 tracking-widest uppercase rounded disabled:opacity-60">{busy ? 'Please wait...' : (adv ? 'Pay delivery charge again' : 'Pay again (bKash / Card)')}</button>
          )}
          {order && <button type="button" onClick={() => setCurrentView('tracking')} className="border border-[#D4AF37] text-xs font-bold px-6 py-3 tracking-widest uppercase rounded">Track order</button>}
          <button type="button" onClick={() => setCurrentView('shop')} className="border border-gray-400 text-xs font-bold px-6 py-3 tracking-widest uppercase rounded">Continue shopping</button>
        </div>
        {!ok && <p className="text-xs text-gray-500">Problem? <a href={wa} target="_blank" rel="noreferrer" className="underline">Message us on WhatsApp</a></p>}
      </div>
    </div>
  );
}
