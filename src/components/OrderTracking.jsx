import React, { useEffect, useState } from 'react';
import { Truck, Search, User, Check } from 'lucide-react';
import { claimOrder, loadTrackedOrders } from '../orders';
import { formatDateTime } from '../utils/dates';

const STEPS = ['Pending', 'Processing', 'Shipped', 'Delivered'];
const STEP_BN = { Pending: 'অর্ডার গ্রহণ', Processing: 'প্রসেসিং', Shipped: 'শিপড', Delivered: 'ডেলিভার্ড' };

function Timeline({ status, isDarkMode }) {
  if (status === 'Cancelled') {
    return <p className="text-sm font-bold text-red-500 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">Order cancelled (অর্ডার বাতিল হয়েছে)</p>;
  }
  const at = Math.max(0, STEPS.indexOf(status));
  return (
    <div className="flex items-start">
      {STEPS.map((st, i) => (
        <div key={st} className="flex-1 flex flex-col items-center relative">
          {i > 0 && <div className={`absolute top-3.5 right-1/2 w-full h-0.5 ${i <= at ? 'bg-green-500' : (isDarkMode ? 'bg-gray-700' : 'bg-gray-300')}`} />}
          <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= at ? 'bg-green-500 text-white' : (isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-300 text-gray-600')}`}>
            {i <= at ? <Check size={14} /> : i + 1}
          </div>
          <p className={`mt-1.5 text-[11px] font-semibold text-center ${i <= at ? '' : 'text-gray-500'}`}>{st}</p>
          <p className="text-[10px] text-gray-500 text-center">{STEP_BN[st]}</p>
        </div>
      ))}
    </div>
  );
}

export default function OrderTracking({ customerUser, onSignIn, formatPrice, isDarkMode, setCurrentView }) {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState('');

  const card = `rounded-lg border p-5 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const input = `w-full border rounded px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#0f0f0f] border-gray-700' : 'bg-white border-gray-300'}`;

  const uid = customerUser ? customerUser.uid : '';
  useEffect(() => {
    if (!customerUser) { setOrders([]); setLoaded(false); return; }
    let live = true;
    loadTrackedOrders(customerUser).then((list) => { if (live) { setOrders(list); setLoaded(true); if (list[0]) setOpenId(list[0].id); } }).catch(() => live && setLoaded(true));
    return () => { live = false; };
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!customerUser) {
    return (
      <div className="flex-1 max-w-md mx-auto px-4 py-16 w-full text-center">
        <Truck size={40} className="mx-auto text-[#D4AF37] mb-4" />
        <h1 className="text-2xl font-serif font-bold mb-2">Order Tracking</h1>
        <p className="text-sm text-gray-500 mb-6">অর্ডারের অবস্থা দেখতে Google দিয়ে সাইন ইন করুন। <br />Sign in with Google to track your order.</p>
        <button onClick={onSignIn} className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 transition">Continue with Google</button>
        <button onClick={() => setCurrentView('home')} className="mt-4 text-xs text-gray-500 underline">Back to shop</button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const o = await claimOrder(customerUser, code, phone);
      if (!o) { setError('Order not found.'); }
      else {
        setOrders((prev) => [o, ...prev.filter((x) => x.id !== o.id)]);
        setOpenId(o.id); setCode(''); setPhone('');
      }
    } catch (err) {
      const m = err && err.message;
      setError(m === 'bad-code' ? 'Tracking code looks like KYV-261030-1234 (ট্র্যাকিং কোড ঠিক নয়).'
        : m === 'bad-phone' ? 'Enter the phone number used on the order (অর্ডারের ফোন নম্বর দিন).'
        : 'Tracking code and phone number do not match. Please check and try again. (কোড বা ফোন নম্বর মিলছে না)');
    }
    setBusy(false);
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full space-y-6">
      <div className={card}>
        <h1 className="text-xl font-serif font-bold flex items-center gap-2 mb-1"><Truck size={20} className="text-[#D4AF37]" /> Track your consignment</h1>
        <p className="text-xs text-gray-500 mb-4">Enter the tracking code from your order confirmation, and the phone number you used.</p>
        <form onSubmit={submit} className="grid sm:grid-cols-[1.2fr_1fr_auto] gap-3">
          <input className={input} placeholder="Tracking code e.g. KYV-261030-1234" value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} required />
          <input className={input} placeholder="Phone e.g. 01712345678" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={16} required />
          <button disabled={busy} className="bg-[#D4AF37] text-black font-bold px-6 py-2.5 rounded text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"><Search size={14} />{busy ? 'Checking…' : 'Track'}</button>
        </form>
        {error && <p className="mt-3 text-xs p-3 rounded border border-red-500/40 text-red-500 bg-red-500/10">{error}</p>}
      </div>

      {loaded && orders.length === 0 && <p className="text-sm text-gray-500 text-center"><User size={14} className="inline mr-1" />No tracked orders yet.</p>}

      {orders.map((o) => (
        <div key={o.id} className={card}>
          <button type="button" onClick={() => setOpenId(openId === o.id ? '' : o.id)} className="w-full flex flex-wrap items-center justify-between gap-2 text-left">
            <div>
              <p className="font-bold text-sm">{o.orderNumber}</p>
              <p className="text-xs text-gray-500">{formatDateTime(o.createdAt)}</p>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">{o.status}</span>
          </button>
          {openId === o.id && (
            <div className="mt-5 space-y-4">
              <Timeline status={o.status} isDarkMode={isDarkMode} />
              <ul className="text-xs space-y-1 pt-2">
                {(o.items || []).map((it, i) => <li key={i}>{it.quantity} x {it.name}{it.size && it.size !== 'Standard' ? ` (${it.size})` : ''}</li>)}
              </ul>
              <div className="border-t pt-3 text-xs flex flex-wrap justify-between gap-2">
                <span className="text-gray-500">{o.paymentMethod} · {o.paymentStatus} · {o.deliveryArea}</span>
                <span className="font-bold text-sm text-[#D4AF37]">{formatPrice(o.total)}</span>
              </div>
              {Array.isArray(o.history) && o.history.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Updates</p>
                  <ul className="text-xs space-y-1">
                    {[...o.history].reverse().map((h, i) => <li key={i} className="flex justify-between gap-3"><span>{h.status}</span><span className="text-gray-500">{formatDateTime(h.at)}</span></li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
