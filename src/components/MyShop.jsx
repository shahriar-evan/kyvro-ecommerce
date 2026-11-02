import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import { watchMyShop, watchAllShops, watchShopOwners, createShop, saveShopItems, setShopActive } from '../shops';
import { maxMarkupFor, shopPriceClamp, SHOP_COLLECTIONS, productInCollection } from '../data/shopConfig';

// "My Shop": every Manager gets their own link (kyvro.store/?shop=name). They choose which products to show
// (by collection or one by one) and the price they sell at, up to the limit for that product. The whole markup is theirs.
// Payments (online, delivery charge, cash on delivery) all stay with the store; the Owner pays the markup out later.
export default function MyShop({ adminRole, products, isOwner, isDarkMode, formatPrice, adminName, loggedInUserEmail }) {
  const [shop, setShop] = useState(undefined); // undefined = loading, null = none yet
  const [draft, setDraft] = useState({}); // productId -> price text (only the products that are in the shop)
  const [name, setName] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [allShops, setAllShops] = useState([]);
  const [owners, setOwners] = useState({});

  const uid = auth.currentUser ? auth.currentUser.uid : '';
  useEffect(() => {
    if (isOwner) {
      const a = watchAllShops(setAllShops, () => {});
      const b = watchShopOwners(setOwners, () => {});
      return () => { a(); b(); };
    }
    if (adminRole === 'admin') return watchAllShops(setAllShops, () => {}); // Admins only see the shop links (read only)
    if (!uid) { setShop(null); return undefined; }
    return watchMyShop(uid, (s) => setShop(s), () => setShop(null));
  }, [isOwner, adminRole, uid]);

  // load the saved shop into the editable draft (once per shop, and again after saving)
  const [loadedFor, setLoadedFor] = useState('');
  useEffect(() => {
    if (shop && loadedFor !== shop.slug) {
      const d = {};
      Object.entries(shop.items || {}).forEach(([id, p]) => { d[id] = String(p); });
      setDraft(d); setName(shop.name || ''); setLoadedFor(shop.slug);
    }
  }, [shop, loadedFor]);

  const live = useMemo(() => products.filter((p) => (p.status || 'approved') === 'approved'), [products]);
  const link = shop ? `${window.location.origin}/?shop=${shop.slug}` : '';
  const card = `p-5 sm:p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const inputCls = `border p-2 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;

  const doCreate = async () => {
    setMsg(null);
    if (newName.trim().length < 2) { setMsg({ type: 'err', text: 'Write a name for your shop (at least 2 letters).' }); return; }
    setBusy(true);
    try { await createShop({ uid, email: loggedInUserEmail, name: newName, ownerName: adminName }); }
    catch (err) { setMsg({ type: 'err', text: err.code === 'permission-denied' ? 'Could not create the shop: publish the latest Firestore rules first.' : err.message }); }
    setBusy(false);
  };

  const toggle = (p) => setDraft((d) => { const n = { ...d }; if (n[p.id] !== undefined) delete n[p.id]; else n[p.id] = String(p.price); return n; });
  const addAll = (col) => setDraft((d) => { const n = { ...d }; live.filter((p) => productInCollection(p, col)).forEach((p) => { if (n[p.id] === undefined) n[p.id] = String(p.price); }); return n; });
  const removeAll = (col) => setDraft((d) => { const n = { ...d }; live.filter((p) => productInCollection(p, col)).forEach((p) => { delete n[p.id]; }); return n; });

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
    try { await saveShopItems(shop.slug, name, items); setMsg({ type: 'ok', text: 'Saved. Your shop link now shows these products and prices.' }); }
    catch (err) { setMsg({ type: 'err', text: err.code === 'permission-denied' ? 'Could not save: publish the latest Firestore rules first.' : err.message }); }
    setBusy(false);
  };

  const copy = async (text) => { try { await navigator.clipboard.writeText(text); setMsg({ type: 'ok', text: 'Link copied.' }); } catch { setMsg({ type: 'err', text: 'Could not copy. Select the link and copy it.' }); } };

  // ---------- Owner: all shops ----------
  if (isOwner) {
    return (
      <div className="space-y-5">
        <div className={card}>
          <h3 className="text-lg font-bold">Team Shops</h3>
          <p className="text-xs text-gray-500">Every Admin and Manager can open their own shop link from their own "My Shop" tab. Customers who use that link see only the products the member chose, at the member's price. All payments still come to you; the markup is that member's earning (see Team Stats).</p>
          {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
          {allShops.length === 0 ? <p className="text-sm text-gray-500">No shops yet.</p> : (
            <div className="divide-y text-xs">
              {allShops.map((s) => (
                <div key={s.slug} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{s.name || s.slug} <span className="font-normal text-gray-500">· {owners[s.slug] ? (owners[s.slug].name || owners[s.slug].email) : ''}</span></p>
                    <p className="text-gray-500 break-all">{window.location.origin}/?shop={s.slug} · {Object.keys(s.items || {}).length} products</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => copy(`${window.location.origin}/?shop=${s.slug}`)} className="px-3 py-1.5 rounded border border-gray-400 font-semibold">Copy link</button>
                    <button type="button" onClick={async () => { try { await setShopActive(s.slug, s.active === false); } catch (e) { setMsg({ type: 'err', text: e.message }); } }} className={`px-3 py-1.5 rounded font-semibold ${s.active === false ? 'bg-gray-400 text-white' : 'bg-green-600 text-white'}`}>{s.active === false ? 'OFF' : 'ON'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- Admin: only the shop links, nothing to set up ----------
  if (adminRole === 'admin') {
    return (
      <div className={card}>
        <h3 className="text-lg font-bold">Shops</h3>
        <p className="text-xs text-gray-500">These are the shop pages the Managers set up. Share them, keep an eye on their orders and confirm them in the Orders tab. Setting up a shop (choosing products and prices) is done by Managers. You earn the commission shown on each product.</p>
        {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
        {allShops.filter((x) => x.active !== false).length === 0 ? <p className="text-sm text-gray-500">No shops yet.</p> : (
          <div className="divide-y text-xs">
            {allShops.filter((x) => x.active !== false).map((x) => (
              <div key={x.slug} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{x.name || x.slug}</p>
                  <p className="text-gray-500 break-all">{window.location.origin}/?shop={x.slug} · {Object.keys(x.items || {}).length} products</p>
                </div>
                <button type="button" onClick={() => copy(`${window.location.origin}/?shop=${x.slug}`)} className="px-3 py-1.5 rounded border border-gray-400 font-semibold">Copy link</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- Manager ----------
  if (shop === undefined) return <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>;
  if (shop === null) {
    return (
      <div className={card}>
        <h3 className="text-lg font-bold">Create my shop</h3>
        <p className="text-xs text-gray-500">You get your own link, and you earn the markup. Customers who open it see the same Kyvro store, but only the products you choose, at the price you set (within the allowed limit). Everything above the store price is your earning. Admins can share your link and confirm its orders; they earn commission, not the markup.</p>
        <div className="flex flex-wrap gap-2 items-center">
          <input className={`${inputCls} w-64`} placeholder="Shop name, e.g. Rahim Fashion" maxLength={60} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button type="button" disabled={busy} onClick={doCreate} className="bg-[#D4AF37] text-black font-bold px-5 py-2 rounded text-xs uppercase tracking-wider disabled:opacity-50">{busy ? 'Creating...' : 'Create shop'}</button>
        </div>
        {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
      </div>
    );
  }

  const count = Object.keys(draft).length;
  return (
    <div className="space-y-5">
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold">My Shop{shop.active === false ? ' (switched off by the Owner)' : ''}</h3>
            <p className="text-xs text-gray-500 break-all mt-1">{link}</p>
          </div>
          <button type="button" onClick={() => copy(link)} className="px-4 py-2 rounded bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider">Copy link</button>
        </div>
        <label className="block text-xs font-semibold text-gray-500">Shop name
          <input className={`${inputCls} block mt-1 w-full sm:w-72`} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <p className="text-[11px] text-gray-500">Customers who open your link see only the products you tick below, at the price you type. The price can be higher than the store price by the limit shown for each product. Everything above the store price is yours when the order is delivered. Payments and delivery stay with the store.</p>
      </div>

      <div className={card}>
        <p className="text-xs font-bold uppercase tracking-wider">Categories</p>
        <div className="flex flex-wrap gap-2">
          {SHOP_COLLECTIONS.map((c) => {
            const list = live.filter((p) => productInCollection(p, c.name));
            if (!list.length) return null;
            const on = list.filter((p) => draft[p.id] !== undefined).length;
            return (
              <span key={c.name} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs">
                <strong>{c.label}</strong> <span className="text-gray-500">{on}/{list.length}</span>
                <button type="button" onClick={() => addAll(c.name)} className="text-green-600 font-semibold">Add all</button>
                <button type="button" onClick={() => removeAll(c.name)} className="text-red-500 font-semibold">Remove</button>
              </span>
            );
          })}
        </div>
      </div>

      <div className={card}>
        <p className="text-xs font-bold uppercase tracking-wider">Products ({count} in my shop)</p>
        <div className="divide-y text-xs">
          {live.map((p) => {
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
        {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
        <button type="button" disabled={busy} onClick={save} className="bg-[#D4AF37] text-black font-bold px-6 py-3 rounded text-xs uppercase tracking-widest disabled:opacity-50">{busy ? 'Saving...' : 'Save my shop'}</button>
      </div>
    </div>
  );
}
