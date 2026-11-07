import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import { watchMyShop, watchMyShops, watchAllShops, watchShopOwners, createShop, saveShopItems, saveShopName, shopNameTaken, setShopActive, isPendingShop, acceptShop, rejectShop, shopLinkKey, cleanHandle, HANDLE_RE, handleTaken, setShopHandle, nextHandleChange, setMyShopLive } from '../shops';
import { askConfirm } from './AlertCenter';
import { WHATSAPP_NUMBER } from '../data/shopConfig';
import { maxMarkupFor, shopPriceClamp, SHOP_COLLECTIONS, productInCollection } from '../data/shopConfig';
import { flatSubCategories, subLabel } from '../data/catalog';
import { watchPlans, watchMySubscription } from '../storeSettings';
import { normalizePlans, toMillis, SHOP_MAX_ITEMS, effectiveTier, TIER_LABEL, basicCharging, basicDue, basicPrice, visibleShopIds } from '../data/priceCheck';
import PlanCards from './PlanCards';
import ShopExtrasEditor from './ShopExtrasEditor';
import { GOLD_BTN, OUTLINE_BTN, GHOST_BTN } from './ui';
import { isReservedLink } from '../data/reservedLinks';
import { shopExtrasOf, httpsLinkOk, contactOk, cleanContact, effectiveFeatures, FEATURES, shopDisplayName } from '../data/shopBrand';
import { watchSellerRules, sellerNameBlocked, normalizeSellerRules, watchMySeller } from '../sellers';

// read-only (the Owner viewing a seller): a disabled fieldset switches off every button and field inside it
function ReadOnlyBox({ children }) {
  return <fieldset disabled className="min-w-0 m-0 p-0 border-0 space-y-5">{children}</fieldset>;
}

// key = a shop's link name (handle) or its id: both open the shop at kyvro.store/<key>
const shopUrl = (key) => `${window.location.origin}/${key}`;

