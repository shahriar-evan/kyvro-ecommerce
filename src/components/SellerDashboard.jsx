import React, { useEffect, useState } from 'react';
import MyShop from './MyShop';
import { watchMySeller, saveSellerBkash, loadSellerEarnings } from '../sellers';
import { watchPayouts } from '../payouts';
import { formatDateTime, toDate } from '../utils/dates';

// "Sell on Kyvro": a signed-in customer's own shop. The shop editor is the same as the team's (My Shop, plan,
// markup cap). Earnings come from the server without any customer details; payouts are what the Owner already paid.
export default function SellerDashboard({ customerUser, isStaff, products, formatPrice, isDarkMode, onSignIn }) {
  const [seller, setSeller] = useState(undefined); // undefined = loading, null = no shop yet
  const [earn, setEarn] = useState(null);
  const [earnErr, setEarnErr] = useState('');
  const [payouts, setPayouts] = useState([]);
  const [bkash, setBkash] = useState('');
  const [bkashMsg, setBkashMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const uid = customerUser ? customerUser.uid : '';
  const email = customerUser && customerUser.email ? customerUser.email.toLowerCase() : '';

  useEffect(() => watchMySeller(uid, setSeller), [uid]);
  useEffect(() => (seller && email ? watchPayouts(false, email, setPayouts, () => {}) : undefined), [seller, email]);
  const refresh = () => { setEarnErr(''); loadSellerEarnings(customerUser).then(setEarn).catch((e) => setEarnErr(e.message)); };
  useEffect(() => { if (seller && customerUser) refresh(); }, [seller && seller.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = `p-5 sm:p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const inputCls = `border p-2 text-sm rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;

  if (!customerUser) {
    return (
      <div className={card}>
        <h3 className="text-lg font-bold">Sell on Kyvro</h3>
        <p className="text-xs text-gray-500">Open your own shop link with Kyvro products, set your price (within the limit) and earn the markup. Sign in with Google to start.</p>
        <button type="button" onClick={onSignIn} className="bg-[#D4AF37] text-black font-bold px-5 py-2 rounded text-xs uppercase tracking-wider">Continue with Google</button>
      </div>
    );
  }
  if (isStaff) {
    return <div className={card}><p className="text-sm text-gray-500">You are on the Kyvro team. Your shop is in the Admin Portal (My Shop).</p></div>;
  }
  if (seller === undefined) return <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>;

  const paid = payouts.reduce((n, x) => n + (Number(x.amount) || 0), 0);
  const earned = earn ? earn.earned : 0;
  const saveBkash = async () => {
    setBkashMsg(null);
    const n = bkash.replace(/\D/g, '');
    if (!/^01[3-9][0-9]{8}$/.test(n)) { setBkashMsg({ type: 'err', text: 'Write an 11-digit bKash number, e.g. 01712345678.' }); return; }
    setSaving(true);
    try { await saveSellerBkash(uid, n); setBkash(''); setBkashMsg({ type: 'ok', text: `Saved: ••••${n.slice(-3)}. Only Kyvro can see it.` }); }
    catch (e) { setBkashMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Could not save. Open your shop first.' : e.message }); }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <MyShop sellerMode adminRole="seller" isOwner={false} products={products} isDarkMode={isDarkMode} formatPrice={formatPrice} adminName={customerUser.displayName || email} loggedInUserEmail={email} />

      {seller && (
        <>
          <div className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold">My earnings</h3>
              <button type="button" onClick={refresh} className="px-3 py-1.5 rounded border border-gray-400 text-xs font-semibold">Refresh</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[['Earned', earned, 'text-[#D4AF37]'], ['Paid to you', paid, 'text-green-600'], [earned - paid >= 0 ? 'Due' : 'Overpaid', Math.abs(earned - paid), earned - paid > 0 ? 'text-red-500' : 'text-green-600'], ['Waiting (not delivered)', earn ? earn.waiting : 0, 'text-gray-500']].map(([l, v, c]) => (
                <div key={l} className={`rounded border p-3 ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`text-xl font-bold ${c}`}>{formatPrice(v)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">{l}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-500">You earn the markup (your price − the store price) when an order is delivered. Returned and cancelled orders earn nothing. Kyvro confirms and delivers every order.</p>
            {earnErr && <p className="text-xs text-red-500">{earnErr}</p>}
            {earn && (earn.orders.length === 0 ? <p className="text-sm text-gray-500">No orders from your shop yet.</p> : (
              <div className="divide-y text-xs">
                {earn.orders.map((o) => (
                  <div key={o.orderNumber} className="py-2 flex flex-wrap justify-between gap-x-4 gap-y-1">
                    <span><strong className="text-[#D4AF37]">{o.orderNumber}</strong> · {formatDateTime(o.createdAt)} · {o.items.map((it) => `${it.name} ×${it.quantity}`).join(', ')}</span>
                    <span>{o.returned ? 'Returned' : o.status} · markup <strong className={o.earned > 0 ? 'text-green-600' : 'text-gray-500'}>{formatPrice(o.markup)}</strong></span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className={card}>
            <h3 className="text-lg font-bold">Payout</h3>
            <p className="text-xs text-gray-500">Kyvro pays your markup to this bKash number. For your safety only Kyvro can see it, so it is not shown here after saving.</p>
            <div className="flex flex-wrap gap-2 items-center">
              <input className={`${inputCls} w-56`} inputMode="numeric" placeholder="bKash number, e.g. 017XXXXXXXX" value={bkash} onChange={(e) => setBkash(e.target.value)} />
              <button type="button" disabled={saving} onClick={saveBkash} className="bg-[#D4AF37] text-black font-bold px-5 py-2 rounded text-xs uppercase tracking-wider disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
            {bkashMsg && <p className={`text-xs ${bkashMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{bkashMsg.text}</p>}
            {payouts.length > 0 && (
              <div className="divide-y text-xs">
                {[...payouts].sort((a, b) => (toDate(b.at) || 0) - (toDate(a.at) || 0)).map((x) => (
                  <div key={x.id} className="py-1.5 flex flex-wrap justify-between gap-2">
                    <span>{formatDateTime(x.at)}{x.note ? ` · ${x.note}` : ''}</span>
                    <strong className="text-green-600">{formatPrice(x.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
