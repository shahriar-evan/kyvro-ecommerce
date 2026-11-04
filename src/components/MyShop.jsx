import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import { watchMyShop, watchAllShops, watchShopOwners, createShop, saveShopItems, setShopActive, isPendingShop, acceptShop, rejectShop } from '../shops';
import { askConfirm } from './AlertCenter';
import { maxMarkupFor, shopPriceClamp, SHOP_COLLECTIONS, productInCollection } from '../data/shopConfig';
import { flatSubCategories, subLabel } from '../data/catalog';

const shopUrl = (slug) => `${window.location.origin}/?shop=${slug}`;

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

// "My Shop": every Manager gets their own link (kyvro.store/?shop=name). They choose which products to show
// (by collection or one by one) and the price they sell at, up to the limit for that product. The whole markup is theirs.
// An Admin the Owner switched "Shop create" ON for can make one too: it stays switched off until the Owner accepts it.
// Payments (online, delivery charge, cash on delivery) all stay with the store; the Owner pays the markup out later.
export default function MyShop({ canCreateShop = false, adminRole, products, isOwner, isDarkMode, formatPrice, adminName, loggedInUserEmail, onDirtyChange }) {
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

  const uid = auth.currentUser ? auth.currentUser.uid : '';
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
    return watchMyShop(uid, (s) => setShop(s), () => setShop(null));
  }, [isOwner, adminRole, uid, canCreateShop]);

  // the saved shop as an editable draft: loaded once per shop, again after Discard
  const draftFrom = (s) => { const d = {}; Object.entries((s && s.items) || {}).forEach(([id, p]) => { d[id] = String(p); }); return d; };
  const [loadedFor, setLoadedFor] = useState('');
  useEffect(() => {
    if (shop && loadedFor !== shop.slug) {
      setDraft(draftFrom(shop)); setName(shop.name || ''); setLoadedFor(shop.slug);
    }
  }, [shop, loadedFor]);

  // unsaved = the ticks, prices or name differ from what is saved in Firestore
  const savedItems = (shop && shop.items) || {};
  const dirty = !!shop && (
    name !== (shop.name || '')
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

  const live = useMemo(() => products.filter((p) => (p.status || 'approved') === 'approved'), [products]);
  const link = shop ? shopUrl(shop.slug) : '';
  const card = `p-5 sm:p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const inputCls = `border p-2 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;

  // main categories that have products (plus "Other" for products that are in none of them)
  const cats = useMemo(() => {
    const list = SHOP_COLLECTIONS.map((c) => ({ ...c, items: live.filter((p) => productInCollection(p, c.name)) })).filter((c) => c.items.length);
    const rest = live.filter((p) => !SHOP_COLLECTIONS.some((c) => productInCollection(p, c.name)));
    if (rest.length) list.push({ name: '__other', label: 'Other', items: rest });
    return list;
  }, [live]);
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

  const toggle = (p) => setDraft((d) => { const n = { ...d }; if (n[p.id] !== undefined) delete n[p.id]; else n[p.id] = String(p.price); return n; });
  const selectAll = (list) => setDraft((d) => { const n = { ...d }; list.forEach((p) => { if (n[p.id] === undefined) n[p.id] = String(p.price); }); return n; });
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
    setBusy(true);
    try {
      await saveShopItems(shop.slug, name, items);
      setDraft(draftFrom({ items })); // what was really saved (products no longer for sale drop out)
      setMsg({ type: 'ok', text: 'Saved. Your shop link now shows these products and prices.' });
    }
    catch (err) { setMsg({ type: 'err', text: err.code === 'permission-denied' ? 'Could not save: publish the latest Firestore rules first.' : err.message }); }
    setBusy(false);
  };
  const discard = async () => {
    if (!(await askConfirm('Discard your unsaved changes?', { danger: true, confirmText: 'Discard' }))) return;
    setDraft(draftFrom(shop)); setName(shop.name || ''); setMsg(null);
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
  const top = isOwner ? (
      <div className="space-y-5">
        <div className={card}>
          <h3 className="text-lg font-bold">Team Shops</h3>
          <p className="text-xs text-gray-500">Managers set up their own shop from their "My Shop" tab. An Admin can ask for one if you switch "Shop create" ON for them in Manage Admins; you accept or reject it here. You can make your own shop too, below. Customers who use that link see only the products the member chose, at the member's price. All payments still come to you; the markup is that member's earning (see Team Stats).</p>
          {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
          {allShops.some(isPendingShop) && (
            <div className="rounded border border-red-500/40 bg-red-500/5 p-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-red-500">Shop requests ({allShops.filter(isPendingShop).length})</p>
              <p className="text-[11px] text-gray-500">An Admin made their own shop. It stays switched off until you accept it. Reject removes it.</p>
              <div className="divide-y text-xs">
                {allShops.filter(isPendingShop).map((s) => (
                  <div key={s.slug} className="py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold">{s.name || s.slug} <span className="font-normal text-gray-500">· {owners[s.slug] ? (owners[s.slug].name || owners[s.slug].email) : ''}</span></p>
                      <p className="text-gray-500 break-all">{owners[s.slug] ? owners[s.slug].email : ''} · {Object.keys(s.items || {}).length} products so far</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {linkButtons(s.slug)}
                      <button type="button" onClick={async () => { try { await acceptShop(s.slug); setMsg({ type: 'ok', text: `"${s.name}" is live now.` }); } catch (e) { setMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Could not accept: publish the latest Firestore rules first.' : e.message }); } }} className="px-3 py-1.5 rounded bg-green-600 text-white font-semibold">Accept</button>
                      <button type="button" onClick={async () => { if (!(await askConfirm(`Reject the shop "${s.name}"? It is removed and the Admin can request again.`, { danger: true, confirmText: 'Reject' }))) return; try { await rejectShop(s.slug); setMsg({ type: 'ok', text: `"${s.name}" was rejected.` }); } catch (e) { setMsg({ type: 'err', text: e.message }); } }} className="px-3 py-1.5 rounded border border-red-500 text-red-500 font-semibold">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {allShops.filter((s) => !isPendingShop(s)).length === 0 ? <p className="text-sm text-gray-500">No shops yet.</p> : (
            <div className="divide-y text-xs">
              {allShops.filter((s) => !isPendingShop(s)).map((s) => (
                <div key={s.slug} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{s.name || s.slug} <span className="font-normal text-gray-500">· {owners[s.slug] ? (owners[s.slug].name || owners[s.slug].email) : ''}</span></p>
                    <p className="text-gray-500 break-all">{shopUrl(s.slug)} · {Object.keys(s.items || {}).length} products</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {linkButtons(s.slug)}
                    <ShopSwitch on={s.active !== false} busy={switching === s.slug} onToggle={() => flipShop(s)} isDarkMode={isDarkMode} label={`Shop ${s.name || s.slug} on or off`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  ) : null;

  // ---------- Admin: the shop links (and their own shop below, with "Shop create" ON) ----------
  const links = adminRole === 'admin' ? (
      <div className={card}>
        <h3 className="text-lg font-bold">Shops</h3>
        <p className="text-xs text-gray-500">These are the team's shop pages. Share them, keep an eye on their orders and confirm them in the Orders tab. You earn the commission shown on each product.{canCreateShop ? '' : ' Want your own shop? Ask the Owner to switch "Shop create" ON for you.'}</p>
        {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
        {allShops.filter((x) => x.active !== false).length === 0 ? <p className="text-sm text-gray-500">No shops yet.</p> : (
          <div className="divide-y text-xs">
            {allShops.filter((x) => x.active !== false).map((x) => (
              <div key={x.slug} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{x.name || x.slug}</p>
                  <p className="text-gray-500 break-all">{shopUrl(x.slug)} · {Object.keys(x.items || {}).length} products</p>
                </div>
                <div className="flex flex-wrap gap-2">{linkButtons(x.slug)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
  ) : null;
  if (adminRole === 'admin' && !canCreateShop) return links;

  // ---------- Manager (and an Admin with "Shop create" ON) ----------
  const wrap = (el) => <div className="space-y-5">{top}{el}{links}</div>;
  if (shop === undefined) return wrap(<p className="text-sm text-gray-500 py-8 text-center">Loading...</p>);
  if (shop === null) {
    return wrap(
      <div className={card}>
        <h3 className="text-lg font-bold">Create my shop</h3>
        <p className="text-xs text-gray-500">You get your own link, and you earn the markup. Customers who open it see the same Kyvro store, but only the products you choose, at the price you set (within the allowed limit). Everything above the store price is your earning.{!isOwner && adminRole === 'admin' ? ' Orders from your own shop earn the markup, not commission. Your shop starts switched off: the Owner gets a notification and turns it on when they accept it.' : ' Admins can share your link and confirm its orders; they earn commission, not the markup.'}</p>
        <div className="flex flex-wrap gap-2 items-center">
          <input className={`${inputCls} w-64`} placeholder="Shop name, e.g. Rahim Fashion" maxLength={60} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button type="button" disabled={busy} onClick={doCreate} className="bg-[#D4AF37] text-black font-bold px-5 py-2 rounded text-xs uppercase tracking-wider disabled:opacity-50">{busy ? 'Creating...' : 'Create shop'}</button>
        </div>
        {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
      </div>
    );
  }

  const count = Object.keys(draft).length;
  const open = cats.find((c) => c.name === openCat) || null;
  const goldBtn = 'px-4 py-2 rounded bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider text-center';
  return wrap(
    <div className="space-y-5">
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold">My Shop{isPendingShop(shop) ? ' (waiting for the Owner)' : shop.active === false ? ' (switched off by the Owner)' : ''}</h3>
            {isPendingShop(shop) && <p className="text-xs text-amber-600 mt-1">The Owner was notified. You can already choose products and prices; the link starts working when the Owner accepts your shop.</p>}
            <p className="text-xs text-gray-500 break-all mt-1">{link}</p>
          </div>
          <div className="flex flex-wrap gap-2">{linkButtons(shop.slug, goldBtn)}</div>
        </div>
        <label className="block text-xs font-semibold text-gray-500">Shop name
          <input className={`${inputCls} block mt-1 w-full sm:w-72`} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <p className="text-[11px] text-gray-500">Customers who open your link see only the products you tick below, at the price you type. The price can be higher than the store price by the limit shown for each product. Everything above the store price is yours when the order is delivered. Payments and delivery stay with the store.</p>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider">Products in my shop</p>
          <p className="text-[11px] text-gray-500">Open a category to choose its products. Your ticks are kept until you press Save.</p>
        </div>
        {cats.length === 0 ? <p className="text-sm text-gray-500">No live products yet.</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {cats.map((c) => {
              const on = c.items.filter((p) => draft[p.id] !== undefined).length;
              const active = openCat === c.name;
              return (
                <button key={c.name} type="button" aria-expanded={active} onClick={() => setOpenCat(active ? '' : c.name)}
                  className={`text-left rounded-lg border p-3 transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${active ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_0_1px_rgba(212,175,55,0.4)]' : isDarkMode ? 'border-gray-800 bg-[#121212] hover:border-gray-600' : 'border-gray-200 bg-gray-50 hover:border-gray-400'}`}>
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
          <div className={`rounded-lg border p-3 sm:p-4 space-y-3 ${isDarkMode ? 'border-[#D4AF37]/30 bg-[#121212]' : 'border-[#D4AF37]/40 bg-[#D4AF37]/5'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#D4AF37]">{open.label}</p>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => selectAll(open.items)} className="px-3 py-1.5 rounded border border-green-600 text-green-600 font-semibold">Select all</button>
                <button type="button" onClick={() => clearAll(open.items)} className="px-3 py-1.5 rounded border border-red-500 text-red-500 font-semibold">Clear</button>
              </div>
            </div>
            {groupsOf(open).map((g) => (
              <div key={g.sub || '_'}>
                {(g.sub || groupsOf(open).length > 1) && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{g.sub ? subLabel(g.sub) : 'Other'} <span className="font-normal">({g.items.filter((p) => draft[p.id] !== undefined).length} / {g.items.length})</span></p>
                    <div className="flex gap-3 text-[11px]">
                      <button type="button" onClick={() => selectAll(g.items)} className="text-green-600 font-semibold">Select all</button>
                      <button type="button" onClick={() => clearAll(g.items)} className="text-red-500 font-semibold">Clear</button>
                    </div>
                  </div>
                )}
                <div className="divide-y text-xs">
                  {g.items.map((p) => {
                    const on = draft[p.id] !== undefined;
                    const max = p.price + maxMarkupFor(p.price);
                    const val = Number(draft[p.id]);
                    return (
                      <div key={p.id} className="py-3 flex flex-wrap items-center gap-3">
                        <input type="checkbox" checked={on} onChange={() => toggle(p)} className="accent-[#D4AF37] w-4 h-4" />
                        {p.image && <img src={p.image} alt="" className="w-10 h-10 object-cover rounded border" />}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{p.name}</p>
                          <p className="text-gray-500">Store price {formatPrice(p.price)} · highest you can sell for {formatPrice(max)}</p>
                        </div>
                        {on && (
                          <div className="text-right">
                            <input type="number" className={`${inputCls} w-28 text-right`} value={draft[p.id]} onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))} />
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
      </div>

      {/* stays at the bottom of the screen: nothing is written until Save */}
      <div className={`sticky bottom-3 z-20 rounded-lg border px-4 py-3 flex flex-wrap items-center justify-between gap-3 backdrop-blur shadow-[0_8px_30px_-10px_rgba(0,0,0,0.5)] ${dirty ? 'border-[#D4AF37]' : isDarkMode ? 'border-gray-800' : 'border-gray-200'} ${isDarkMode ? 'bg-[#0d0d0d]/95' : 'bg-white/95'}`}>
        <div className="min-w-0 text-xs">
          <p className="font-bold">{count} product{count === 1 ? '' : 's'} selected</p>
          {msg ? <p className={msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}>{msg.text}</p> : <p className="text-gray-500">{dirty ? 'Unsaved changes' : 'All changes saved'}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={busy || !dirty} onClick={discard} className="px-4 py-2.5 rounded border border-gray-400 text-xs font-bold uppercase tracking-wider disabled:opacity-40">Discard</button>
          <button type="button" disabled={busy || !dirty} onClick={save} className="bg-gradient-to-b from-[#E9CB6B] via-[#D4AF37] to-[#B8921F] text-black font-bold px-6 py-2.5 rounded text-xs uppercase tracking-widest shadow disabled:opacity-40">{busy ? 'Saving...' : 'Save my shop'}</button>
        </div>
      </div>
    </div>
  );
}
