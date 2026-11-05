import React, { useEffect, useState } from 'react';
import MyShop from './MyShop';
import { auth } from '../firebase';
import { requestSellerShop, sellerShopList, updateSellerCategories, watchMySeller, saveSellerBkash, loadSellerEarnings, applyAsSeller, sellerStatus, normalizeWhatsapp, watchSellerRules, sellerNameBlocked } from '../sellers';
import { watchPayouts } from '../payouts';
import { formatDateTime, toDate } from '../utils/dates';
import { getAdminStatus } from '../adminAuth';
import { isOwnerEmail } from '../adminEmails';
import { SHOP_COLLECTIONS, productInCollection } from '../data/shopConfig';
import { watchPlans } from '../storeSettings';
import { normalizePlans, effectiveTier, TIER_LABEL, shopLimitFor, toMillis } from '../data/priceCheck';
import SellerStats from './SellerStats';
import SellPricing from './SellPricing';
import { watchMySubscription } from '../storeSettings';
import { watchShop, watchMyShops, cleanHandle, HANDLE_RE, handleTaken, prettyHandle } from '../shops';
import { GOLD_BTN, OUTLINE_BTN } from './ui';
import { isReservedLink } from '../data/reservedLinks';
import { effectiveFeatures, httpsLinkOk, FEATURES, shopDisplayName } from '../data/shopBrand';
import { LayoutDashboard, ShoppingBag, Package, Store, BarChart3, Palette, LayoutTemplate, TicketPercent, Wallet, LifeBuoy, Gem, Lock, Receipt } from 'lucide-react';
import SellerDashLayout from './SellerDashLayout';
import SellerBanner from './SellerBanner';
import { flatSubCategories, subLabel, matchesCollectionPage } from '../data/catalog';

// social links on the application (any of them, all optional; https only)
const APPLY_SOCIALS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourname' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourname' },
];
const NO_SOCIALS = { facebook: '', instagram: '', tiktok: '' };