// Premium ON / OFF switch (a real button, so Space / Enter work and screen readers hear "switch, on / off")
function ShopSwitch({ on, busy, onToggle, isDarkMode, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={busy}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait ${isDarkMode ? 'focus-visible:ring-offset-[#161616]' : 'focus-visible:ring-offset-white'} ${on ? 'bg-gradient-to-r from-emerald-400 to-green-600 border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.55)]' : isDarkMode ? 'bg-[#2a2a2a] border-gray-700' : 'bg-gray-300 border-gray-300'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-out ${on ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
      </button>
      <span className={`w-7 text-[11px] font-bold tracking-wider ${on ? 'text-green-600' : 'text-gray-500'}`}>{busy ? '...' : on ? 'ON' : 'OFF'}</span>
    </span>
  );
}

// "My Shop": every Manager gets their own link (kyvro.store/<link>). They choose which products to show
// (by collection or one by one) and the price they sell at, up to the limit for that product. The whole markup is theirs.
// An Admin the Owner switched "Shop create" ON for can make one too: it stays switched off until the Owner accepts it.
// Payments (online, delivery charge, cash on delivery) all stay with the store; the Owner pays the markup out later.
// view (seller dashboard): 'all' (default), 'products', 'manage', 'theme', 'plan' or 'none' (stays mounted so unsaved ticks survive)
// readOnly + asUid: the Owner viewing a seller's dashboard (every control disabled, the seller's shops read by uid)
// part (Owner only): 'own' = just my own shop (Admin -> My Shop); 'all' = my shop first, then the Team Shops list
export default function MyShop({ part = 'all', view = 'all', readOnly = false, asUid = '', sellerMode = false, showPlan = true, canCreateShop = false, adminRole, products, isOwner, isDarkMode, formatPrice, adminName, loggedInUserEmail, onDirtyChange, onUpgrade = null }) {
  const [shop, setShop] = useState(undefined); // undefined = loading, null = none yet
  const [draft, setDraft] = useState({}); // productId -> price text (only the products that are in the shop)
  const [name, setName] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [allShops, setAllShops] = useState([]);
  const [owners, setOwners] = useState({});
  const [switching, setSwitching] = useState(''); // slug of the shop whose ON / OFF is being saved
  const [openCat, setOpenCat] = useState(''); // the one category that is open in the product picker
  const [plans, setPlans] = useState(() => normalizePlans(null));
  const [sub, setSub] = useState(null); // my plan (subscriptions/{uid}), written only by the server
  const [paying, setPaying] = useState(''); // the tier whose payment page is opening
  // Pro / Premium shop extras shown on the storefront
  const [extras, setExtras] = useState(() => shopExtrasOf(null));
  // blocked shop-name words (settings/sellerRules): checked on every name change except the Owner's (also in firestore.rules)
  const [sellerRules, setSellerRules] = useState(null);
  useEffect(() => (isOwner ? undefined : watchSellerRules(setSellerRules)), [isOwner]);

  const uid = asUid || (auth.currentUser ? auth.currentUser.uid : '');
  // a public seller's application: on the Free plan they pick products only from the categories Kyvro approved
  const [mySeller, setMySeller] = useState(null);
  useEffect(() => (sellerMode && uid ? watchMySeller(uid, setMySeller) : undefined), [sellerMode, uid]);
  useEffect(() => {
    if (isOwner) {
      const a = watchAllShops(setAllShops, () => {});
      const b = watchShopOwners(setOwners, () => {});
      const c = uid ? watchMyShop(uid, (s) => setShop(s), () => setShop(null)) : (setShop(null), () => {}); // the Owner can have a shop too
      return () => { a(); b(); c(); };
    }
    if (adminRole === 'admin') {
      const a = watchAllShops(setAllShops, () => {}); // every Admin sees the shop links
      if (!canCreateShop || !uid) { setShop(null); return a; }
      const c = watchMyShop(uid, (s) => setShop(s), () => setShop(null)); // and their own shop, with "Shop create" ON
      return () => { a(); c(); };
    }
    if (!uid) { setShop(null); return undefined; }
    if (sellerMode) return undefined; // a public seller: below (their first shop; more shops on Pro / Premium)
    return watchMyShop(uid, (s) => setShop(s), () => setShop(null));
  }, [isOwner, adminRole, uid, canCreateShop, sellerMode]);
  // a public seller: every shop of the account. The switcher on top picks the one My Shop edits (first shop by default;
  // the choice is remembered on this device).
  const [myShops, setMyShops] = useState(null); // null = loading
  useEffect(() => (sellerMode && uid ? watchMyShops(uid, setMyShops, () => setMyShops([])) : undefined), [sellerMode, uid]);
  const [pick, setPick] = useState(() => { try { return localStorage.getItem('kyvro_myshop') || ''; } catch (e) { return ''; } });
  const choose = (slug) => { setPick(slug); try { localStorage.setItem('kyvro_myshop', slug); } catch (e) { /* no storage */ } };
  // the application's shop first, then the extra shops in the order they were asked for
  const shopOrder = (mySeller && Array.isArray(mySeller.shops) && mySeller.shops.length ? mySeller.shops : mySeller && mySeller.slug ? [mySeller.slug] : []);
  const sortedShops = (myShops || []).slice().sort((a, b) => ((shopOrder.indexOf(a.slug) + 1) || 99) - ((shopOrder.indexOf(b.slug) + 1) || 99));
  useEffect(() => {
    if (!sellerMode || myShops === null) return;
    const chosen = pick ? myShops.find((x) => x.slug === pick) : null;
    const first = mySeller && mySeller.slug ? myShops.find((x) => x.slug === mySeller.slug) : null;
    setShop(chosen || first || myShops.find((x) => !x.extra) || myShops[0] || null);
  }, [sellerMode, myShops, pick, mySeller && mySeller.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => watchPlans(setPlans), []);
  useEffect(() => (isOwner ? undefined : watchMySubscription(uid, setSub)), [uid, isOwner]);

  // the saved shop as an editable draft: loaded once per shop, again after Discard
  const draftFrom = (s) => { const d = {}; Object.entries((s && s.items) || {}).forEach(([id, p]) => { d[id] = String(p); }); return d; };
  const [loadedFor, setLoadedFor] = useState('');
  useEffect(() => {
    if (shop && loadedFor !== shop.slug) {
      setDraft(draftFrom(shop)); setName(shopDisplayName(shop) || shop.name || ''); setHandleDraft(shop.handle || ''); setExtras(shopExtrasOf(shop)); setLoadedFor(shop.slug);
    }
  }, [shop, loadedFor]);

  // unsaved = the ticks, prices or extras differ from what is saved in Firestore (the name has its own Save button)
  const savedItems = (shop && shop.items) || {};
  const dirty = !!shop && (
    JSON.stringify(extras) !== JSON.stringify(shopExtrasOf(shop))
    || Object.keys(draft).length !== Object.keys(savedItems).length
    || Object.entries(draft).some(([id, v]) => savedItems[id] === undefined || Number(v) !== Number(savedItems[id]))
  );
  useEffect(() => { if (onDirtyChange) onDirtyChange(dirty); }, [dirty]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (onDirtyChange) onDirtyChange(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // closing or reloading the page with unsaved changes: the browser asks first
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ---- shop plan: Free = plans.freeLimit products, Paid = all (the Owner has no limit; also checked in firestore.rules) ----
  const paidUntil = toMillis(sub && sub.paidUntil);
  const paid = paidUntil > Date.now();
  const tier = isOwner ? 'premium' : effectiveTier(sub); // free / pro / premium right now
  // shop page extras: Pro / Premium (social links, share kit), Premium (tagline, contact, about, logo, banner, brand color,
  // announcement, pinned products). The rules check the tier the server wrote on the shop.
  const feat = isOwner ? Object.fromEntries(FEATURES.map((f) => [f.key, true])) : effectiveFeatures(shop, shop ? effectiveTier(shop) : 'free', plans.tierFeatures);
  const extrasAllowed = feat.tagline || feat.about || feat.social || feat.shareKit;
  // "All products": the paid plan, or the Owner's / a Manager's override for this shop
  const allOverride = shop && shop.features && typeof shop.features.allProducts === 'boolean' ? shop.features.allProducts : null;
  const planLimit = isOwner || !plans.enabled || (allOverride === null ? paid : allOverride) ? SHOP_MAX_ITEMS : plans.freeLimit;
  // a shop whose plan ran out may keep (or reduce) what it already has, but not add more
  // Free plan: the products count across ALL the seller's shops (so it stays right after Pro / Premium ends)
  const otherItems = sellerMode && shop && myShops ? myShops.filter((x) => x.slug !== shop.slug).reduce((n, x) => n + Object.keys(x.items || {}).length, 0) : 0;
  const cap = Math.max(planLimit === SHOP_MAX_ITEMS ? planLimit : Math.max(0, planLimit - otherItems), Object.keys(savedItems).length);
  const daysLeft = paidUntil ? Math.ceil((paidUntil - Date.now()) / 86400000) : null;
  // Pro / Premium ended (Basic now): the shop keeps every product, but customers see only the best sellers up to the
  // Basic limit. The seller still sees the others, marked locked, with Upgrade to unlock them.
  const visibleNow = shop && !isOwner ? visibleShopIds(shop, Object.fromEntries((products || []).map((p) => [String(p.id), p])), plans) : null;
  const isLocked = (id) => !!visibleNow && savedItems[id] !== undefined && !visibleNow.has(String(id));
  const lockedCount = visibleNow ? Object.keys(savedItems).filter((id) => !visibleNow.has(String(id))).length : 0;
  const upgradeBtn = (label = 'Upgrade to unlock') => (onUpgrade && !readOnly
    ? <button type="button" onClick={onUpgrade} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#D4AF37] text-black text-[11px] font-bold uppercase tracking-wider hover:opacity-90">🔓 {label}</button>
    : null);
  // paid Basic: only a seller store opened while Basic was charged (basicFree false), while Basic costs something and
  // no Pro / Premium runs. Not paid (or ended) = the store is closed to customers until paid.
  const basicUntil = Math.max(toMillis(sub && sub.basicUntil), toMillis(shop && shop.basicUntil));
  const basicNeed = !isOwner && !!shop && shop.kind === 'seller' && shop.basicFree === false && basicCharging(plans) && tier === 'free';
  const basicLate = basicNeed && basicDue(shop, plans);
  const basicDays = basicUntil ? Math.ceil((basicUntil - Date.now()) / 86400000) : null;
  const fmtDate = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const limitMsg = () => setMsg({ type: 'err', text: `The Basic plan shows up to ${plans.freeLimit} products${otherItems ? ' across all your shops' : ''}. Upgrade to add all products.` });
  // Free plan: products from at most plans.freeCategoryLimit categories (Pro / Premium / "All products": every category)
  const catLimit = planLimit === SHOP_MAX_ITEMS ? Infinity : plans.freeCategoryLimit;
  const catOf = (p) => (SHOP_COLLECTIONS.find((c) => productInCollection(p, c.name)) || {}).name || 'Other';
  const catsOf = (ids) => new Set(ids.map((id) => live.find((x) => String(x.id) === String(id))).filter(Boolean).map(catOf));
  const catMsg = () => setMsg({ type: 'err', text: `The Basic plan sells from up to ${plans.freeCategoryLimit} categories. Upgrade to Pro / Premium for all categories.` });
  const catsOk = (ids) => catsOf(ids).size <= catLimit;
  // Free seller shop: only the categories in the approved application (labels like "Men's"); Pro / Premium: every category
  const appCats = sellerMode && catLimit !== Infinity && mySeller && Array.isArray(mySeller.categories) ? mySeller.categories : [];
  const allowedKey = appCats.map((l) => (SHOP_COLLECTIONS.find((c) => c.label === l) || {}).name).filter(Boolean).sort().join('|');
  const allowed = allowedKey ? new Set(allowedKey.split('|')) : null;
  // the plan end date is copied onto the shop for the storefront; a shop made after paying gets it here
  // (once per shop: a seller's 2nd / 3rd shop made after paying gets it when it is opened; the server syncs all shops)
  const [synced, setSynced] = useState('');
  useEffect(() => {
    const basicSame = toMillis(sub && sub.basicUntil) === toMillis(shop && shop.basicUntil);
    if (readOnly || isOwner || !shop || synced === shop.slug || ((!paidUntil || (toMillis(shop.paidUntil) === paidUntil && (shop.tier || 'pro') === (sub.tier || 'pro'))) && (!(sub && sub.basicUntil) || basicSame)) || !auth.currentUser) return;
    setSynced(shop.slug);
    auth.currentUser.getIdToken().then((t) => fetch('/api/plan?action=sync', { method: 'POST', headers: { Authorization: `Bearer ${t}` } })).catch(() => {});
  }, [readOnly, isOwner, synced, shop, paidUntil]);
  const buyPlan = async (want) => {
    const buy = want === 'premium' ? 'premium' : want === 'basic' ? 'basic' : 'pro';
    setMsg(null); setPaying(buy);
    try {
      const t = await auth.currentUser.getIdToken();
      const r = await fetch('/api/plan?action=init', { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: buy }) });
      const j = await r.json().catch(() => ({}));
      if (j.url) { window.location.href = j.url; return; }
      setMsg({ type: 'err', text: j.error || 'The payment page could not be opened. Please try again.' });
    } catch (err) { setMsg({ type: 'err', text: 'The payment page could not be opened. Please try again.' }); }
    setPaying('');
  };

  const live = useMemo(() => products.filter((p) => (p.status || 'approved') === 'approved'), [products]);
  const link = shop ? shopUrl(shopLinkKey(shop)) : '';
  const card = `p-4 sm:p-6 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const inputCls = `border p-2 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;

  // main categories that have products (plus "Other" for products that are in none of them)
  const cats = useMemo(() => {
    const ok = allowedKey ? allowedKey.split('|') : null; // Free seller: only the approved categories
    const list = SHOP_COLLECTIONS.filter((c) => !ok || ok.includes(c.name)).map((c) => ({ ...c, items: live.filter((p) => productInCollection(p, c.name)) })).filter((c) => c.items.length);
    const rest = live.filter((p) => !SHOP_COLLECTIONS.some((c) => productInCollection(p, c.name)));
    if (rest.length && !ok) list.push({ name: '__other', label: 'Other', items: rest });
    return list;
  }, [live, allowedKey]);
  // one category's products grouped by sub-category (product.category), in the same order as the store menu
  const groupsOf = (cat) => {
    const order = flatSubCategories(cat.name);
    const rank = (s) => (!s ? 1e6 : order.indexOf(s) === -1 ? 1e5 : order.indexOf(s));
    const m = new Map();
    cat.items.forEach((p) => {
      const sub = p.category && p.category !== cat.name && p.category !== p.gender ? p.category : '';
      if (!m.has(sub)) m.set(sub, []);
      m.get(sub).push(p);
    });
    return [...m.entries()].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b)).map(([sub, items]) => ({ sub, items }));
  };

  const doCreate = async () => {
    setMsg(null);
    if (newName.trim().length < 2) { setMsg({ type: 'err', text: 'Write a name for your shop (at least 2 letters).' }); return; }
    setBusy(true);
    try { await createShop({ uid, email: loggedInUserEmail, name: newName, ownerName: adminName, pending: !isOwner && adminRole === 'admin' }); }
    catch (err) { setMsg({ type: 'err', text: err.code === 'permission-denied' ? 'Could not create the shop: publish the latest Firestore rules first.' : err.message }); }
    setBusy(false);
  };

  const toggle = (p) => {
    if (draft[p.id] === undefined && Object.keys(draft).length >= cap) { limitMsg(); return; }
    if (draft[p.id] === undefined && allowed && !allowed.has(catOf(p))) { setMsg({ type: 'err', text: 'On the Basic plan you can add products only from your approved categories.' }); return; }
    if (draft[p.id] === undefined && !catsOk([...Object.keys(draft), p.id])) { catMsg(); return; }
    setDraft((d) => { const n = { ...d }; if (n[p.id] !== undefined) delete n[p.id]; else n[p.id] = String(p.price); return n; });
  };
  const selectAll = (list) => {
    const free = cap - Object.keys(draft).length;
    const add = list.filter((p) => draft[p.id] === undefined);
    if (add.length && !catsOk([...Object.keys(draft), ...add.map((p) => p.id)])) { catMsg(); return; }
    if (add.length > free) limitMsg();
    setDraft((d) => { const n = { ...d }; add.slice(0, Math.max(0, free)).forEach((p) => { n[p.id] = String(p.price); }); return n; });
  };
  const clearAll = (list) => setDraft((d) => { const n = { ...d }; list.forEach((p) => { delete n[p.id]; }); return n; });

  const save = async () => {
    setMsg(null);
    const items = {};
    for (const [id, txt] of Object.entries(draft)) {
      const p = live.find((x) => String(x.id) === String(id));
      if (!p) continue;
      const w = Number(txt);
      if (!isFinite(w) || w <= 0) { setMsg({ type: 'err', text: `Type a price for "${p.name}".` }); return; }
      if (w < p.price) { setMsg({ type: 'err', text: `"${p.name}": the price cannot be lower than ${formatPrice(p.price)}.` }); return; }
      if (w > p.price + maxMarkupFor(p.price)) { setMsg({ type: 'err', text: `"${p.name}": the highest price allowed is ${formatPrice(p.price + maxMarkupFor(p.price))}.` }); return; }
      items[String(p.id)] = shopPriceClamp(p.price, w);
    }
    if (Object.keys(items).length > cap) { limitMsg(); return; }
    if (!catsOk(Object.keys(items)) && catsOf(Object.keys(items)).size > catsOf(Object.keys(savedItems)).size) { catMsg(); return; }
    const ex = { ...extras, contactUrl: cleanContact(extras.contactUrl), tagline: extras.tagline.trim().slice(0, 80), about: extras.about.trim().slice(0, 300), announcement: extras.announcement.trim().slice(0, 100),
      socialLinks: Object.fromEntries(Object.entries(extras.socialLinks).map(([k, v]) => [k, String(v || '').trim()])),
      pinnedItems: extras.pinnedItems.filter((id) => items[id] !== undefined).slice(0, 3) };
    if (extrasAllowed) {
      if (!contactOk(ex.contactUrl)) { setMsg({ type: 'err', text: 'Contact: a WhatsApp number (e.g. 01712345678) or a link starting with https://' }); return; }
      const badSocial = Object.entries(ex.socialLinks).find(([, v]) => !httpsLinkOk(v));
      if (badSocial) { setMsg({ type: 'err', text: `${badSocial[0]}: the link must start with https://` }); return; }
    }
    setBusy(true);
    try {
      // only the extras this plan may change (the rules refuse the others)
      const before = shopExtrasOf(shop);
      const FIELD_FEATURE = { tagline: 'tagline', contactUrl: 'tagline', about: 'about', socialLinks: 'social', brandColor: 'brandColor', announcement: 'announcement', pinnedItems: 'pinned' };
      const keys = Object.keys(FIELD_FEATURE).filter((k) => feat[FIELD_FEATURE[k]]);
      const changes = Object.fromEntries(keys.filter((k) => JSON.stringify(ex[k]) !== JSON.stringify(before[k])).map((k) => [k, ex[k]]));
      await saveShopItems(shop.slug, null, items, { ...(isOwner ? { planExempt: true } : {}), ...changes });
      setExtras(ex);
      setDraft(draftFrom({ items })); // what was really saved (products no longer for sale drop out)
      setMsg({ type: 'ok', text: 'Saved. Your shop link now shows these products and prices.' });
    }
    catch (err) { setMsg({ type: 'err', text: err.code === 'permission-denied' ? 'Could not save: publish the latest Firestore rules first.' : err.message }); }
    setBusy(false);
  };
  // shop name: its own Save. Checks the plan, the blocked words and that no other shop uses the name, then saves at once.
  const [nameMsg, setNameMsg] = useState(null);
  const [nameBusy, setNameBusy] = useState(false);
  const saveName = async () => {
    setNameMsg(null);
    const n = name.trim();
    if (!shop.autoName && n === String(shop.name || '').trim()) return;
    const shopTier = isOwner ? 'premium' : effectiveTier(shop);
    if (!feat.shopName) {
      setNameMsg({ type: 'err', text: shopTier === 'premium' ? 'Shop name is switched off for your shop.' : 'Upgrade to Premium to create your own website name. Until then your shop shows its link name.' });
      return;
    }
    if (n.length < 2) { setNameMsg({ type: 'err', text: 'The shop name needs at least 2 letters.' }); return; }
    if (!isOwner) {
      const bad = sellerNameBlocked(n, '', sellerRules);
      if (bad) { setNameMsg({ type: 'err', text: `Not available: "${bad}" cannot be used. Words not allowed in a shop name: ${normalizeSellerRules(sellerRules).blockedWords.join(', ')}.` }); return; }
    }
    setNameBusy(true);
    try {
      if (await shopNameTaken(n, shop.slug)) { setNameMsg({ type: 'err', text: `Not available: another shop is already called "${n}". Try another name.` }); }
      else { await saveShopName(shop.slug, n); setName(n); setNameMsg({ type: 'ok', text: `Saved: your shop now shows "${n}". Your link stays the same.` }); }
    } catch (err) { setNameMsg({ type: 'err', text: err.code === 'permission-denied' ? 'Could not save the name (plan or blocked word).' : err.message }); }
    setNameBusy(false);
  };
  // shop link name: any plan. Checks the format, the blocked words and that no other shop uses it, then saves at once.
  const [handleDraft, setHandleDraft] = useState('');
  const [handleMsg, setHandleMsg] = useState(null);
  const [handleBusy, setHandleBusy] = useState(false);
  const saveHandle = async () => {
    setHandleMsg(null);
    const h = cleanHandle(handleDraft);
    if (h === (shop.handle || '')) return;
    const next = isOwner ? 0 : nextHandleChange(shop);
    if (next > Date.now()) { setHandleMsg({ type: 'err', text: `You can change your link once in 30 days. Next change: ${new Date(next).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.` }); return; }
    if (!HANDLE_RE.test(h)) { setHandleMsg({ type: 'err', text: 'Use 3 to 30 letters: a-z, 0-9 and - (not at the start or end).' }); return; }
    if (isReservedLink(h)) { setHandleMsg({ type: 'err', text: `Not available: kyvro.store/${h} is used by the website itself. Try another one.` }); return; }
    if (!isOwner) {
      const bad = sellerNameBlocked(h, '', sellerRules);
      if (bad) { setHandleMsg({ type: 'err', text: `Not available: "${bad}" cannot be used. Not allowed: ${normalizeSellerRules(sellerRules).blockedWords.join(', ')}.` }); return; }
    }
    if (!(await askConfirm(`Change your link to kyvro.store/${h}? Your old links keep working and open the new one. You can change it again after 30 days.`, { confirmText: 'Change link' }))) return;
    setHandleBusy(true);
    try {
      if (await handleTaken(h, shop.slug)) setHandleMsg({ type: 'err', text: `Not available: kyvro.store/${h} is already taken. Try another one.` });
      else { await setShopHandle(shop, uid, h); setHandleDraft(h); setHandleMsg({ type: 'ok', text: `Saved: your link is now kyvro.store/${h}` }); }
    } catch (err) { setHandleMsg({ type: 'err', text: err.code === 'permission-denied' ? 'Not available: this link is taken or not allowed.' : err.message }); }
    setHandleBusy(false);
  };
  const discard = async () => {
    if (!(await askConfirm('Discard your unsaved changes?', { danger: true, confirmText: 'Discard' }))) return;
    setDraft(draftFrom(shop)); setName(shopDisplayName(shop) || shop.name || ''); setExtras(shopExtrasOf(shop)); setMsg(null);
  };

  const copy = async (text) => { try { await navigator.clipboard.writeText(text); setMsg({ type: 'ok', text: 'Link copied.' }); } catch { setMsg({ type: 'err', text: 'Could not copy. Select the link and copy it.' }); } };
  // Copy link + Open link (a preview: it also works for a shop that is OFF or waiting for the Owner)
  const linkBtn = 'px-3 py-1.5 rounded border border-gray-400 font-semibold text-center';
  const linkButtons = (slug, cls = linkBtn) => (
    <>
      <button type="button" onClick={() => copy(shopUrl(slug))} className={cls}>Copy link</button>
      <a href={shopUrl(slug)} target="_blank" rel="noopener noreferrer" className={cls}>Open link</a>
    </>
  );
  const flipShop = async (s) => {
    setSwitching(s.slug);
    try { await setShopActive(s.slug, s.active === false); } catch (e) { setMsg({ type: 'err', text: e.message }); }
    setSwitching('');
  };

  // ---------- Owner: all shops ----------
  // an Admin's shop request (a seller's application is approved in the Sellers tab instead)
  const teamPending = (x) => isPendingShop(x) && x.kind !== 'seller';
  const top = isOwner ? (
      <div className="space-y-5">
        <div className={card}>
          <h3 className="text-lg font-bold">Team Shops</h3>
          <p className="text-xs text-gray-500">Managers set up their own shop from their "My Shop" tab. An Admin can ask for one if you switch "Shop create" ON for them in Manage Admins; you accept or reject it here. You can make your own shop too, below. Customers who use that link see only the products the member chose, at the member's price. All payments still come to you; the markup is that member's earning (see Team Stats).</p>
          {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
          {allShops.some(teamPending) && (
            <div className="rounded border border-red-500/40 bg-red-500/5 p-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-red-500">Shop requests ({allShops.filter(teamPending).length})</p>
              <p className="text-[11px] text-gray-500">An Admin made their own shop. It stays switched off until you accept it. Reject removes it.</p>
              <div className="divide-y text-xs">
                {allShops.filter(teamPending).map((s) => (
                  <div key={s.slug} className="py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold">{s.name || s.slug} <span className="font-normal text-gray-500">· {owners[s.slug] ? (owners[s.slug].name || owners[s.slug].email) : ''}</span></p>
                      <p className="text-gray-500 break-all">{owners[s.slug] ? owners[s.slug].email : ''} · {Object.keys(s.items || {}).length} products so far</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {linkButtons(shopLinkKey(s))}
                      <button type="button" onClick={async () => { try { await acceptShop(s.slug); setMsg({ type: 'ok', text: `"${s.name}" is live now.` }); } catch (e) { setMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Could not accept: publish the latest Firestore rules first.' : e.message }); } }} className="px-3 py-1.5 rounded bg-green-600 text-white font-semibold">Accept</button>
                      <button type="button" onClick={async () => { if (!(await askConfirm(`Reject the shop "${s.name}"? It is removed and the Admin can request again.`, { danger: true, confirmText: 'Reject' }))) return; try { await rejectShop(s.slug); setMsg({ type: 'ok', text: `"${s.name}" was rejected.` }); } catch (e) { setMsg({ type: 'err', text: e.message }); } }} className="px-3 py-1.5 rounded border border-red-500 text-red-500 font-semibold">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {allShops.filter((s) => !isPendingShop(s) && s.kind !== 'seller').length === 0 ? <p className="text-sm text-gray-500">No shops yet.</p> : (
            <div className="divide-y text-xs">
              {allShops.filter((s) => !isPendingShop(s) && s.kind !== 'seller').map((s) => (
                <div key={s.slug} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{s.name || s.slug} <span className="font-normal text-gray-500">· {owners[s.slug] ? (owners[s.slug].name || owners[s.slug].email) : ''}</span></p>
                    <p className="text-gray-500 break-all">{shopUrl(shopLinkKey(s))} · {Object.keys(s.items || {}).length} products</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {linkButtons(shopLinkKey(s))}
                    <ShopSwitch on={s.active !== false} busy={switching === s.slug} onToggle={() => flipShop(s)} isDarkMode={isDarkMode} label={`Shop ${s.name || s.slug} on or off`} />
                    <button type="button" disabled={switching === s.slug} onClick={async () => {
                      if (!(await askConfirm(`Remove the shop "${s.name || s.slug}"${owners[s.slug] ? ` (${owners[s.slug].name || owners[s.slug].email})` : ''}? Its link stops working and this cannot be undone. Orders stay. Pay any markup still due first (Team Stats).`, { danger: true, confirmText: 'Remove shop' }))) return;
                      try { await rejectShop(s.slug); setMsg({ type: 'ok', text: `"${s.name || s.slug}" was removed.` }); } catch (e) { setMsg({ type: 'err', text: e.message }); }
                    }} className="px-3 py-1.5 rounded border border-red-500 text-red-500 font-semibold disabled:opacity-50">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  ) : null;

  // Owner's Team Shops page: only the Admins' shop requests here (the list of every shop is Plan Members below it)
  if (part === 'requests') {
    if (!isOwner || !allShops.some(teamPending)) return null;
    return (
      <div className={card}>
        <h3 className="text-lg font-bold">Shop requests ({allShops.filter(teamPending).length})</h3>
        <p className="text-xs text-gray-500">An Admin made their own shop. It stays switched off until you accept it. Reject removes it.</p>
        {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
        <div className="divide-y text-xs">
          {allShops.filter(teamPending).map((s) => (
            <div key={s.slug} className="py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">{s.name || s.slug} <span className="font-normal text-gray-500">· {owners[s.slug] ? (owners[s.slug].name || owners[s.slug].email) : ''}</span></p>
                <p className="text-gray-500 break-all">{owners[s.slug] ? owners[s.slug].email : ''} · {Object.keys(s.items || {}).length} products so far</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {linkButtons(shopLinkKey(s))}
                <button type="button" onClick={async () => { try { await acceptShop(s.slug); setMsg({ type: 'ok', text: `"${s.name}" is live now.` }); } catch (e) { setMsg({ type: 'err', text: e.message }); } }} className="px-3 py-1.5 rounded bg-green-600 text-white font-semibold">Accept</button>
                <button type="button" onClick={async () => { if (!(await askConfirm(`Reject the shop "${s.name}"? It is removed and the Admin can request again.`, { danger: true, confirmText: 'Reject' }))) return; try { await rejectShop(s.slug); setMsg({ type: 'ok', text: `"${s.name}" was rejected.` }); } catch (e) { setMsg({ type: 'err', text: e.message }); } }} className="px-3 py-1.5 rounded border border-red-500 text-red-500 font-semibold">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Admin: the shop links (and their own shop below, with "Shop create" ON) ----------
  const links = adminRole === 'admin' ? (
      <div className={card}>
        <h3 className="text-lg font-bold">Shops</h3>
        <p className="text-xs text-gray-500">These are the team's shop pages. Share them, keep an eye on their orders and confirm them in the Orders tab. You earn the commission shown on each product.{canCreateShop ? '' : ' Want your own shop? Ask the Owner to switch "Shop create" ON for you.'}</p>
        {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
        {allShops.filter((x) => x.active !== false && x.kind !== 'seller').length === 0 ? <p className="text-sm text-gray-500">No shops yet.</p> : (
          <div className="divide-y text-xs">
            {allShops.filter((x) => x.active !== false && x.kind !== 'seller').map((x) => (
              <div key={x.slug} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{x.name || x.slug}</p>
                  <p className="text-gray-500 break-all">{shopUrl(shopLinkKey(x))} · {Object.keys(x.items || {}).length} products</p>
                </div>
                <div className="flex flex-wrap gap-2">{linkButtons(shopLinkKey(x))}</div>
              </div>
            ))}
          </div>
        )}
      </div>
  ) : null;
  if (adminRole === 'admin' && !canCreateShop) return links;
  if (view === 'none') return null;
  // read-only: a disabled fieldset switches off every button and field (the shop switcher above it still works)
  const RO = readOnly ? ReadOnlyBox : React.Fragment;
  const show = (...ks) => view === 'all' || ks.includes(view);

  // ---------- Manager (and an Admin with "Shop create" ON) ----------
  // my own shop first, then (Owner) the Team Shops list; part 'own' leaves the list out
  const wrap = (el) => <div className="space-y-5">{el}{part !== 'own' && top}{links}</div>;
  if (shop === undefined) return wrap(<p className="text-sm text-gray-500 py-8 text-center">Loading...</p>);
  if (shop === null) {
    if (sellerMode) return null; // a seller applies in SellerDashboard
    return wrap(
      <div className={card}>
        <h3 className="text-lg font-bold">Create my shop</h3>
        <p className="text-xs text-gray-500">You get your own link, and you earn the markup. Customers who open it see the same Kyvro store, but only the products you choose, at the price you set (within the allowed limit). Everything above the store price is your earning.{!isOwner && adminRole === 'admin' ? ' Orders from your own shop earn the markup, not commission. Your shop starts switched off: the Owner gets a notification and turns it on when they accept it.' : ' Admins can share your link and confirm its orders; they earn commission, not the markup.'}</p>
        <div className="flex flex-wrap gap-2 items-center">
          <input className={`${inputCls} w-64`} placeholder="Shop name, e.g. Rupa Style" maxLength={60} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button type="button" disabled={busy} onClick={doCreate} className="bg-[#D4AF37] text-black font-bold px-5 py-2 rounded text-xs uppercase tracking-wider disabled:opacity-50">{busy ? 'Creating...' : 'Create shop'}</button>
        </div>
        {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
      </div>
    );
  }

  const count = Object.keys(draft).length;
  const open = cats.find((c) => c.name === openCat) || null;
  // a thin gold line on top of each section and a gold section title (same look as the plan cards)
  const goldLine = <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8921F] via-[#E9CB6B] to-[#B8921F]" />;
  const section = `${card} relative overflow-hidden`;
  const sectionTitle = (text, hint) => (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8921F]">{text}</p>
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
  // an extra shop (2nd / 3rd) while the paid plan has ended: hidden from customers, not deleted
  const extraHidden = sellerMode && !!shop.extra && !(toMillis(shop.paidUntil) > Date.now());
  const switchTo = async (slug) => {
    if (slug === shop.slug) return;
    if (dirty && !(await askConfirm('Switch shop? Your unsaved changes in this shop are lost.', { danger: true, confirmText: 'Switch' }))) return;
    setMsg(null); setNameMsg(null); setHandleMsg(null); choose(slug);
  };
  return wrap(
    <div className="space-y-5">
      {/* shop switcher: a seller with more than one shop (Pro 2, Premium 3) */}
      {show('products', 'manage', 'theme') && sellerMode && sortedShops.length > 1 && (
        <div className={`${card} !space-y-2`}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8921F]">My shops</p>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose the shop to edit">
            {sortedShops.map((x) => {
              const on = x.slug === shop.slug;
              const hidden = x.extra && !(toMillis(x.paidUntil) > Date.now());
              return (
                <button key={x.slug} type="button" role="tab" aria-selected={on} onClick={() => switchTo(x.slug)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition ${on ? 'border-[#D4AF37] bg-[#D4AF37] text-black' : isDarkMode ? 'border-gray-700 text-gray-300 hover:border-[#D4AF37]/60' : 'border-gray-300 text-gray-700 hover:border-[#D4AF37]/60'}`}>
                  {shopDisplayName(x)}
                  {x.status === 'pending' ? <span className="text-[10px] font-semibold opacity-70">· waiting</span> : hidden ? <span className="text-[10px] font-semibold opacity-70">· hidden</span> : x.active === false ? <span className="text-[10px] font-semibold opacity-70">· off</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <RO>
      {show('products', 'manage') && extraHidden && (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-xs text-amber-600 font-semibold">
          Your paid plan has ended, so this shop is hidden from customers (nothing is deleted). Your first shop stays on the Basic plan. Renew Pro / Premium below and this shop shows again.
        </div>
      )}
      {show('products', 'manage') && shop.warning && shop.warning.note && (
        <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-xs text-red-500">
          <p className="font-bold uppercase tracking-wider">Warning from Kyvro</p>
          <p className="mt-1 font-semibold">{shop.warning.note}</p>
          <p className="mt-1 text-[11px] opacity-80">Please fix this soon, otherwise the shop may be removed. Questions: kyvrofashion@gmail.com</p>
        </div>
      )}
      {/* seller: switch the shop ON / OFF themselves (also after Kyvro switched it off or hid it for inactivity).
          A killed shop (Page off) or one waiting for approval stays with Kyvro. */}
      {/* removed by the Owner: the reason, the last day to ask for it back, and a WhatsApp button */}
      {show('products', 'manage') && shop.removed && shop.removed.at && (() => {
        const last = new Date(Date.parse(shop.removed.at) + 30 * 86400000);
        const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Kyvro, my shop ${shop.name || ''} (kyvro.store/${shopLinkKey(shop)}) was removed. Please restore it. / আমার শপটি ফিরিয়ে দিন।`)}`;
        return (
          <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-xs text-red-600 space-y-1.5">
            <p className="font-bold text-sm">This shop was removed by Kyvro · শপটি Kyvro সরিয়ে দিয়েছে</p>
            {shop.removed.note && <p>Reason · কারণ: <strong>{shop.removed.note}</strong></p>}
            <p className="font-normal">To get it back, message Kyvro on WhatsApp before {last.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. After that it is deleted for good. · ফেরত পেতে এই তারিখের আগে WhatsApp-এ জানান।</p>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center mt-1 px-4 py-2 rounded-full bg-green-600 text-white font-bold">Ask Kyvro on WhatsApp</a>
          </div>
        );
      })()}
      {show('manage') && sellerMode && shop.status !== 'pending' && !shop.killed && !shop.removed && (
        <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${shop.active === false ? 'border-amber-500/50 bg-amber-500/10' : isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="text-xs">
            <p className="font-bold text-sm">Shop {shop.active === false ? 'OFF' : 'ON'} · শপ {shop.active === false ? 'বন্ধ' : 'চালু'}</p>
            <p className="text-gray-500 mt-0.5">{shop.active === false
              ? (shop.inactiveHold ? 'Hidden because nobody signed in for a long time. Welcome back! Switch it on to open it to customers again. · অনেকদিন লগইন না করায় শপটি লুকানো ছিল, চালু করে দিন।' : 'Customers cannot open your shop now. Switch it on any time. · কাস্টমাররা এখন শপ দেখতে পারছে না, যেকোনো সময় চালু করুন।')
              : 'Customers can open your shop. Switch it off to close it for a while (nothing is deleted). · দরকার হলে সাময়িক বন্ধ রাখুন, কিছু মুছবে না।'}</p>
          </div>
          <ShopSwitch on={shop.active !== false} busy={busy} isDarkMode={isDarkMode} label="Shop on or off"
            onToggle={async () => { if (readOnly) return; setBusy(true); try { await setMyShopLive(shop.slug, shop.active === false); setMsg({ type: 'ok', text: shop.active === false ? 'Your shop is live again.' : 'Your shop is switched off.' }); } catch (e) { setMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Could not change it. Please contact Kyvro.' : e.message }); } setBusy(false); }} />
        </div>
      )}
      {/* 1. the shop: link + name */}
      {show('manage') && <div className={section}>
        {goldLine}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-bold">My Shop{isPendingShop(shop) ? ' (waiting for the Owner)' : shop.active === false ? ' (switched off by the Owner)' : ''}</h3>
            {isPendingShop(shop) && <p className="text-xs text-amber-600 mt-1">The Owner was notified. You can already choose products and prices; the link starts working when the Owner accepts your shop.</p>}
            {shop.killed && <p className="text-xs text-red-500 mt-1 font-semibold">Kyvro switched this shop off{shop.killNote ? `: ${shop.killNote}` : ''}. It cannot be changed or switched on again. Contact kyvrofashion@gmail.com if you think this is a mistake.</p>}
            <p className="text-xs text-gray-500 break-all mt-1">{link}</p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 shrink-0">{linkButtons(shopLinkKey(shop), GOLD_BTN)}</div>
        </div>
        {/* shop link name: any plan */}
        <div>
          <label htmlFor="shop-link" className="block text-xs font-semibold text-gray-500">Shop link <span className="font-normal">(every plan)</span></label>
          <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className={`flex items-stretch w-full sm:w-auto rounded-lg border overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <span className={`px-2 flex items-center text-[11px] whitespace-nowrap ${isDarkMode ? 'bg-[#1a1a1a] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>kyvro.store/</span>
              <input id="shop-link" className={`${inputCls} !border-0 !rounded-none flex-1 min-w-0 sm:w-56 !text-sm !py-2.5`} maxLength={30} placeholder="your-shop" value={handleDraft} onChange={(e) => { setHandleDraft(cleanHandle(e.target.value)); setHandleMsg(null); }} />
            </div>
            <button type="button" disabled={handleBusy || cleanHandle(handleDraft) === (shop.handle || '')} onClick={saveHandle} className={`${GOLD_BTN} w-full sm:w-auto`}>{handleBusy ? 'Checking...' : 'Save link'}</button>
          </div>
          {handleMsg
            ? <p className={`mt-1 text-[11px] ${handleMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{handleMsg.text}</p>
            : <p className="mt-1 text-[11px] text-gray-500">3 to 30 letters (a-z, 0-9, -), saved only if no other shop uses it. Change it once in 30 days; old links keep working.{!isOwner && nextHandleChange(shop) > Date.now() ? ` Next change: ${new Date(nextHandleChange(shop)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.` : ''}</p>}
        </div>
        {/* shop name shown on the website: Premium */}
        <div>
          <label htmlFor="shop-name" className="block text-xs font-semibold text-gray-500">Create Website Name <span className="font-normal">{feat.shopName ? '' : '🔒 Premium'}</span></label>
          <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
            <input id="shop-name" disabled={!feat.shopName} className={`${inputCls} w-full sm:w-80 !text-sm !py-2.5 !rounded-lg disabled:opacity-60`} maxLength={60} value={feat.shopName ? name : shopDisplayName(shop)} onChange={(e) => { setName(e.target.value); setNameMsg(null); }} />
            <button type="button" disabled={nameBusy || !feat.shopName || (!shop.autoName && name.trim() === String(shop.name || '').trim())} onClick={saveName} className={`${GOLD_BTN} w-full sm:w-auto`}>{nameBusy ? 'Checking...' : 'Save name'}</button>
          </div>
          {nameMsg
            ? <p className={`mt-1 text-[11px] ${nameMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{nameMsg.text}</p>
            : <p className="mt-1 text-[11px] text-gray-500">{feat.shopName ? 'Shown on top of your shop and in "Sold by". It shows at once.' : 'Your shop shows its link name. Upgrade to Premium to create your own website name.'}</p>}
        </div>
        {/* the Owner removes their own shop (only the Owner may delete shops; its link is freed, orders stay) */}
        {isOwner && !sellerMode && !readOnly && (
          <div className="pt-4 mt-2 border-t border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-gray-500">Remove this shop and its link for good. Orders stay. You can create a new shop afterwards.</p>
            <button type="button" disabled={busy} onClick={async () => {
              if (!(await askConfirm(`Remove your shop "${shop.name || shop.slug}"? Its link kyvro.store/${shopLinkKey(shop)} stops working and this cannot be undone. Orders stay.`, { danger: true, confirmText: 'Remove shop' }))) return;
              setBusy(true);
              try { await rejectShop(shop.slug); setMsg({ type: 'ok', text: 'Your shop was removed.' }); } catch (e) { setMsg({ type: 'err', text: e.message }); }
              setBusy(false);
            }} className="shrink-0 px-4 py-2 rounded border border-red-500 text-red-500 text-xs font-bold uppercase tracking-wider hover:bg-red-500/10 disabled:opacity-50">Remove my shop</button>
          </div>
        )}
      </div>}

      {/* 2. products and prices */}
      {show('products') && <div className={section}>
        {goldLine}
        {sectionTitle('Products in my shop', 'Open a category to choose its products. Your ticks are kept until you press Save.')}
        <p className="text-[11px] text-gray-500">Customers who open your link see only the products you tick, at the price you type (up to the limit shown for each product). Everything above the store price is yours when the order is delivered. Payments and delivery stay with the store.</p>
        {lockedCount > 0 && (
          <div className="rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span><strong>🔒 {lockedCount} product{lockedCount === 1 ? ' is' : 's are'} locked.</strong> Your plan is Basic now, so customers see only your {plans.freeLimit} best sellers. The locked ones are kept (marked 🔒 below). <span className="opacity-80">· প্ল্যান Basic হওয়ায় {lockedCount}টি পণ্য লক আছে; আপগ্রেড করলে আবার দেখাবে।</span></span>
            {upgradeBtn()}
          </div>
        )}
        {cats.length === 0 ? <p className="text-sm text-gray-500">No live products yet.</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {cats.map((c) => {
              const on = c.items.filter((p) => draft[p.id] !== undefined).length;
              const active = openCat === c.name;
              return (
                <button key={c.name} type="button" aria-expanded={active} onClick={() => setOpenCat(active ? '' : c.name)}
                  className={`text-left rounded-xl border p-3 transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${active ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_0_1px_rgba(212,175,55,0.4)]' : isDarkMode ? 'border-gray-800 bg-[#121212] hover:border-[#D4AF37]/50' : 'border-gray-200 bg-gray-50 hover:border-[#D4AF37]/60'}`}>
                  <p className="text-sm font-bold truncate">{c.label}</p>
                  <p className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${on > 0 ? 'bg-[#D4AF37] text-black' : isDarkMode ? 'bg-[#222] text-gray-400' : 'bg-gray-200 text-gray-600'}`}>{on} / {c.items.length} selected</span>
                    <span className={`text-[#D4AF37] transition-transform duration-150 ${active ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {open && (
          <div className={`rounded-xl border p-3 sm:p-4 space-y-3 ${isDarkMode ? 'border-[#D4AF37]/30 bg-[#121212]' : 'border-[#D4AF37]/40 bg-[#D4AF37]/5'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#B8921F]">{open.label}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => selectAll(open.items)} className={`${OUTLINE_BTN} !px-3 !py-1.5 !text-[11px]`}>Select all</button>
                <button type="button" onClick={() => clearAll(open.items)} className={`${GHOST_BTN} !px-3 !py-1.5 !text-[11px]`}>Clear</button>
              </div>
            </div>
            {groupsOf(open).map((g) => (
              <div key={g.sub || '_'}>
                {(g.sub || groupsOf(open).length > 1) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{g.sub ? subLabel(g.sub) : 'Other'} <span className="font-normal">({g.items.filter((p) => draft[p.id] !== undefined).length} / {g.items.length})</span></p>
                    <div className="flex gap-3 text-[11px]">
                      <button type="button" onClick={() => selectAll(g.items)} className="text-[#B8921F] font-semibold hover:underline">Select all</button>
                      <button type="button" onClick={() => clearAll(g.items)} className="text-gray-500 font-semibold hover:underline">Clear</button>
                    </div>
                  </div>
                )}
                <div className="divide-y divide-gray-500/15 text-xs">
                  {g.items.map((p) => {
                    const on = draft[p.id] !== undefined;
                    const max = p.price + maxMarkupFor(p.price);
                    const val = Number(draft[p.id]);
                    const locked = isLocked(p.id);
                    return (
                      <div key={p.id} className={`py-3 flex flex-wrap sm:flex-nowrap items-center gap-3 ${locked ? 'opacity-70' : ''}`}>
                        <input type="checkbox" checked={on} onChange={() => toggle(p)} className="accent-[#D4AF37] w-5 h-5 shrink-0" aria-label={`Sell ${p.name}`} />
                        {p.image && <img src={p.image} alt="" className="w-12 h-12 object-cover rounded-lg border shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold line-clamp-2 sm:truncate">{locked && <span className="mr-1" title="Locked: customers do not see it on the Basic plan">🔒</span>}{p.name}</p>
                          <p className="text-gray-500">Store price {formatPrice(p.price)} · highest you can sell for {formatPrice(max)}</p>
                          {locked && <p className="mt-1 flex flex-wrap items-center gap-2 text-[#B8921F] font-semibold">Locked · customers cannot see it on Basic {upgradeBtn('Unlock')}</p>}
                        </div>
                        {on && (
                          <div className="w-full sm:w-auto sm:text-right pl-8 sm:pl-0">
                            <input type="number" inputMode="numeric" className={`${inputCls} w-full sm:w-28 sm:text-right !text-sm !rounded-lg`} value={draft[p.id]} onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))} aria-label={`Your price for ${p.name}`} />
                            <p className={`mt-1 ${val > max || val < p.price ? 'text-red-500' : 'text-green-600'}`}>{val > max ? `Too high (max ${formatPrice(max)})` : val < p.price ? 'Below store price' : `Your earning ${formatPrice(Math.max(0, val - p.price))} per piece`}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* 3. the shop page: Pro / Premium parts first, Premium-only last */}
      {show('manage', 'theme') && <div className={section}>
        {goldLine}
        {view === 'theme' ? sectionTitle('Theme', 'Saved with "Save my shop".') : sectionTitle('Shop page', 'Saved with "Save my shop" (logo and banner upload right away and wait for approval).')}
        <ShopExtrasEditor only={view === 'theme' ? 'theme' : ''} extras={extras} setExtras={setExtras} feat={feat} shop={shop} tier={isOwner ? 'premium' : effectiveTier(shop)} shopName={name} link={link}
          pinChoices={live.filter((p) => draft[p.id] !== undefined)} isDarkMode={isDarkMode} inputCls={inputCls} />
      </div>}

      {/* 4. my plan */}
      {show('plan') && !isOwner && showPlan && plans.enabled && (
        <div className={section}>
          {goldLine}
          {paidUntil > 0 && (daysLeft <= 0 || daysLeft <= plans.reminderDays) && (
            <div className={`rounded-xl border p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${daysLeft <= 0 ? 'border-red-500/50 bg-red-500/10 text-red-500' : 'border-amber-500/50 bg-amber-500/10 text-amber-600'}`}>
              <span className="font-semibold">{daysLeft <= 0 ? `Your paid plan ended on ${fmtDate(paidUntil)}. Your shop now shows only its ${plans.freeLimit} best sellers; the others are locked (🔒, kept, not deleted) until you renew.` : `Your paid plan ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${fmtDate(paidUntil)}).`}</span>
              <button type="button" disabled={!!paying} onClick={() => buyPlan(sub && sub.tier === 'premium' ? 'premium' : 'pro')} className={`${GOLD_BTN} !py-1.5`}>{paying ? 'Opening...' : 'Renew'}</button>
            </div>
          )}
          {basicNeed && (basicLate || (basicDays !== null && basicDays <= plans.reminderDays)) && (
            <div className={`rounded-xl border p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${basicLate ? 'border-red-500/50 bg-red-500/10 text-red-500' : 'border-amber-500/50 bg-amber-500/10 text-amber-600'}`}>
              <span className="font-semibold">{basicLate
                ? (basicUntil ? `Your Basic plan ended on ${fmtDate(basicUntil)}. Your store is closed to customers (nothing is deleted). Renew Basic (${formatPrice(basicPrice(plans))} / ${plans.periodDays} days) to open it again.` : `Pay Basic (${formatPrice(basicPrice(plans))} / ${plans.periodDays} days) to open your store to customers.`)
                : `Your Basic plan ends in ${basicDays} day${basicDays === 1 ? '' : 's'} (${fmtDate(basicUntil)}).`}</span>
              <button type="button" disabled={!!paying} onClick={() => buyPlan('basic')} className={`${GOLD_BTN} !py-1.5`}>{paying ? 'Opening...' : basicUntil ? 'Renew Basic' : 'Pay Basic'}</button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8921F]">My plan</p>
              <p className="text-xl font-bold">{tier === 'free' ? 'Basic' : <span className="text-[#D4AF37]">{TIER_LABEL[tier]}</span>}</p>
            </div>
            <p className="text-xs text-gray-500">{paid ? `All products · paid until ${fmtDate(paidUntil)}` : basicNeed && !basicLate && basicUntil ? `Basic paid until ${fmtDate(basicUntil)} · ${count} / ${plans.freeLimit} products` : `${count} / ${plans.freeLimit} products · ${catsOf(Object.keys(draft)).size} / ${plans.freeCategoryLimit} categories`}</p>
          </div>
          <PlanCards plans={plans} formatPrice={formatPrice} isDarkMode={isDarkMode} mode="upgrade" currentTier={tier} busy={paying === 'basic' ? 'free' : paying} basicPay={basicNeed ? (basicUntil ? 'Renew Basic' : 'Pay Basic') : ''} onChoose={(t) => (t === 'free' ? basicNeed && buyPlan('basic') : buyPlan(t))} />
          {tier !== 'free' && <p className="text-[11px] text-gray-500 text-center">Renewing or upgrading adds {plans.periodDays} days to your current end date.</p>}
          {/* under every Pay / Renew button of this page (plan cards and the renew notices above) */}
          <p className="text-[11px] text-gray-500 text-center">Plan fees are non-refundable. · <span lang="bn">প্ল্যানের ফি ফেরতযোগ্য নয়।</span></p>
        </div>
      )}

      {/* stays at the bottom of the screen: nothing is written until Save */}
      </RO>
      {show('products', 'manage', 'theme') && !readOnly && <div className={`sticky bottom-2 sm:bottom-3 z-20 rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur shadow-[0_8px_30px_-10px_rgba(0,0,0,0.5)] ${dirty ? 'border-[#D4AF37]' : isDarkMode ? 'border-gray-800' : 'border-gray-200'} ${isDarkMode ? 'bg-[#0d0d0d]/95' : 'bg-white/95'}`}>
        <div className="min-w-0 text-xs">
          <p className="font-bold text-sm">{cap < SHOP_MAX_ITEMS ? `Selected ${count} / ${cap}` : `${count} product${count === 1 ? '' : 's'} selected`}</p>
          {allowed && <p className="text-[11px] text-gray-500">Basic plan: from your approved categories ({appCats.join(', ')})</p>}
          {msg ? <p className={msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}>{msg.text}</p> : <p className="text-gray-500">{dirty ? 'Unsaved changes' : 'All changes saved'}</p>}
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <button type="button" disabled={busy || !dirty} onClick={discard} className={GHOST_BTN}>Discard</button>
          <button type="button" disabled={busy || !dirty || !!shop.killed} onClick={save} className={GOLD_BTN}>{busy ? 'Saving...' : 'Save my shop'}</button>
        </div>
      </div>}
    </div>
  );
}
