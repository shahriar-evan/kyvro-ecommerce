import React, { useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { BRAND_COLORS, SOCIALS } from '../data/shopBrand';

// My Shop: the shop page extras. Pro + Premium: tagline, contact button, about, social links and the share kit
// (link, QR code, ready caption). Premium only: brand color, announcement strip, pinned products.
// Locked parts are shown greyed with what unlocks them. Saving happens with the shop's Save button.
export default function ShopExtrasEditor({ extras, setExtras, proOn, premiumOn, shopName, link, pinChoices = [], isDarkMode, inputCls }) {
  const [copied, setCopied] = useState('');
  const set = (k, v) => setExtras((e) => ({ ...e, [k]: v }));
  const setSocial = (k, v) => setExtras((e) => ({ ...e, socialLinks: { ...e.socialLinks, [k]: v } }));
  const box = `rounded-lg border p-4 space-y-3 ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-gray-50'}`;
  const label = 'block text-xs font-semibold text-gray-500';
  const lock = (who) => <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-500">🔒 {who}</span>;

  // QR code of the shop link, made in the browser (nothing is sent anywhere)
  const qr = useMemo(() => {
    if (!link) return '';
    const q = qrcode(0, 'M');
    q.addData(link);
    q.make();
    return q.createDataURL(6, 2);
  }, [link]);
  const caption = `🛍️ ${shopName || 'My shop'}${extras.tagline ? ` — ${extras.tagline}` : ''}\nOrder here: ${link}\n✅ Cash on delivery · Kyvro delivers all over Bangladesh`;
  const copy = async (text, what) => { try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1500); } catch { setCopied(''); } };

  const togglePin = (id) => setExtras((e) => {
    const has = e.pinnedItems.includes(id);
    if (has) return { ...e, pinnedItems: e.pinnedItems.filter((x) => x !== id) };
    return e.pinnedItems.length >= 3 ? e : { ...e, pinnedItems: [...e.pinnedItems, id] };
  });

  return (
    <div className="space-y-4">
      <div className={`${box} ${proOn ? '' : 'opacity-60'}`}>
        <p className="text-xs font-bold uppercase tracking-wider">Shop page {proOn ? '' : lock('Pro / Premium')}</p>
        <fieldset disabled={!proOn} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className={label}>Tagline <span className="font-normal">(max 80)</span>
              <input className={`${inputCls} block mt-1 w-full`} maxLength={80} value={extras.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="e.g. Trendy panjabi at the best price" />
            </label>
            <label className={label}>Contact button <span className="font-normal">(WhatsApp number or https link)</span>
              <input className={`${inputCls} block mt-1 w-full`} maxLength={200} value={extras.contactUrl} onChange={(e) => set('contactUrl', e.target.value)} placeholder="01712345678 or https://facebook.com/..." />
            </label>
          </div>
          <label className={label}>About your shop <span className="font-normal">(max 300, shown at the top of your shop)</span>
            <textarea className={`${inputCls} block mt-1 w-full`} rows={2} maxLength={300} value={extras.about} onChange={(e) => set('about', e.target.value)} placeholder="Who you are and why people should buy from you" />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            {SOCIALS.map((x) => (
              <label key={x.key} className={label}>{x.label}
                <input className={`${inputCls} block mt-1 w-full`} maxLength={200} value={extras.socialLinks[x.key]} onChange={(e) => setSocial(x.key, e.target.value)} placeholder={x.placeholder} />
              </label>
            ))}
          </div>
          <p className="text-[11px] text-gray-500">Links must start with https://</p>
        </fieldset>
      </div>

      <div className={`${box} ${premiumOn ? '' : 'opacity-60'}`}>
        <p className="text-xs font-bold uppercase tracking-wider">Premium look {premiumOn ? '' : lock('Premium')}</p>
        <fieldset disabled={!premiumOn} className="space-y-3">
          <div>
            <p className={label}>Brand color <span className="font-normal">(your shop name, buttons and badges)</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BRAND_COLORS.map((c) => {
                const on = (extras.brandColor || 'gold') === c.key;
                return (
                  <button key={c.key} type="button" onClick={() => set('brandColor', c.key)} aria-pressed={on} title={c.label}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${on ? 'border-current ring-2 ring-offset-1' : 'border-gray-400/40'}`} style={{ color: c.hex }}>
                    <span className="h-4 w-4 rounded-full" style={{ background: c.hex }} />{c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className={label}>Announcement strip <span className="font-normal">(max 100, shown on top of your shop)</span>
            <input className={`${inputCls} block mt-1 w-full`} maxLength={100} value={extras.announcement} onChange={(e) => set('announcement', e.target.value)} placeholder="e.g. Eid offer: free delivery this week" />
          </label>
          <div>
            <p className={label}>Pin top products <span className="font-normal">(up to 3, shown first on your shop; tick products below first)</span></p>
            {pinChoices.length === 0 ? <p className="text-[11px] text-gray-500 mt-1">No products in your shop yet.</p> : (
              <div className="mt-2 flex flex-wrap gap-2">
                {pinChoices.map((p) => {
                  const on = extras.pinnedItems.includes(String(p.id));
                  return (
                    <button key={p.id} type="button" onClick={() => togglePin(String(p.id))} aria-pressed={on}
                      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-[11px] font-semibold max-w-[14rem] ${on ? 'border-[#D4AF37] bg-[#D4AF37] text-black' : 'border-gray-400/40'}`}>
                      {on ? '📌' : '+'} <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </fieldset>
      </div>

      <div className={`${box} ${proOn ? '' : 'opacity-60'}`}>
        <p className="text-xs font-bold uppercase tracking-wider">Share kit {proOn ? '' : lock('Pro / Premium')}</p>
        {proOn ? (
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {qr && (
              <div className="text-center shrink-0">
                <img src={qr} alt="QR code of your shop link" className="w-32 h-32 rounded bg-white p-1 border" />
                <a href={qr} download={`${(shopName || 'shop').replace(/[^a-z0-9]+/gi, '-')}-qr.gif`} className="mt-1 inline-block text-[11px] underline text-[#D4AF37]">Download QR</a>
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-2 w-full">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(link, 'link')} className="px-3 py-1.5 rounded border border-gray-400 text-xs font-semibold">{copied === 'link' ? 'Copied ✓' : 'Copy shop link'}</button>
                <button type="button" onClick={() => copy(caption, 'caption')} className="px-3 py-1.5 rounded bg-[#D4AF37] text-black text-xs font-bold">{copied === 'caption' ? 'Copied ✓' : 'Copy caption'}</button>
              </div>
              <pre className={`whitespace-pre-wrap break-words text-[11px] p-2 rounded border ${isDarkMode ? 'border-gray-800 bg-black/40' : 'border-gray-200 bg-white'}`}>{caption}</pre>
              <p className="text-[11px] text-gray-500">Post the caption and the QR on Facebook, Instagram or WhatsApp.</p>
            </div>
          </div>
        ) : <p className="text-[11px] text-gray-500">QR code of your shop link and a ready caption to post.</p>}
      </div>
    </div>
  );
}