// "Sell on Kyvro": a signed-in customer's own shop. The shop editor is the same as the team's (My Shop, plan,
// markup cap). Earnings come from the server without any customer details; payouts are what the Owner already paid.
export default function SellerDashboard({ customerUser, isStaff, products, formatPrice, isDarkMode, onSignIn, initialPlan = '' }) {
  const [seller, setSeller] = useState(undefined); // undefined = loading, null = no shop yet
  const [earn, setEarn] = useState(null);
  const [earnErr, setEarnErr] = useState('');
  const [payouts, setPayouts] = useState([]);
  const [bkash, setBkash] = useState('');
  const [bkashMsg, setBkashMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  // application form (no NID, passport, bank or bKash: bKash is asked after approval)
  const [form, setForm] = useState({ handle: '', name: '', whatsapp: '', district: '', area: '', address: '', socialLinks: NO_SOCIALS, productNote: '', agreed: false });
  const [formMsg, setFormMsg] = useState('');
  const [applying, setApplying] = useState(false);
  const [rules, setRules] = useState(null);
  useEffect(() => watchSellerRules(setRules), []);
  // first the plan page (Free / Paid), then the form. The plan is only a choice here: a Paid seller pays after approval.
  // initialPlan: chosen on the public pricing page ("Start selling") before the Google sign-in
  const [plan, setPlan] = useState(['free', 'pro', 'premium'].includes(initialPlan) ? initialPlan : '');
  const [plans, setPlans] = useState(() => normalizePlans(null));
  useEffect(() => watchPlans(setPlans), []);
  // the store's categories the seller wants to sell (saved as text in productNote; products are picked later in My Shop)
  const [cats, setCats] = useState([]);
  // sub-categories inside the chosen categories, saved as "Men's › Shirt" (none ticked = the whole category)
  const [subs, setSubs] = useState([]);
  const [catMsg, setCatMsg] = useState(null);
  // my plan (for the Premium priority support link)
  const [mySub, setMySub] = useState(null);
  // live products only (public product data: name / category; nothing about suppliers, costs or commission)
  const liveProducts = products.filter((p) => (p.status || 'approved') === 'approved');
  const catList = SHOP_COLLECTIONS.filter((c) => liveProducts.some((p) => productInCollection(p, c.name)));
  // how many live products each category / sub-category has right now, e.g. "Men's (48)", "Shirt (24)"
  const catCount = (label) => { const c = SHOP_COLLECTIONS.find((x) => x.label === label); return c ? liveProducts.filter((p) => productInCollection(p, c.name)).length : 0; };
  const subCount = (col, sub) => liveProducts.filter((p) => matchesCollectionPage(p, col, sub)).length;
  // the "only 3 categories" message: shown when the seller tries a 4th one (hides by itself), or on submit
  const [catLimitMsg, setCatLimitMsg] = useState('');
  useEffect(() => { if (!catLimitMsg) return undefined; const t = setTimeout(() => setCatLimitMsg(''), 5000); return () => clearTimeout(t); }, [catLimitMsg]);
  const catLabels = (catList.length ? catList : SHOP_COLLECTIONS).map((c) => c.label);
  const uid = customerUser ? customerUser.uid : '';
  const email = customerUser && customerUser.email ? customerUser.email.toLowerCase() : '';

  useEffect(() => watchMySeller(uid, setSeller), [uid]);
  useEffect(() => watchMySubscription(uid, setMySub), [uid]);
  const [myShop, setMyShop] = useState(null);
  useEffect(() => (seller && seller.slug ? watchShop(seller.slug, setMyShop, () => setMyShop(null)) : undefined), [seller && seller.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  // every shop of this account (more than one on Pro / Premium) and the "New shop" request form
  const [myShops, setMyShops] = useState([]);
  useEffect(() => (uid ? watchMyShops(uid, setMyShops, () => setMyShops([])) : undefined), [uid]);
  const [nsOpen, setNsOpen] = useState(false);
  const [nsHandle, setNsHandle] = useState('');
  const [nsCats, setNsCats] = useState([]);
  const [nsMsg, setNsMsg] = useState(null);
  const [nsBusy, setNsBusy] = useState(false);
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
    if (seller && status !== 'approved') setCats((c) => (c.length ? c : (Array.isArray(seller.categories) ? seller.categories : [])));
    if (seller && status !== 'approved') setSubs((c) => (c.length ? c : (Array.isArray(seller.subCategories) ? seller.subCategories : [])));
    if (seller && status === 'rejected') setForm((f) => (f.name ? f : { ...f, name: seller.name || '', whatsapp: seller.whatsapp || '', district: seller.district || '', area: seller.area || '', address: seller.address || '', socialLinks: { ...NO_SOCIALS, ...(seller.socialLinks || {}) }, productNote: seller.productNote || '' }));
    else if (customerUser && !seller) setForm((f) => (f.name ? f : { ...f, name: customerUser.displayName || '' }));
  }, [seller, status]); // eslint-disable-line react-hooks/exhaustive-deps
  // dashboard page (menu on the left) and the Billing History rows (from the server: subscriptionPayments is server-only)
  const [section, setSection] = useState('dashboard');
  const [billing, setBilling] = useState(null); // null = loading, { payments } or { error }
  useEffect(() => {
    if (section !== 'sub-billing' || !customerUser) return undefined;
    let live = true;
    setBilling(null);
    Promise.resolve(auth.currentUser ? auth.currentUser.getIdToken() : Promise.reject(new Error('signed out')))
      .then((t) => fetch('/api/plan?action=billing', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }))
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (live) setBilling(r.ok ? { payments: Array.isArray(j.payments) ? j.payments : [] } : { error: j.error || 'Could not load your payments.' }); })
      .catch(() => { if (live) setBilling({ error: 'Could not load your payments.' }); });
    return () => { live = false; };
  }, [section, customerUser]);

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
  // Free plan: at most plans.freeCategoryLimit categories (the plan chosen on the plan page, or saved in the application note)
  const chosenPlan = seller ? (/Premium plan/.test(seller.productNote || '') ? 'premium' : /Pro plan/.test(seller.productNote || '') ? 'pro' : 'free') : (plan || 'free');
  const catLimit = chosenPlan === 'free' ? plans.freeCategoryLimit : Infinity;
  const apply = async () => {
    setFormMsg('');
    const f = form;
    if (rules && !rules.open) return setFormMsg('Kyvro is not taking new sellers right now. Please try again later.');
    // shop link name: kyvro.store/<handle> (3 to 30 letters a-z, 0-9, "-"; free; can be changed later)
    const handle = cleanHandle(f.handle);
    if (!HANDLE_RE.test(handle)) return setFormMsg('Write a shop link name: 3 to 30 letters (a-z, 0-9 and -), e.g. rupa-style.');
    if (isReservedLink(handle)) return setFormMsg(`kyvro.store/${handle} is used by the website itself. Please choose another shop link.`);
    const bad = sellerNameBlocked(handle, '', rules);
    if (bad) return setFormMsg(`The shop link cannot contain "${bad}". Please choose another one.`);
    if (f.name.trim().length < 2) return setFormMsg('Write your full name.');
    if (!normalizeWhatsapp(f.whatsapp)) return setFormMsg('Write a valid WhatsApp number: 01XXXXXXXXX, +8801XXXXXXXXX or an international number starting with +.');
    if (f.district.trim().length < 2 || f.area.trim().length < 2) return setFormMsg('Write your district and area.');
    const badSocial = APPLY_SOCIALS.find((x) => !httpsLinkOk(String(f.socialLinks[x.key] || '').trim()));
    if (badSocial) return setFormMsg(`${badSocial.label}: the link must start with https://`);
    if (!cats.length) return setFormMsg('Tick at least one category you want to sell.');
    if (cats.length > catLimit) return setFormMsg(`The Free plan sells from up to ${catLimit} categories. Untick some, or choose Pro / Premium for all categories.`);
    if (!f.agreed) return setFormMsg('Please tick the box to confirm you are an independent seller.');
    setApplying(true);
    try { if (await handleTaken(handle)) { setApplying(false); return setFormMsg(`kyvro.store/${handle} is already taken. Try another link name.`); } }
    catch (e) { /* checked again by the rules */ }
    try { await applyAsSeller({ uid, email, handle, details: { ...f, categories: cats, subCategories: subs.filter((x) => cats.includes(x.split(' › ')[0])), productNote: plan === 'pro' || plan === 'premium' ? `Chose the ${TIER_LABEL[plan]} plan` : '' } }); }
    catch (e) { setFormMsg(e.code === 'permission-denied' ? 'Could not send the application. The link name may be taken or not allowed, you may already have a shop, or new sellers are paused.' : e.message); }
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
  // the store's categories as tick boxes (same list as the shop's category picker)
  const toggleCat = (l) => {
    setCatMsg(null); setFormMsg(''); setCatLimitMsg('');
    if (cats.includes(l)) { setCats((c) => c.filter((x) => x !== l)); setSubs((s) => s.filter((x) => x.split(' › ')[0] !== l)); return; }
    if (cats.length >= catLimit) { setCatLimitMsg(`The Free plan sells from up to ${catLimit} categories. Untick one first, or choose Pro / Premium for all categories.`); return; }
    setCats((c) => [...c, l]);
  };
  const toggleSub = (key) => setSubs((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));
  const chip = (on, cls) => `inline-flex items-center gap-2 rounded-full border font-semibold transition ${cls} ${on ? 'border-[#D4AF37] bg-[#D4AF37] text-black' : isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-300 text-gray-700'}`;
  const tick = (on) => <span className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] ${on ? 'border-black bg-black text-[#D4AF37]' : 'border-current'}`}>{on ? '✓' : ''}</span>;
  const catPicker = (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap gap-2">
        {catLabels.map((l) => {
          const on = cats.includes(l);
          return <button key={l} type="button" aria-pressed={on} onClick={() => toggleCat(l)} className={chip(on, 'px-3 py-2 text-xs')}>{tick(on)}{l} <span className={on ? 'text-black/60' : 'text-gray-500'}>({catCount(l)})</span></button>;
        })}
      </div>
      {catLimit !== Infinity && <p className="text-[11px] text-gray-500">Free plan: up to {catLimit} categories and {plans.freeLimit} products in total (from one or many categories). Pro / Premium: all categories and all products. <span className="font-semibold">{cats.length} / {catLimit} categories chosen.</span></p>}
      {catLimitMsg && <p className="text-xs text-red-500" role="alert">{catLimitMsg}</p>}
      {/* sub-categories of each chosen category (optional: none ticked = the whole category) */}
      {cats.map((l) => {
        const col = (SHOP_COLLECTIONS.find((c) => c.label === l) || {}).name;
        if (!col) return null;
        // Men / Women / Winter have a fixed list; Shoes, Wallets, Watches use the sub-categories their products have
        const fixed = flatSubCategories(col).length > 0;
        const list = fixed ? flatSubCategories(col)
          : [...new Set(liveProducts.filter((p) => productInCollection(p, col)).map((p) => String(p.category || '').trim()).filter((c) => c && c.toLowerCase() !== col.toLowerCase()))].sort();
        const countOf = (n) => (fixed ? subCount(col, n) : liveProducts.filter((p) => productInCollection(p, col) && String(p.category || '').trim() === n).length);
        if (!list.length) {
          return (
            <div key={l} className={`rounded-lg border p-3 text-[11px] text-gray-500 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <span className="font-semibold">{l}:</span> no sub-categories. You sell from all {l} ({catCount(l)}).
            </div>
          );
        }
        return (
          <div key={l} className={`rounded-lg border p-3 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-semibold text-gray-500">{l}: which ones? <span className="font-normal">(optional, none = all of {l})</span></p>
              {/* All: tick every sub-category of this category at once (press again to untick them) */}
              {(() => {
                const keys = list.map((n) => `${l} › ${n}`);
                const allOn = keys.every((k) => subs.includes(k));
                return (
                  <button type="button" aria-pressed={allOn} onClick={() => setSubs((s) => (allOn ? s.filter((x) => !keys.includes(x)) : [...new Set([...s, ...keys])]))}
                    className={chip(allOn, 'px-3 py-1 text-[11px]')}>{tick(allOn)}All ({catCount(l)})</button>
                );
              })()}
            </div>
            <div className="flex flex-wrap gap-2">
              {list.map((n) => {
                const key = `${l} › ${n}`;
                const on = subs.includes(key);
                return <button key={key} type="button" aria-pressed={on} onClick={() => toggleSub(key)} className={chip(on, 'px-2.5 py-1.5 text-[11px]')}>{tick(on)}{subLabel(n)} <span className={on ? 'text-black/60' : 'text-gray-500'}>({countOf(n)})</span></button>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
  const saveCats = async () => {
    setCatMsg(null);
    if (!cats.length) { setCatMsg({ type: 'err', text: 'Tick at least one category.' }); return; }
    try { await updateSellerCategories(uid, cats, subs.filter((x) => cats.includes(x.split(' › ')[0]))); setCatMsg({ type: 'ok', text: 'Categories saved.' }); }
    catch (e) { setCatMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Could not save (publish the latest Firestore rules).' : e.message }); }
  };

  // ---- never applied: choose a plan first (like a pricing page) ----
  if (!seller && !plan) {
    return <SellPricing formatPrice={formatPrice} isDarkMode={isDarkMode} onChoose={setPlan} />;
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
        {!seller && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>Plan: <strong className="text-[#D4AF37]">{TIER_LABEL[plan] || 'Free'}</strong></span>
            <button type="button" onClick={() => setPlan('')} className="underline text-gray-500">Change plan</button>
          </div>
        )}
        {(plan === 'pro' || plan === 'premium') && !seller && <p className="text-xs p-3 rounded border border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10 font-semibold">{TIER_LABEL[plan]} plan: your shop opens on the Free plan; pay right after from the plan card in My Shop to switch on {TIER_LABEL[plan]}.</p>}
        <p className="text-xs text-gray-500">Open your own shop link with Kyvro products, set your price (within the limit) and earn the markup on delivered orders. Kyvro takes the payment and delivers every order. Your first shop goes live right away (more shops on Pro / Premium are checked by Kyvro first). Shops not visited for 30 days are removed. We never ask for NID, passport or bank details.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {/* shop link name (any plan) + the shop name shown on the website (Premium) */}
          <label className="block text-xs font-semibold text-gray-500">Shop link *
            <div className={`mt-1 flex items-stretch rounded border overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <span className={`px-2 flex items-center text-[11px] whitespace-nowrap ${isDarkMode ? 'bg-[#1a1a1a] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>kyvro.store/</span>
              <input className={`${inputCls} !border-0 !rounded-none flex-1 min-w-0`} value={form.handle} maxLength={30} placeholder="rupa-style" onChange={(e) => set('handle', cleanHandle(e.target.value))} />
            </div>
            <span className="block mt-1 font-normal text-[11px]">Your shop's web address. Free on every plan. You can change it later in My Shop (once in 30 days; old links keep working).</span>
          </label>
          <label className="block text-xs font-semibold text-gray-500">Create Website Name <span className="font-normal">🔒 Premium</span>
            <input className={`${inputCls} block mt-1 w-full opacity-60`} value={prettyHandle(form.handle)} placeholder="Rupa Style" readOnly disabled />
            <span className="block mt-1 font-normal text-[11px]">Until you create one (Premium), your shop shows its link name like this. Upgrade to Premium to create your own Website Name.</span>
          </label>
          {field('name', 'Full name *', { maxLength: 80 })}
          <label className="block text-xs font-semibold text-gray-500">Email (from your login)
            <input className={`${inputCls} block mt-1 w-full opacity-70`} value={email} readOnly disabled />
          </label>
          {field('whatsapp', 'WhatsApp number *', { inputMode: 'tel', placeholder: '+8801XXXXXXXXX' })}
          {field('district', 'District *', { maxLength: 40, placeholder: 'e.g. Dhaka' })}
          {field('area', 'Area *', { maxLength: 60, placeholder: 'e.g. Mirpur' })}
          <div className="sm:col-span-2">{field('address', 'Full address (optional)', { maxLength: 300 })}</div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-gray-500">Social media links <span className="font-normal">(optional: add any one, two or all three)</span></p>
            <div className="mt-1 grid sm:grid-cols-3 gap-3">
              {APPLY_SOCIALS.map((x) => (
                <label key={x.key} className="block text-[11px] font-semibold text-gray-500">{x.label}
                  <input className={`${inputCls} block mt-1 w-full`} maxLength={200} placeholder={x.placeholder} value={form.socialLinks[x.key]} onChange={(e) => set('socialLinks', { ...form.socialLinks, [x.key]: e.target.value })} />
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-gray-500">Which categories will you sell? * <span className="font-normal">(you choose the exact products after approval, and can change them any time in My Shop)</span></p>
            {catPicker}
          </div>
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

  // ---- the dashboard: menu on the left, the chosen page on the right ----
  const acctTier = effectiveTier(mySub);
  const feat = effectiveFeatures(myShop, myShop ? effectiveTier(myShop) : acctTier, plans.tierFeatures);
  // a locked item shows the plan that unlocks it (Pro where Pro has it by default, else Premium)
  const needs = (key) => {
    if (feat[key]) return null;
    const f = FEATURES.find((x) => x.key === key);
    const tf = plans.tierFeatures && plans.tierFeatures.pro;
    const proHas = tf && typeof tf[key] === 'boolean' ? tf[key] : !!(f && f.pro);
    return proHas && acctTier === 'free' ? 'Pro' : 'Premium';
  };
  const nav = [
    { title: '', items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'orders', label: 'Orders', icon: ShoppingBag },
      { key: 'products', label: 'Products', icon: Package },
    ] },
    { title: 'Shop & Growth', items: [
      { key: 'manage', label: 'Manage Shop', icon: Store },
      { key: 'analytics', label: 'Analytics', icon: BarChart3, badge: needs('salesStats') },
      { key: 'themes', label: 'Themes', icon: Palette, badge: needs('brandColor') },
      { key: 'landing', label: 'Landing Pages', icon: LayoutTemplate, badge: 'Soon' },
      { key: 'promo', label: 'Promo Codes', icon: TicketPercent, badge: 'Soon' },
    ] },
    { title: 'Money', items: [
      { key: 'earnings', label: 'Earnings & Payout', icon: Wallet },
    ] },
    { title: 'Settings', items: [
      { key: 'sub', label: 'Subscription', icon: Gem, children: [
        { key: 'sub-overview', label: 'Overview' },
        { key: 'sub-plans', label: 'Plans' },
        { key: 'sub-billing', label: 'Billing History' },
      ] },
      { key: 'support', label: 'Support', icon: LifeBuoy },
    ] },
  ];
  const go = (key) => setSection(key);
  const goPlans = () => setSection('sub-plans');
  const fmtDay = (v) => { const ms = toMillis(v); return ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'; };
  const paidUntilMs = toMillis(mySub && mySub.paidUntil);
  const daysLeft = paidUntilMs ? Math.ceil((paidUntilMs - Date.now()) / 86400000) : 0;
  const shopsUsed = sellerShopList(seller).length;
  const shopLimit = shopLimitFor(plans, acctTier);
  const productsInShops = myShops.reduce((n, x) => n + Object.keys(x.items || {}).length, 0);
  const title = (text, sub) => (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold">{text}</h2>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
  const notYet = <div className={card}><p className="text-sm text-gray-500">This opens after Kyvro approves your shop.</p></div>;
  // a page this plan does not have: what it does and the plan that unlocks it
  const locked = (name, plan, what) => (
    <div className={`${card} text-center !py-12`}>
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#B8921F]"><Lock size={24} /></span>
      <h3 className="text-xl font-bold">{name}</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">{what}</p>
      {plan === 'Soon'
        ? <p className="text-xs font-bold uppercase tracking-wider text-[#B8921F]">Coming soon for Premium</p>
        : <p className="text-xs font-bold uppercase tracking-wider text-[#B8921F]">Available on {plan}{plan === 'Pro' ? ' and Premium' : ''}</p>}
      <button type="button" onClick={goPlans} className={GOLD_BTN}>{plan === 'Soon' ? 'See plans' : `Upgrade to ${plan}`}</button>
    </div>
  );
  const stat = (label, value, Icon, tint) => (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tint}`}><Icon size={20} /></span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 truncate">{label}</p>
        <p className="text-lg sm:text-xl font-bold truncate">{value}</p>
      </div>
    </div>
  );
  const orderRows = earn && (earn.orders.length === 0 ? <p className="text-sm text-gray-500">No orders from your shop yet.</p> : (
    <div className="divide-y divide-gray-500/15 text-xs">
      {earn.orders.map((o) => (
        <div key={o.orderNumber} className="py-2.5 flex flex-wrap justify-between gap-x-4 gap-y-1">
          <span><strong className="text-[#D4AF37]">{o.orderNumber}</strong>{earn.shops && earn.shops.length > 1 && o.shop ? <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-500/15 text-[10px] font-semibold">{(() => { const x = myShops.find((m) => m.slug === o.shop); return x ? (x.handle || x.slug) : o.shop; })()}</span> : null} · {formatDateTime(o.createdAt)} · {o.items.map((it) => `${it.name} ×${it.quantity}`).join(', ')}</span>
          <span>{o.returned ? 'Returned' : o.status} · markup <strong className={o.earned > 0 ? 'text-green-600' : 'text-gray-500'}>{formatPrice(o.markup)}</strong></span>
        </div>
      ))}
    </div>
  ));
  const refreshBtn = <button type="button" onClick={refresh} className="px-3 py-1.5 rounded-full border border-gray-400 text-xs font-semibold">Refresh</button>;

  // ---- My shops (Free 1, Pro 2, Premium 3; the Owner can change the numbers); every new shop waits for approval ----
  const myShopsCard = approved && (() => {
    const list = sellerShopList(seller).map((slug) => myShops.find((x) => x.slug === slug) || { slug, missing: true });
    const canAdd = shopsUsed < shopLimit;
    const sendShop = async () => {
      setNsMsg(null);
      const h = cleanHandle(nsHandle);
      if (!HANDLE_RE.test(h)) return setNsMsg({ type: 'err', text: 'Shop link: 3 to 30 letters (a-z, 0-9 and -), e.g. rahim-shoes.' });
      if (isReservedLink(h)) return setNsMsg({ type: 'err', text: `kyvro.store/${h} is used by the website itself. Try another one.` });
      const bad = sellerNameBlocked(h, '', rules);
      if (bad) return setNsMsg({ type: 'err', text: `The shop link cannot contain "${bad}".` });
      if (!nsCats.length) return setNsMsg({ type: 'err', text: 'Tick at least one category for this shop.' });
      setNsBusy(true);
      try {
        if (await handleTaken(h)) setNsMsg({ type: 'err', text: `kyvro.store/${h} is already taken. Try another one.` });
        else { await requestSellerShop({ uid, seller, handle: h, categories: nsCats }); setNsMsg({ type: 'ok', text: `Sent. kyvro.store/${h} goes live after Kyvro approves it.` }); setNsHandle(''); setNsCats([]); setNsOpen(false); }
      } catch (e) { setNsMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Could not send: your plan allows no more shops, or the link is taken.' : e.message }); }
      setNsBusy(false);
    };
    const upgradeText = acctTier === 'premium' ? `Premium: up to ${shopLimit} shops.` : acctTier === 'pro' ? `Pro: ${shopLimit} shops. Upgrade to Premium for ${shopLimitFor(plans, 'premium')}.` : `Free plan: ${shopLimit} shop. Upgrade to Pro (${shopLimitFor(plans, 'pro')} shops) or Premium (${shopLimitFor(plans, 'premium')} shops) for more.`;
    return (
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8921F]">My shops <span className="text-gray-500 normal-case tracking-normal font-semibold">({shopsUsed} / {shopLimit})</span></p>
          {canAdd
            ? <button type="button" onClick={() => { setNsOpen((v) => !v); setNsMsg(null); }} className={`${OUTLINE_BTN} !py-1.5`}>{nsOpen ? 'Close' : '+ New shop'}</button>
            : <button type="button" onClick={goPlans} className="text-[11px] font-semibold text-[#B8921F] underline text-left">{upgradeText}</button>}
        </div>
        <div className="divide-y divide-gray-500/15 text-xs">
          {list.map((x) => (
            <div key={x.slug} className="py-2 flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{x.missing ? x.slug : (x.handle ? prettyHandle(x.handle) : x.name)} <a href={`/${x.handle || x.slug}`} target="_blank" rel="noopener noreferrer" className="font-normal text-gray-500 hover:underline">· kyvro.store/{x.handle || x.slug}</a></span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${x.status === 'pending' ? 'bg-amber-500/15 text-amber-600' : x.active === false ? 'bg-gray-500/15 text-gray-500' : 'bg-green-600/15 text-green-600'}`}>{x.status === 'pending' ? 'Waiting for Kyvro' : x.active === false ? 'Off' : 'Live'}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-500">{acctTier === 'free' ? `The Free plan's ${plans.freeLimit} products count across all your shops.` : 'Your plan covers all your shops.'} Switch between your shops on top of Products and Manage Shop.</p>
        {nsMsg && <p className={`text-xs ${nsMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{nsMsg.text}</p>}
        {nsOpen && canAdd && (
          <div className={`rounded-xl border p-4 space-y-3 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <label className="block text-xs font-semibold text-gray-500">Shop link *
              <div className={`mt-1 flex items-stretch rounded border overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                <span className={`px-2 flex items-center text-[11px] whitespace-nowrap ${isDarkMode ? 'bg-[#1a1a1a] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>kyvro.store/</span>
                <input className={`${inputCls} !border-0 !rounded-none flex-1 min-w-0`} value={nsHandle} maxLength={30} placeholder="rahim-shoes" onChange={(e) => setNsHandle(cleanHandle(e.target.value))} />
              </div>
            </label>
            <div>
              <p className="text-xs font-semibold text-gray-500">Categories for this shop *</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {catLabels.map((l) => {
                  const on = nsCats.includes(l);
                  return <button key={l} type="button" aria-pressed={on} onClick={() => setNsCats((c) => (on ? c.filter((x) => x !== l) : [...c, l]))} className={chip(on, 'px-3 py-1.5 text-xs')}>{tick(on)}{l}</button>;
                })}
              </div>
            </div>
            <button type="button" disabled={nsBusy} onClick={sendShop} className={`${GOLD_BTN} w-full sm:w-auto`}>{nsBusy ? 'Sending...' : 'Send shop request'}</button>
            <p className="text-[11px] text-gray-500">Kyvro checks every new shop; it goes live after approval.</p>
          </div>
        )}
      </div>
    );
  })();

  // what shows above / below My Shop (My Shop itself stays mounted so unsaved ticks survive a page change)
  let before = null;
  const s = section;
  if (s === 'dashboard') {
    before = (
      <>
        <div className={`${card} !space-y-1`}>
          <h2 className="text-xl sm:text-2xl font-bold">Hello, {(customerUser.displayName || 'Seller').split(' ')[0]}!</h2>
          <p className="text-xs text-gray-500">{approved ? 'Your shop is live. Choose products, share your link and earn on every delivered order.' : 'Kyvro is checking your application. You can already choose products; your link starts working after approval.'}</p>
        </div>
        <SellerBanner isDarkMode={isDarkMode} />
        {approved && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {stat('Earned', formatPrice(earned), Wallet, 'bg-[#D4AF37]/15 text-[#B8921F]')}
            {stat(earned - paid >= 0 ? 'Due to you' : 'Overpaid', formatPrice(Math.abs(earned - paid)), Receipt, 'bg-red-500/10 text-red-500')}
            {stat('Orders', earn ? earn.orders.length : '-', ShoppingBag, 'bg-green-600/10 text-green-600')}
            {stat('Products in shop', productsInShops, Package, 'bg-purple-500/10 text-purple-500')}
          </div>
        )}
        {earnErr && <p className="text-xs text-red-500">{earnErr}</p>}
        {!approved && (
          <div className={card}>
            <p className="text-xs font-semibold text-gray-500">Categories you want to sell * <span className="font-normal">(you can change them while Kyvro checks your application)</span></p>
            {catPicker}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={saveCats} className="bg-[#D4AF37] text-black font-bold px-5 py-2 rounded text-xs uppercase tracking-wider">Save categories</button>
              {catMsg && <span className={`text-xs ${catMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{catMsg.text}</span>}
            </div>
          </div>
        )}
        {myShopsCard}
        {approved && earn && earn.orders.length > 0 && (
          <div className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold">Latest orders</h3>
              <button type="button" onClick={() => go('orders')} className="text-xs font-semibold text-[#B8921F] underline">See all</button>
            </div>
            <div className="divide-y divide-gray-500/15 text-xs">
              {earn.orders.slice(0, 5).map((o) => (
                <div key={o.orderNumber} className="py-2 flex flex-wrap justify-between gap-2">
                  <span><strong className="text-[#D4AF37]">{o.orderNumber}</strong> · {formatDateTime(o.createdAt)}</span>
                  <span>{o.returned ? 'Returned' : o.status} · <strong className={o.earned > 0 ? 'text-green-600' : 'text-gray-500'}>{formatPrice(o.markup)}</strong></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  } else if (s === 'orders') {
    before = !approved ? notYet : (
      <>
        <div className="flex flex-wrap items-end justify-between gap-2">{title('Orders', 'Orders from your shop links. Kyvro confirms and delivers every order; customer details stay with Kyvro.')}{refreshBtn}</div>
        <div className={card}>{earnErr ? <p className="text-xs text-red-500">{earnErr}</p> : !earn ? <p className="text-sm text-gray-500">Loading...</p> : orderRows}</div>
      </>
    );
  } else if (s === 'products') {
    before = title('Products', 'Tick the products your shop sells and set your price (within the limit). Press "Save my shop" at the bottom.');
  } else if (s === 'manage') {
    before = title('Manage Shop', 'Your link, website name, social links, logo, banner and more. Locked parts open on Pro / Premium.');
  } else if (s === 'analytics') {
    before = !approved ? notYet : feat.salesStats ? (
      <>
        <div className="flex flex-wrap items-end justify-between gap-2">{title('Analytics', 'How your shop sells.')}{refreshBtn}</div>
        <div className={card}>{earn ? <SellerStats orders={earn.orders} formatPrice={formatPrice} isDarkMode={isDarkMode} statsOn={feat.salesStats} csvOn={feat.earningsCsv} /> : <p className="text-sm text-gray-500">Loading...</p>}</div>
      </>
    ) : locked('Analytics', 'Pro', 'Sales stats for your shop: orders, delivered, earnings by month and your best sellers.');
  } else if (s === 'themes') {
    before = feat.brandColor ? title('Themes', 'Re-design your shop: brand color, announcement strip and pinned products.') : locked('Themes', needs('brandColor'), 'Re-design your shop with your own brand color, an announcement strip on top and your best products pinned first.');
  } else if (s === 'landing') {
    before = locked('Landing Pages', 'Soon', 'A separate page for one offer or one product, to share in your ads.');
  } else if (s === 'promo') {
    before = locked('Promo Codes', 'Soon', 'Your own coupon codes for your shop\'s customers.');
  } else if (s === 'earnings') {
    before = !approved ? notYet : (
      <>
        <div className="flex flex-wrap items-end justify-between gap-2">{title('Earnings & Payout')}{refreshBtn}</div>
        <div className={card}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[['Earned', earned, 'text-[#D4AF37]'], ['Paid to you', paid, 'text-green-600'], [earned - paid >= 0 ? 'Due' : 'Overpaid', Math.abs(earned - paid), earned - paid > 0 ? 'text-red-500' : 'text-green-600'], ['Waiting (not delivered)', earn ? earn.waiting : 0, 'text-gray-500']].map(([l, v, c]) => (
              <div key={l} className={`rounded border p-3 ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xl font-bold ${c}`}>{formatPrice(v)}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500">{earn && earn.shops && earn.shops.length > 1 ? `All ${earn.shops.length} of your shops are counted together, in one payout. ` : ''}You earn the markup (your price − the store price) when an order is delivered. Returned and cancelled orders earn nothing. Payout: {feat.weeklyPayout ? 'weekly' : 'monthly'}.</p>
          {earnErr && <p className="text-xs text-red-500">{earnErr}</p>}
        </div>
        <div className={card}>
          <h3 className="text-lg font-bold">Payout</h3>
          <p className="text-xs text-gray-500">Kyvro pays your markup to this bKash number. For your safety only Kyvro can see it, so it is not shown here after saving.</p>
          <div className="flex flex-wrap gap-2 items-center">
            <input className={`${inputCls} w-56`} inputMode="numeric" placeholder="bKash number, e.g. 017XXXXXXXX" value={bkash} onChange={(e) => setBkash(e.target.value)} />
            <button type="button" disabled={saving} onClick={saveBkash} className="bg-[#D4AF37] text-black font-bold px-5 py-2 rounded text-xs uppercase tracking-wider disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
          {bkashMsg && <p className={`text-xs ${bkashMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{bkashMsg.text}</p>}
          {payouts.length > 0 ? (
            <div className="divide-y divide-gray-500/15 text-xs">
              {[...payouts].sort((a, b) => (toDate(b.at) || 0) - (toDate(a.at) || 0)).map((x) => (
                <div key={x.id} className="py-1.5 flex flex-wrap justify-between gap-2">
                  <span>{formatDateTime(x.at)}{x.note ? ` · ${x.note}` : ''}</span>
                  <strong className="text-green-600">{formatPrice(x.amount)}</strong>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-500">No payouts yet.</p>}
        </div>
      </>
    );
  } else if (s === 'sub-overview') {
    before = (
      <>
        {title('Subscription', 'Your plan covers all your shops. No auto-charge: you renew by hand with bKash / Nagad.')}
        <div className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8921F]">Current plan</p>
              <p className="text-2xl font-bold mt-1">{acctTier === 'free' ? 'Free' : <span className="text-[#D4AF37]">{TIER_LABEL[acctTier]}</span>}</p>
              <p className="text-xs text-gray-500 mt-1">{acctTier === 'free' ? (paidUntilMs ? `Your paid plan ended on ${fmtDay(paidUntilMs)}.` : 'Free forever. Upgrade any time.') : `Active until ${fmtDay(paidUntilMs)} (${daysLeft} day${daysLeft === 1 ? '' : 's'} left).`}</p>
            </div>
            <button type="button" onClick={goPlans} className={GOLD_BTN}>{acctTier === 'free' ? 'Upgrade' : acctTier === 'pro' ? 'Renew or upgrade' : 'Renew'}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            {[
              ['Shops', `${shopsUsed} / ${shopLimit}`],
              ['Products', acctTier === 'free' && plans.enabled ? `${productsInShops} / ${plans.freeLimit}` : `${productsInShops} · all allowed`],
              ['Payout', feat.weeklyPayout ? 'Weekly' : 'Monthly'],
            ].map(([l, v]) => (
              <div key={l} className={`rounded-xl border p-3 ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-gray-50'}`}>
                <p className="text-lg font-bold">{v}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className={card}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8921F]">What your plan includes</p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {FEATURES.filter((f) => f.key !== 'allProducts').map((f) => (
              <li key={f.key} className={`flex items-center gap-2 ${feat[f.key] ? '' : 'text-gray-500'}`}>
                <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${feat[f.key] ? 'bg-[#D4AF37] text-black' : 'bg-gray-500/15'}`}>{feat[f.key] ? '✓' : <Lock size={10} />}</span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  } else if (s === 'sub-plans') {
    before = title('Plans', 'Pay with bKash / Nagad. The plan starts right after the payment and covers all your shops.');
  } else if (s === 'sub-billing') {
    before = (
      <>
        {title('Billing History', 'Your plan payments. Comp plans given by Kyvro are not listed here.')}
        <div className={card}>
          {billing === null ? <p className="text-sm text-gray-500">Loading...</p>
            : billing.error ? <p className="text-xs text-red-500">{billing.error}</p>
              : billing.payments.length === 0 ? <p className="text-sm text-gray-500">No payments yet.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-gray-500 uppercase tracking-wider text-[10px]"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Plan</th><th className="py-2 pr-3">Days</th><th className="py-2 pr-3">Method</th><th className="py-2 text-right">Amount</th></tr></thead>
                    <tbody className="divide-y divide-gray-500/15">
                      {billing.payments.map((p) => (
                        <tr key={p.invoice}>
                          <td className="py-2 pr-3 whitespace-nowrap">{fmtDay(p.at)}</td>
                          <td className="py-2 pr-3 font-semibold">{TIER_LABEL[p.tier] || p.tier}</td>
                          <td className="py-2 pr-3">{p.days || '-'}</td>
                          <td className="py-2 pr-3 capitalize">{p.method || '-'}</td>
                          <td className="py-2 text-right font-bold">{formatPrice(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </div>
      </>
    );
  } else if (s === 'support') {
    before = (
      <>
        {title('Support')}
        {feat.prioritySupport ? (
          <div className={`${card} border-[#D4AF37]/60`}>
            <h3 className="text-lg font-bold flex items-center gap-2">Priority support <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37] text-black font-bold uppercase">Premium</span></h3>
            {plans.supportWhatsapp
              ? <a href={`https://wa.me/${plans.supportWhatsapp.replace(/^\+/, '').replace(/^0/, '880')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-600 text-white font-bold px-5 py-2 rounded text-xs uppercase tracking-wider">Chat on WhatsApp</a>
              : <p className="text-xs text-gray-500">Email kyvrofashion@gmail.com and write "Premium" in the subject.</p>}
            <p className="text-[11px] text-gray-500">Premium sellers are answered first.</p>
          </div>
        ) : (
          <div className={card}>
            <p className="text-sm">Questions about your shop? Email <a href="mailto:kyvrofashion@gmail.com" className="font-semibold text-[#B8921F] underline">kyvrofashion@gmail.com</a>.</p>
            <p className="text-[11px] text-gray-500">Premium sellers get priority support on WhatsApp. <button type="button" onClick={goPlans} className="underline text-[#B8921F] font-semibold">See plans</button></p>
          </div>
        )}
      </>
    );
  }
  // My Shop's own pages; everything else keeps it mounted but hidden
  const shopView = s === 'products' ? 'products' : s === 'manage' ? 'manage' : s === 'themes' && feat.brandColor ? 'theme' : s === 'sub-plans' ? 'plan' : 'none';

  const head = (
    <div className="flex items-center gap-3 min-w-0">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37] text-black font-bold">{(myShop ? shopDisplayName(myShop) : 'K').charAt(0).toUpperCase()}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold truncate">{myShop ? shopDisplayName(myShop) : 'My shop'}</p>
        <button type="button" onClick={() => go('sub-overview')} className={`text-[10px] font-bold uppercase tracking-wider ${acctTier === 'free' ? 'text-gray-500' : 'text-[#B8921F]'}`}>{TIER_LABEL[acctTier] || 'Free'} plan</button>
      </div>
    </div>
  );

  return (
    <SellerDashLayout nav={nav} active={section} onSelect={go} isDarkMode={isDarkMode} head={head}>
      {before}
      <MyShop view={shopView} sellerMode showPlan={approved} adminRole="seller" isOwner={false} products={products} isDarkMode={isDarkMode} formatPrice={formatPrice} adminName={customerUser.displayName || email} loggedInUserEmail={email} />
    </SellerDashLayout>
  );
}
