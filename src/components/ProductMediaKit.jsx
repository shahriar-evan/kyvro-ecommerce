import React, { useEffect, useRef, useState } from 'react';
import { Download, Trash2, Plus, Copy, Check, Image as ImageIcon, Film } from 'lucide-react';
import { loadProductMedia, addProductMedia, removeProductMedia, downloadFile, photoName, MEDIA_MAX, MAX_BYTES, PHOTO_ACCEPT, VIDEO_ACCEPT } from '../productMedia';

// Product page → "Marketing kit": the product's photos (the normal ones + extra uploads) and videos, each with a full
// quality Download button, for sellers and the team to post on Facebook / Instagram. Shown only to the team and sellers
// (never to customers). The team (Owner / Manager / Admin) adds and removes the extra photos and videos.
const mb = (n) => `${(n / 1024 / 1024).toFixed(n >= 10 * 1024 * 1024 ? 0 : 1)} MB`;

export default function ProductMediaKit({ product, photos = [], canEdit, isDarkMode, formatPrice }) {
  const pid = String(product.id);
  const [media, setMedia] = useState({ photos: [], videos: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // { kind, name, pct, left }
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const photoInput = useRef(null);
  const videoInput = useRef(null);

  useEffect(() => {
    let off = false;
    setLoading(true);
    loadProductMedia(pid)
      .then((m) => { if (!off) setMedia(m); })
      .catch(() => { if (!off) setErr('Could not load the extra photos / videos right now.'); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [pid]);

  const upload = async (kind, fileList) => {
    const files = [...(fileList || [])];
    if (!files.length) return;
    setErr('');
    let cur = media;
    for (let i = 0; i < files.length; i += 1) {
      const f = files[i];
      if ((cur[kind] || []).length >= MEDIA_MAX[kind]) { setErr(`At most ${MEDIA_MAX[kind]} ${kind} per product.`); break; }
      if (f.size > MAX_BYTES[kind]) { setErr(`${f.name} is too big (max ${mb(MAX_BYTES[kind])}).`); continue; }
      setBusy({ kind, name: f.name, pct: 0, left: files.length - i });
      try {
        cur = await addProductMedia(pid, kind, f, cur, (pct) => setBusy((b) => (b ? { ...b, pct } : b)));
        setMedia(cur);
      } catch (e) {
        setErr(String((e && e.message) || 'Upload failed.'));
        break;
      }
    }
    setBusy(null);
  };

  const remove = async (kind, url) => {
    if (!window.confirm(`Remove this ${kind === 'videos' ? 'video' : 'photo'} from the marketing kit?`)) return;
    setErr('');
    try { setMedia(await removeProductMedia(pid, kind, url, media)); } catch (e) { setErr('Could not remove it. Try again.'); }
  };

  const allPhotos = [
    ...photos.filter(Boolean).map((url, i) => ({ url, name: photoName(product, i, url), own: true })),
    ...media.photos.map((f) => ({ ...f, own: false })),
  ];

  const downloadAll = async (list) => {
    for (let i = 0; i < list.length; i += 1) {
      await downloadFile(list[i].url, list[i].name);
      await new Promise((r) => setTimeout(r, 700)); // browsers block many downloads at the same moment
    }
  };

  const copyDetails = async () => {
    const text = [product.name, formatPrice ? formatPrice(product.price) : `৳${product.price}`, product.description].filter(Boolean).join('\n\n');
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) { /* no clipboard */ }
  };

  const card = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const sub = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const btn = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition ${isDarkMode ? 'border-gray-600 text-gray-200 hover:bg-white/10' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`;
  const gold = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#D4AF37] text-black hover:brightness-95 disabled:opacity-50';
  const iconBtn = 'w-8 h-8 rounded-full flex items-center justify-center shadow bg-white/95 text-gray-900 hover:bg-white';

  const section = (kind, title, Icon, list, accept, inputRef) => (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider"><Icon size={16} /> {title} <span className={`font-normal ${sub}`}>({list.length})</span></h3>
        <div className="flex flex-wrap gap-2">
          {list.length > 1 && <button type="button" className={btn} onClick={() => downloadAll(list)}><Download size={14} /> Download all</button>}
          {canEdit && (
            <>
              <button type="button" className={gold} disabled={!!busy} onClick={() => inputRef.current && inputRef.current.click()}><Plus size={14} /> Add {kind === 'videos' ? 'video' : 'photos'}</button>
              <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={(e) => { upload(kind, e.target.files); e.target.value = ''; }} />
            </>
          )}
        </div>
      </div>
      {busy && busy.kind === kind && (
        <div className={`mb-3 text-xs ${sub}`}>
          Uploading {busy.name}{busy.left > 1 ? ` (${busy.left} left)` : ''}… {busy.pct}%
          <div className={`mt-1 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}><div className="h-full bg-[#D4AF37] transition-all" style={{ width: `${busy.pct}%` }} /></div>
        </div>
      )}
      {list.length === 0 ? (
        <p className={`text-sm ${sub}`}>{loading ? 'Loading…' : kind === 'videos' ? 'No video yet.' : 'No photo yet.'}</p>
      ) : (
        <div className={`grid gap-3 ${kind === 'videos' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'}`}>
          {list.map((f) => (
            <div key={f.url} className={`relative rounded-lg overflow-hidden border ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              {kind === 'videos'
                ? <video src={f.url} controls playsInline preload="metadata" className="w-full aspect-video bg-black" />
                : <img src={f.url} alt="" loading="lazy" className="w-full aspect-square object-contain" />}
              <div className="absolute top-1.5 right-1.5 flex gap-1.5">
                <button type="button" title="Download" aria-label="Download" className={iconBtn} onClick={() => downloadFile(f.url, f.name)}><Download size={15} /></button>
                {canEdit && !f.own && <button type="button" title="Remove" aria-label="Remove" className={`${iconBtn} text-red-600`} onClick={() => remove(kind, f.url)}><Trash2 size={15} /></button>}
              </div>
              {kind === 'videos' && f.size > 0 && <p className={`px-2 py-1 text-[11px] truncate ${sub}`}>{f.name} · {mb(f.size)}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10"><section className={`p-4 sm:p-6 rounded-xl border ${card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif font-bold">Marketing kit</h2>
          <p className={`text-xs mt-0.5 ${sub}`}>Download the photos and videos in full quality for your Facebook / Instagram posts. Only you and the Kyvro team see this.</p>
        </div>
        <button type="button" className={btn} onClick={copyDetails}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy details'}</button>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      {section('photos', 'Photos', ImageIcon, allPhotos, PHOTO_ACCEPT, photoInput)}
      {section('videos', 'Videos', Film, media.videos, VIDEO_ACCEPT, videoInput)}
    </section></div>
  );
}
