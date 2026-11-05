import React, { useEffect, useState } from 'react';
import { watchSellerDash, saveSellerDash, DASH_BANNER_MAX } from '../sellerDash';
import { imageFileToDataURL } from '../utils/imageUpload';

// Owner: the slide banner on top of every seller's dashboard (settings/sellerDash). Up to 3 pictures, each with an
// optional https link. Nothing saved = the main site's first two banners show.
export default function SellerDashBannerSettings({ isDarkMode, staff }) {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => watchSellerDash((d) => setList((cur) => cur || d.banners)), []);
  if (!list) return null;

  const card = `rounded-lg border p-5 sm:p-6 space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const input = `block mt-1 w-full border p-2 text-sm rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;
  const add = async (file) => {
    setMsg(null);
    if (!file) return;
    try {
      let url = await imageFileToDataURL(file, { maxSize: 1400, quality: 0.8 });
      if (url.length > 300000) url = await imageFileToDataURL(file, { maxSize: 1100, quality: 0.65 });
      if (url.length > 300000) { setMsg({ type: 'err', text: 'This picture is still too big after compressing. Try a smaller one.' }); return; }
      setList((l) => [...l, { image: url, link: '' }].slice(0, DASH_BANNER_MAX));
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
  };
  const move = (k, d) => setList((l) => { const n = l.slice(); const j = k + d; if (j < 0 || j >= n.length) return l; [n[k], n[j]] = [n[j], n[k]]; return n; });
  const save = async () => {
    setMsg(null);
    const bad = list.find((b) => b.link && !/^https:\/\/[^ <>"]+$/.test(b.link));
    if (bad) { setMsg({ type: 'err', text: 'A link must start with https://' }); return; }
    setBusy(true);
    try { await saveSellerDash(list, staff); setMsg({ type: 'ok', text: list.length ? 'Saved. Sellers see these banners now.' : 'Saved. Sellers see the main site banners.' }); }
    catch (e) { setMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Could not save: publish the latest Firestore rules first.' : e.message }); }
    setBusy(false);
  };

  return (
    <div className={card}>
      <div>
        <h3 className="text-lg font-bold">Seller dashboard banner</h3>
        <p className="text-xs text-gray-500 mt-1">The slides on top of every seller's dashboard (up to {DASH_BANNER_MAX}). Wide pictures (about 3:1) look best. With no slides saved, sellers see the main site's first two banners.</p>
      </div>
      {list.length === 0 && <p className="text-sm text-gray-500">No slides yet: the main site banners show.</p>}
      <div className="space-y-3">
        {list.map((b, k) => (
          <div key={k} className={`rounded border p-3 flex flex-col sm:flex-row gap-3 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <img src={b.image} alt="" className="w-full sm:w-56 aspect-[3/1] object-cover rounded border" />
            <div className="flex-1 min-w-0 space-y-2">
              <label className="block text-xs font-semibold text-gray-500">Link when clicked <span className="font-normal">(optional, https://)</span>
                <input className={input} maxLength={300} value={b.link} placeholder="https://kyvro.store/..." onChange={(e) => setList((l) => l.map((x, j) => (j === k ? { ...x, link: e.target.value.trim() } : x)))} />
              </label>
              <div className="flex flex-wrap gap-2 text-xs">
                <button type="button" onClick={() => move(k, -1)} disabled={k === 0} className="px-3 py-1 rounded border disabled:opacity-40">↑ Up</button>
                <button type="button" onClick={() => move(k, 1)} disabled={k === list.length - 1} className="px-3 py-1 rounded border disabled:opacity-40">↓ Down</button>
                <button type="button" onClick={() => setList((l) => l.filter((_, j) => j !== k))} className="px-3 py-1 rounded border border-red-500 text-red-500">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {list.length < DASH_BANNER_MAX && (
          <label className="px-4 py-2 rounded border border-[#D4AF37] text-[#B8921F] text-xs font-bold uppercase tracking-wider cursor-pointer">
            + Add picture
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { add(e.target.files && e.target.files[0]); e.target.value = ''; }} />
          </label>
        )}
        <button type="button" disabled={busy} onClick={save} className="bg-[#D4AF37] text-black font-bold px-5 py-2 rounded text-xs uppercase tracking-wider disabled:opacity-50">{busy ? 'Saving...' : 'Save banners'}</button>
        {msg && <span className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
