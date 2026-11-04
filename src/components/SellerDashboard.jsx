import React, { useEffect, useState } from 'react';
import MyShop from './MyShop';
import { watchMySeller, saveSellerBkash, loadSellerEarnings, applyAsSeller, sellerStatus, normalizeWhatsapp, watchSellerRules, sellerNameBlocked } from '../sellers';
import { watchPayouts } from '../payouts';
import { formatDateTime, toDate } from '../utils/dates';
import { getAdminStatus } from '../adminAuth';
import { isOwnerEmail } from '../adminEmails';

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
  // application form (no NID, passport, bank or bKash: bKash is asked after approval)
  const [form, setForm] = useState({ shopName: '', name: '', whatsapp: '', district: '', area: '', address: '', pageLink: '', productNote: '', agreed: false });
  const [formMsg, setFormMsg] = useState('');
  const [applying, setApplying] = useState(false);
  const [rules, setRules] = useState(null);
  useEffect(() => watchSellerRules(setRules), []);
  const uid = customerUser ? customerUser.uid : '';
  const email = customerUser && customerUser.email ? customerUser.email.toLowerCase() : '';

  useEffect(() => watchMySeller(uid, setSeller), [uid]);
  // a team member (Owner / Manager / Admin) signed in with their team email cannot become a seller
  const [teamMember, setTeamMember] = useState(false);
  useEffect(() => {
    if (!email) { setTeamMember(false); return; }
    if (isOwnerEmail(email)) { setTeamMember(true); return; }
    let live = true;
    getAdminStatus(email).then((st) => { if (live) setTeamMember(!!st.role); });
    return () => { live = false; };
  }, [email]);
  const status = sellerStatus(seller);
  const approved = status === 'approved';
  useEffect(() => (approved && email ? watchPayouts(false, email, setPayouts, () => {}) : undefined), [approved, email]);
  const refresh = () => { setEarnErr(''); loadSellerEarnings(customerUser).then(setEarn).catch((e) => setEarnErr(e.message)); };
  useEffect(() => { if (approved && customerUser) refresh(); }, [approved, seller && seller.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  // a rejected seller applies again with their last details filled in
  useEffect(() => {
    if (seller && status === 'rejected') setForm((f) => (f.name ? f : { ...f, name: seller.name || '', whatsapp: seller.whatsapp || '', district: seller.district || '', area: seller.area || '', address: seller.address || '', pageLink: seller.pageLink || '', productNote: seller.productNote || '' }));
    else if (customerUser && !seller) setForm((f) => (f.name ? f : { ...f, name: customerUser.displayName || '' }));
  }, [seller, status]); // eslint-disable-line react-hooks/exhaustive-deps

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
  if (isStaff || teamMember) {
    return (
      <div className={card}>
        <h3 className="text-lg font-bold">Sell on Kyvro</h3>
        <p className="text-sm text-gray-500">Team members cannot become sellers. Your shop is in the Admin Portal (My Shop).</p>
      </div>
    );
  }
  if (seller === undefined) return <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const apply = async () => {
    setFormMsg('');
    const f = form;
    if (rules && !rules.open) return setFormMsg('Kyvro is not taking new sellers right now. Please try again later.');
    if (f.shopName.trim().length < 2) return setFormMsg('Write a shop name (at least 2 letters).');
    const bad = sellerNameBlocked(f.shopName, '', rules);
    if (bad) return setFormMsg(`The shop name cannot contain "${bad}". Please choose another name.`);
    if (f.name.trim().length < 2) return setFormMsg('Write your full name.');
    if (!normalizeWhatsapp(f.whatsapp)) return setFormMsg('Write a valid WhatsApp number: 01XXXXXXXXX, +8801XXXXXXXXX or an international number starting with +.');
    if (f.district.trim().length < 2 || f.area.trim().length < 2) return setFormMsg('Write your district and area.');
    if (f.pageLink.trim() && !/^https?:\/\/\S+$/.test(f.pageLink.trim())) return setFormMsg('The page link must start with https://');
    if (f.productNote.trim().length < 3) return setFormMsg('Write what kind of products you will sell.');
    if (!f.agreed) return setFormMsg('Please tick the box to confirm you are an independent seller.');
    setApplying(true);
    try { await applyAsSeller({ uid, email, shopName: f.shopName, details: f }); }
    catch (e) { setFormMsg(e.code === 'permission-denied' ? 'Could not send the application. You may already have a shop, the name may not be allowed, or new sellers are paused.' : e.message); }
    setApplying(false);
  };

  // ---- not applied yet, or rejected: the application form (only while the Owner takes new sellers) ----
  if ((!seller || status === 'rejected') && rules && !rules.open) {
    return (
      <div className={card}>
        <h3 className="text-lg font-bold">Sell on Kyvro</h3>
        {status === 'rejected' && <p className="text-xs p-3 rounded border border-red-500/40 text-red-500 bg-red-500/10"><strong>Rejected</strong>{seller.rejectNote ? `: ${seller.rejectNote}` : ''}.</p>}
        <p className="text-sm text-gray-500">Seller sign-up is closed right now. It is coming back soon, please check again later.</p>
      </div>
    );
  }
  if (!seller || status === 'rejected') {
    const field = (k, label, props = {}) => (
      <label className="block text-xs font-semibold text-gray-500">{label}
        <input className={`${inputCls} block mt-1 w-full`} value={form[k]} onChange={(e) => set(k, e.target.value)} {...props} />
      </label>
    );
    return (
      <div className={card}>
        <h3 className="text-lg font-bold">Sell on Kyvro</h3>
        {status === 'rejected' && (
          <p className="text-xs p-3 rounded border border-red-500/40 text-red-500 bg-red-500/10"><strong>Rejected</strong>{seller.rejectNote ? `: ${seller.rejectNote}` : ''}. You can fix it and apply again below.</p>
        )}
        <p className="text-xs text-gray-500">Open your own shop link with Kyvro products, set your price (within the limit) and earn the markup on delivered orders. Kyvro takes the payment and delivers every order. Your shop goes live after Kyvro approves your application. We never ask for NID, passport or bank details.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {field('shopName', 'Shop name *', { maxLength: 60, placeholder: 'e.g. Rahim Fashion' })}
          {field('name', 'Full name *', { maxLength: 80 })}
          <label className="block text-xs font-semibold text-gray-500">Email (from your login)
            <input className={`${inputCls} block mt-1 w-full opacity-70`} value={email} readOnly disabled />
          </label>
          {field('whatsapp', 'WhatsApp number *', { inputMode: 'tel', placeholder: '01XXXXXXXXX or +8801XXXXXXXXX' })}
          {field('district', 'District *', { maxLength: 40, placeholder: 'e.g. Dhaka' })}
          {field('area', 'Area *', { maxLength: 60, placeholder: 'e.g. Mirpur' })}
          <div className="sm:col-span-2">{field('address', 'Full address (optional)', { maxLength: 300 })}</div>
          <div className="sm:col-span-2">{field('pageLink', 'Facebook / Instagram page link (optional)', { maxLength: 300, placeholder: 'https://facebook.com/...' })}</div>
          <label className="block text-xs font-semibold text-gray-500 sm:col-span-2">What kind of products will you sell? *
            <textarea className={`${inputCls} block mt-1 w-full`} rows={2} maxLength={300} value={form.productNote} onChange={(e) => set('productNote', e.target.value)} placeholder="e.g. men's shirts and punjabi for my Facebook followers" />
          </label>
        </div>
        <label className="flex items-start gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={form.agreed} onChange={(e) => set('agreed', e.target.checked)} className="mt-0.5 accent-[#D4AF37]" />
          <span>I understand that I am an independent seller, not official Kyvro, and that I am responsible for my own shop. *</span>
        </label>
        {formMsg && <p className="text-xs text-red-500">{formMsg}</p>}
        <button type="button" disabled={applying} onClick={apply} className="bg-[#D4AF37] text-black font-bold px-6 py-2.5 rounded text-xs uppercase tracking-wider disabled:opacity-50">{applying ? 'Sending...' : status === 'rejected' ? 'Apply again' : 'Apply to sell'}</button>
      </div>
    );
  }

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
      <div className={`rounded-lg border p-4 text-xs flex flex-wrap items-center justify-between gap-2 ${approved ? 'border-green-600/40 bg-green-600/10 text-green-600' : 'border-amber-500/40 bg-amber-500/10 text-amber-600'}`}>
        <span className="font-bold uppercase tracking-wider">{approved ? 'Approved' : 'Pending approval'}</span>
        <span>{approved ? 'Your shop is approved. Free plan: 10 products, upgrade any time for all.' : 'Kyvro is checking your application. You can already choose products; your link starts working after approval.'}</span>
      </div>
      <MyShop sellerMode showPlan={approved} adminRole="seller" isOwner={false} products={products} isDarkMode={isDarkMode} formatPrice={formatPrice} adminName={customerUser.displayName || email} loggedInUserEmail={email} />

      {approved && (
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
