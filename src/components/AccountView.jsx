import React, { useState, useEffect } from 'react';
import { Heart, User, Package, Wallet, Settings, LogOut } from 'lucide-react';
import { formatDateTime, toDate } from '../utils/dates';
import { CANCEL_WINDOW_MINUTES } from '../orders';
import { imageFileToDataURL } from '../utils/imageUpload';
import { watchMySubscription, setMySubscription } from '../subscribers';
import { pushSupported, pushPermission, enablePush, disablePush, myPushOn } from '../push';

const STATUS_STYLE = {
  Pending: 'bg-yellow-500/15 text-yellow-600',
  Processing: 'bg-blue-500/15 text-blue-500',
  Shipped: 'bg-purple-500/15 text-purple-500',
  Delivered: 'bg-green-500/15 text-green-600',
  Cancelled: 'bg-red-500/15 text-red-500',
};

const TABS = [
  { key: 'orders', label: 'My Orders', icon: Package },
  { key: 'saved', label: 'Saved Items', icon: Heart },
  { key: 'settings', label: 'Account Settings', icon: Settings },
  { key: 'wallet', label: 'My Wallet', icon: Wallet },
];

export default function AccountView({
  customerUser, displayName, photoURL, activeTab, setActiveTab, onSignIn, onSignOut, onSaveProfile, onCancelOrder,
  myOrders, savedProducts, toggleSaved, formatPrice, isDarkMode, setCurrentView, setSelectedProduct,
}) {
  const [name, setName] = useState(displayName || '');
  const [photo, setPhoto] = useState(photoURL || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [now, setNow] = useState(Date.now());
  const [sub, setSub] = useState({ exists: false, on: false });
  const [subBusy, setSubBusy] = useState(false);
  useEffect(() => {
    if (!customerUser || !customerUser.email) return undefined;
    return watchMySubscription(customerUser.email, setSub);
  }, [customerUser]);
  const [push, setPush] = useState({ supported: false, on: false, blocked: false });
  const [pushBusy, setPushBusy] = useState(false);
  const loadPush = async () => {
    const supported = await pushSupported();
    setPush({ supported, on: supported ? await myPushOn() : false, blocked: supported && pushPermission() === 'denied' });
  };
  useEffect(() => { if (customerUser) loadPush(); }, [customerUser]);
  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (push.on) await disablePush();
      else await enablePush(customerUser);
    } catch (e) { console.error(e); setMsg('Error: could not change the notification setting.'); }
    await loadPush();
    setPushBusy(false);
  };
  const toggleOffers = async () => {
    setSubBusy(true);
    try { await setMySubscription(customerUser, !sub.on); } catch (e) { console.error(e); setMsg('Error: could not change the offer-email setting.'); }
    setSubBusy(false);
  };
  const [cancelling, setCancelling] = useState('');
  const [cancelMsg, setCancelMsg] = useState('');

  // keeps the "minutes left to cancel" fresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // minutes left to cancel (0 when the time is over, the order moved on, or it was just placed and has no time yet)
  const msLeft = (o) => {
    if (o.status !== 'Pending') return 0;
    const d = toDate(o.createdAt);
    if (!d) return CANCEL_WINDOW_MINUTES * 60000;
    return Math.max(0, d.getTime() + CANCEL_WINDOW_MINUTES * 60000 - now);
  };
  const clock = (ms) => {
    const s = Math.ceil(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  const cancelOrder = async (o) => {
    if (!confirm(`Cancel order ${o.orderNumber}?`)) return;
    setCancelMsg(''); setCancelling(o.id);
    try { await onCancelOrder(o.id); }
    catch (e) { setCancelMsg('Sorry, this order can no longer be cancelled here (the 30 minutes are over or the team already confirmed it). Please contact us on WhatsApp or kyvrofashion@gmail.com.'); }
    setCancelling('');
  };

  // Profile arrives a moment after sign-in
  useEffect(() => { setName(displayName || ''); setPhoto(photoURL || ''); }, [displayName, photoURL]);

  const card = `rounded-lg border p-5 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const input = `w-full border rounded px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#0f0f0f] border-gray-700' : 'bg-white border-gray-300'}`;

  if (!customerUser) {
    return (
      <div className="flex-1 max-w-md mx-auto px-4 py-16 w-full text-center">
        <User size={40} className="mx-auto text-[#D4AF37] mb-4" />
        <h1 className="text-2xl font-serif font-bold mb-2">Sign in to Kyvro</h1>
        <p className="text-sm text-gray-500 mb-6">See your orders, save the products you love and manage your account.</p>
        <button onClick={onSignIn} className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 transition">
          Continue with Google
        </button>
      </div>
    );
  }

  const pickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhoto(await imageFileToDataURL(file, { maxSize: 256, quality: 0.8 }));
      setMsg('');
    } catch (err) {
      setMsg('Error: ' + err.message);
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      await onSaveProfile({ name: name.trim().slice(0, 80), photoURL: photo });
      setMsg('Saved.');
    } catch (err) {
      setMsg('Error: could not save. ' + (err.message || ''));
    }
    setBusy(false);
  };

  const initial = (displayName || customerUser.email || '?').charAt(0).toUpperCase();

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 min-w-0">
          {photoURL
            ? <img src={photoURL} alt="" className="w-14 h-14 rounded-full object-cover border border-[#D4AF37]" />
            : <div className="w-14 h-14 rounded-full bg-[#D4AF37] text-black font-bold text-xl flex items-center justify-center">{initial}</div>}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-serif font-bold truncate">{displayName || 'My Account'}</h1>
            <p className="text-xs text-gray-500 truncate">{customerUser.email}</p>
          </div>
        </div>
        <button onClick={onSignOut} className="flex items-center gap-2 text-xs font-semibold border rounded px-3 py-2 hover:border-[#D4AF37] hover:text-[#D4AF37] transition">
          <LogOut size={14} /> Sign out
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setActiveTab(key); setMsg(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition ${activeTab === key ? 'bg-[#D4AF37] text-black' : (isDarkMode ? 'bg-[#181818] text-gray-300' : 'bg-gray-200 text-gray-700')}`}>
            <Icon size={14} /> {label}
            {key === 'saved' && savedProducts.length > 0 && <span className="ml-1 opacity-70">({savedProducts.length})</span>}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {myOrders.length === 0 && (
            <div className={card}>
              <p className="text-sm text-gray-500">No orders yet. Orders you place while signed in will show up here.</p>
              <button onClick={() => setCurrentView('shop')} className="mt-4 bg-[#D4AF37] text-black font-bold px-6 py-2.5 rounded text-xs uppercase tracking-widest">Start shopping</button>
            </div>
          )}
          {cancelMsg && <p className="text-xs p-3 rounded border border-red-500/40 text-red-500 bg-red-500/10">{cancelMsg}</p>}
          {myOrders.map((o) => (
            <div key={o.id} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-sm">{o.orderNumber}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(o.createdAt)}</p>
                </div>
                <span className={`inline-block px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLE[o.status] || ''}`}>{o.status}</span>
              </div>
              <ul className="mt-3 text-xs space-y-1">
                {(o.items || []).map((it, i) => (
                  <li key={i}>{it.quantity} x {it.name}{it.size && it.size !== 'Standard' ? ` (${it.size})` : ''}</li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t text-xs flex flex-wrap justify-between gap-2">
                <span className="text-gray-500">{o.paymentMethod} &middot; {o.deliveryArea}{o.discount > 0 ? ` · Discount ${formatPrice(o.discount)}` : ''}</span>
                <span className="font-bold text-sm text-[#D4AF37]">{formatPrice(o.total)}</span>
              </div>
              {msLeft(o) > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button disabled={cancelling === o.id} onClick={() => cancelOrder(o)} className="px-5 py-2.5 rounded text-sm font-bold border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition disabled:opacity-50">
                    {cancelling === o.id ? 'Cancelling...' : 'Cancel order'}
                  </button>
                  <div className="text-sm">
                    <span className="font-semibold">Time left to cancel: </span>
                    <span className="font-mono font-bold text-base text-red-500 tabular-nums">{clock(msLeft(o))}</span>
                    <p className="text-xs text-gray-500">You can cancel until this timer ends or the team confirms your order.</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'saved' && (
        savedProducts.length === 0 ? (
          <div className={card}><p className="text-sm text-gray-500">You have not saved anything yet. Tap the heart on a product to save it here.</p></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {savedProducts.map((p) => (
              <div key={p.id} className={`rounded-lg overflow-hidden border ${isDarkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="h-44 bg-gray-900 cursor-pointer" onClick={() => { setSelectedProduct(p); setCurrentView('product-detail'); }}>
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold line-clamp-1">{p.name}</p>
                  <p className="text-sm font-bold mt-1">{formatPrice(p.price)}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button onClick={() => { setSelectedProduct(p); setCurrentView('product-detail'); }} className="bg-[#D4AF37] text-black text-[11px] font-bold py-2 rounded">View</button>
                    <button onClick={() => toggleSaved(p.id)} className="border text-[11px] font-semibold py-2 rounded hover:border-red-500 hover:text-red-500">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'settings' && (
        <div className={`${card} max-w-xl space-y-5`}>
          <div className="flex items-center gap-4">
            {photo
              ? <img src={photo} alt="" className="w-20 h-20 rounded-full object-cover border border-[#D4AF37]" />
              : <div className="w-20 h-20 rounded-full bg-[#D4AF37] text-black font-bold text-3xl flex items-center justify-center">{initial}</div>}
            <div className="space-y-2">
              <label className="inline-block cursor-pointer text-xs font-bold border border-[#D4AF37] text-[#D4AF37] rounded px-4 py-2 hover:bg-[#D4AF37]/10">
                Upload profile photo
                <input type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
              </label>
              {photo && <button type="button" onClick={() => setPhoto('')} className="block text-xs text-red-500 underline">Remove photo</button>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Your name" className={input} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Email</label>
            <input value={customerUser.email || ''} readOnly className={`${input} opacity-60`} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Password</label>
            <p className="text-xs text-gray-500">You sign in with Google, so there is no Kyvro password. To change your password, update your Google account password at myaccount.google.com.</p>
          </div>
          <div className="flex items-start justify-between gap-4 border-t border-gray-500/20 pt-4">
            <div>
              <p className="text-xs font-semibold">Offer emails</p>
              <p className="text-xs text-gray-500 mt-1">Get discounts and new-arrival news at {customerUser.email}. Only when Kyvro has a real offer.</p>
            </div>
            <button type="button" onClick={toggleOffers} disabled={subBusy} aria-pressed={sub.on}
              className={`shrink-0 w-14 h-7 rounded-full relative transition-colors disabled:opacity-50 ${sub.on ? 'bg-[#D4AF37]' : 'bg-gray-500/40'}`}>
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${sub.on ? 'left-7' : 'left-0.5'}`} />
              <span className="sr-only">{sub.on ? 'On' : 'Off'}</span>
            </button>
          </div>
          {push.supported && (
            <div className="flex items-start justify-between gap-4 border-t border-gray-500/20 pt-4">
              <div>
                <p className="text-xs font-semibold">Notifications on this device</p>
                <p className="text-xs text-gray-500 mt-1">{push.blocked ? 'Notifications are blocked in your browser settings. Allow them for kyvro.store there, then come back.' : 'A pop-up alert when Kyvro has a new offer.'}</p>
              </div>
              <button type="button" onClick={togglePush} disabled={pushBusy || push.blocked} aria-pressed={push.on}
                className={`shrink-0 w-14 h-7 rounded-full relative transition-colors disabled:opacity-50 ${push.on ? 'bg-[#D4AF37]' : 'bg-gray-500/40'}`}>
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${push.on ? 'left-7' : 'left-0.5'}`} />
                <span className="sr-only">{push.on ? 'On' : 'Off'}</span>
              </button>
            </div>
          )}
          <div className="flex items-center gap-4">
            <button onClick={save} disabled={busy} className="bg-[#D4AF37] text-black font-bold px-8 py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50">{busy ? 'Saving...' : 'Save changes'}</button>
            {msg && <span className={`text-xs ${msg.startsWith('Error') ? 'text-red-500' : 'text-green-500'}`}>{msg}</span>}
          </div>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className={`${card} text-center py-12`}>
          <Wallet size={36} className="mx-auto text-[#D4AF37] mb-3" />
          <h2 className="text-lg font-serif font-bold">My Wallet</h2>
          <p className="text-sm text-gray-500 mt-1">Coming soon.</p>
        </div>
      )}
    </div>
  );
}
