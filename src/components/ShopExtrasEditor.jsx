import React, { useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { BRAND_COLORS, SOCIALS } from '../data/shopBrand';
import { imageFileToDataURL } from '../utils/imageUpload';
import { uploadLogo, uploadBanner, removeLogo, removeBanner } from '../shops';
import { askConfirm } from './AlertCenter';
import { GOLD_BTN, OUTLINE_BTN, planBadge } from './ui';

// My Shop: the shop page extras, in plan order. Pro + Premium: social links and the share kit (link, QR code, caption).
// Premium (after the divider): tagline + contact button, about, logo, banner, brand color, announcement, pinned products.
// Locked parts are shown greyed with what unlocks them. Saving happens with the shop's Save button.
// only='theme': just the Premium look box (seller dashboard > Themes)
export default function ShopExtrasEditor({ only = '', extras, setExtras, feat, shop, tier = 'free', shopName, link, pinChoices = [], isDarkMode, inputCls }) {
  const [copied, setCopied] = useState('');
  const [logoMsg, setLogoMsg] = useState(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const proOn = feat.tagline || feat.about; // the "Shop page" box (tagline, contact button, about)
  const premiumOn = feat.brandColor || feat.announcement || feat.pinned;
  // logo: png / jpg / webp up to 500 KB, made into a small square picture that waits for approval
  const pickLogo = async (file) => {
    setLogoMsg(null);
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setLogoMsg({ type: 'err', text: 'Choose a PNG, JPG or WebP image.' }); return; }
    if (file.size > 500 * 1024) { setLogoMsg({ type: 'err', text: 'The logo can be at most 500 KB.' }); return; }
    setLogoBusy(true);
    try {
      const url = await imageFileToDataURL(file, { maxSize: 256, quality: 0.85 });
      await uploadLogo(shop.slug, url);
      setLogoMsg({ type: 'ok', text: 'Logo sent. It shows on your shop after Kyvro approves it.' });
    } catch (e) { setLogoMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Logo upload is not on for your shop.' : e.message }); }
    setLogoBusy(false);
  };
  // banner: PNG / JPG / WebP up to 2 MB, made into a wide picture (max 1200 px) that waits for approval
  const [bannerMsg, setBannerMsg] = useState(null);
  // take the live logo / banner off the shop (a new one can be uploaded any time and goes through approval again)
  const takeOff = async (what) => {
    const isLogo = what === 'logo';
    if (!(await askConfirm(`Remove your ${what} from the shop? You can upload a new one any time (Kyvro approves it first).`, { confirmText: 'Remove', danger: true }))) return;
    try {
      await (isLogo ? removeLogo : removeBanner)(shop.slug);
      (isLogo ? setLogoMsg : setBannerMsg)({ type: 'ok', text: `${isLogo ? 'Logo' : 'Banner'} removed.` });
    } catch (e) {
      (isLogo ? setLogoMsg : setBannerMsg)({ type: 'err', text: e.code === 'permission-denied' ? 'Could not remove it. Please try again later.' : e.message });
    }
  };
  const removeBtn = (what) => <button type="button" onClick={() => takeOff(what)} className="text-xs font-semibold text-red-500 hover:underline">Remove</button>;
  const [bannerBusy, setBannerBusy] = useState(false);
  const pickBanner = async (file) => {
    setBannerMsg(null);
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setBannerMsg({ type: 'err', text: 'Choose a PNG, JPG or WebP image.' }); return; }
    if (file.size > 2 * 1024 * 1024) { setBannerMsg({ type: 'err', text: 'The banner can be at most 2 MB.' }); return; }
    setBannerBusy(true);
    try {
      let url = await imageFileToDataURL(file, { maxSize: 1200, quality: 0.78 });
      if (url.length > 300000) url = await imageFileToDataURL(file, { maxSize: 900, quality: 0.65 });
      if (url.length > 300000) throw new Error('This picture is too detailed. Try a simpler or smaller one.');
      await uploadBanner(shop.slug, url);
      setBannerMsg({ type: 'ok', text: 'Banner sent. It shows on your shop after Kyvro approves it.' });
    } catch (e) { setBannerMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Banner upload is not on for your shop.' : e.message }); }
    setBannerBusy(false);
  };
  const set = (k, v) => setExtras((e) => ({ ...e, [k]: v }));
  const setSocial = (k, v) => setExtras((e) => ({ ...e, socialLinks: { ...e.socialLinks, [k]: v } }));
  const box = `rounded-xl border p-4 space-y-3 ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-gray-50'}`;
  const label = 'block text-xs font-semibold text-gray-500';

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

  // section header: title + the plan that unlocks it (gold when it is on for this shop, grey with a lock when not)
  const head = (title, plan, on, note) => (
    <div className="flex flex-wrap items-center gap-y-1">
      <p className="text-xs font-bold uppercase tracking-wider">{title}</p>
      <span className={planBadge(plan, on)}>{on ? '✓' : '🔒'} {on ? plan : note || plan}</span>
    </div>
  );
  const uploadBtn = (busy, text, onFile) => (
    <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-semibold cursor-pointer">
      <span className={`${GOLD_BTN} w-full sm:w-auto`}>{busy ? 'Uploading...' : text}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={busy} onChange={(e) => { onFile(e.target.files && e.target.files[0]); e.target.value = ''; }} />
    </label>
  );

  const field = `${inputCls} block mt-1 w-full !text-sm !rounded-lg`;
  const lockNote = (on, what) => (on ? null : <p className="text-[11px] text-gray-500">{what}</p>);

  const all = only !== 'theme';
  return (
    <div className="space-y-4">
      {all && <>
      {/* ---- Pro / Premium: social links + share kit ---- */}
      <div className={`${box} ${feat.social ? '' : 'opacity-60'}`}>
        {head('Social links', 'Pro / Premium', feat.social)}
        <fieldset disabled={!feat.social} className="space-y-3">
          <p className="text-[11px] text-gray-500">Connect your pages: the buttons show on your shop.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {SOCIALS.map((x) => (
              <label key={x.key} className={label}>{x.label}
                <input className={field} maxLength={200} value={extras.socialLinks[x.key]} onChange={(e) => setSocial(x.key, e.target.value)} placeholder={x.placeholder} />
              </label>
            ))}
          </div>
          <p className="text-[11px] text-gray-500">Links must start with https://</p>
        </fieldset>
      </div>

      <div className={`${box} ${feat.shareKit ? '' : 'opacity-60'}`}>
        {head('Share kit', 'Pro / Premium', feat.shareKit)}
        {feat.shareKit ? (
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            {qr && (
              <div className="text-center shrink-0">
                <img src={qr} alt="QR code of your shop link" className="w-32 h-32 rounded-xl bg-white p-1 border" />
                <a href={qr} download={`${(shopName || 'shop').replace(/[^a-z0-9]+/gi, '-')}-qr.gif`} className="mt-1 inline-block text-[11px] underline text-[#B8921F]">Download QR</a>
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-2 w-full">
              <div className="grid grid-cols-2 sm:flex gap-2">
                <button type="button" onClick={() => copy(link, 'link')} className={OUTLINE_BTN}>{copied === 'link' ? 'Copied ✓' : 'Copy shop link'}</button>
                <button type="button" onClick={() => copy(caption, 'caption')} className={GOLD_BTN}>{copied === 'caption' ? 'Copied ✓' : 'Copy caption'}</button>
              </div>
              <pre className={`whitespace-pre-wrap break-words text-[11px] p-3 rounded-xl border ${isDarkMode ? 'border-gray-800 bg-black/40' : 'border-gray-200 bg-white'}`}>{caption}</pre>
              <p className="text-[11px] text-gray-500">Post the caption and the QR on Facebook, Instagram or WhatsApp.</p>
            </div>
          </div>
        ) : <p className="text-[11px] text-gray-500">QR code of your shop link and a ready caption to post.</p>}
      </div>

      {/* ---- Premium ---- */}
      <div className="flex items-center gap-3 pt-2" aria-hidden="true">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#D4AF37]/60" />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B8921F]">Premium</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#D4AF37]/60" />
      </div>

      <div className={`${box} ${proOn ? '' : 'opacity-60'}`}>
        {head('Shop page', 'Premium', proOn)}
        <fieldset disabled={!proOn} className="space-y-3">
          <div className={`grid sm:grid-cols-2 gap-3 ${feat.tagline ? '' : 'opacity-50 pointer-events-none'}`}>
            <label className={label}>Tagline <span className="font-normal">(max 80)</span>
              <input className={field} maxLength={80} value={extras.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="e.g. Trendy panjabi at the best price" />
            </label>
            <label className={label}>Contact button <span className="font-normal">(WhatsApp number or https link)</span>
              <input className={field} maxLength={200} value={extras.contactUrl} onChange={(e) => set('contactUrl', e.target.value)} placeholder="+8801712345678 or https://facebook.com/..." />
            </label>
          </div>
          <label className={`${label} ${feat.about ? '' : 'opacity-50 pointer-events-none'}`}>About your shop <span className="font-normal">(max 300, shown at the top of your shop)</span>
            <textarea className={field} rows={3} maxLength={300} value={extras.about} onChange={(e) => set('about', e.target.value)} placeholder="Who you are and why people should buy from you" />
          </label>
        </fieldset>
      </div>

      {shop && (
        <div className={`${box} ${feat.logo ? '' : 'opacity-60'}`}>
          {head('Shop logo', 'Premium', feat.logo)}
          {shop.logo && <div className="flex items-center gap-3 text-xs"><img src={shop.logo} alt="" className="w-14 h-14 rounded-xl object-cover border" /><span className="text-green-600 font-semibold">Approved logo (shown on your shop)</span>{removeBtn('logo')}</div>}
          {shop.logoPending && <div className="flex items-center gap-3 text-xs"><img src={shop.logoPending} alt="" className="w-14 h-14 rounded-xl object-cover border" /><span className="text-amber-600 font-semibold">Waiting for Kyvro's approval</span></div>}
          {shop.logoReject && <p className="text-xs text-red-500">{shop.logoReject.kind === 'request' ? 'Logo request rejected' : 'Logo rejected'}{shop.logoReject.note ? `: ${shop.logoReject.note}` : ''}</p>}
          {feat.logo ? (
            <>
              {uploadBtn(logoBusy, shop.logo || shop.logoPending ? 'Upload a new logo' : 'Upload logo', pickLogo)}
              <p className="text-[11px] text-gray-500">PNG / JPG / WebP, max 500 KB, shown square. Kyvro approves it first.</p>
            </>
          ) : lockNote(false, 'Your own logo on your shop page.')}
          {logoMsg && <p className={`text-xs ${logoMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{logoMsg.text}</p>}
        </div>
      )}

      {shop && (
        <div className={`${box} ${feat.banner ? '' : 'opacity-60'}`}>
          {head('Shop banner', 'Premium', feat.banner)}
          {shop.banner && <div className="space-y-1 text-xs"><img src={shop.banner} alt="" className="w-full max-h-36 object-cover rounded-xl border" /><span className="text-green-600 font-semibold">Approved banner (shown on top of your shop)</span> {removeBtn('banner')}</div>}
          {shop.bannerPending && <div className="space-y-1 text-xs"><img src={shop.bannerPending} alt="" className="w-full max-h-36 object-cover rounded-xl border" /><span className="text-amber-600 font-semibold">Waiting for Kyvro's approval</span></div>}
          {shop.bannerReject && <p className="text-xs text-red-500">Banner rejected{shop.bannerReject.note ? `: ${shop.bannerReject.note}` : ''}</p>}
          {feat.banner ? (
            <>
              {uploadBtn(bannerBusy, shop.banner || shop.bannerPending ? 'Upload a new banner' : 'Upload banner', pickBanner)}
              <p className="text-[11px] text-gray-500">Wide picture (about 3:1), PNG / JPG / WebP, max 2 MB. Kyvro approves it first.</p>
            </>
          ) : lockNote(false, 'A wide picture on top of your shop.')}
          {bannerMsg && <p className={`text-xs ${bannerMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{bannerMsg.text}</p>}
        </div>
      )}

      </>}

      <div className={`${box} ${premiumOn ? '!border-[#D4AF37]/40' : 'opacity-60'}`}>
        {head('Premium look', 'Premium', premiumOn)}
        <fieldset disabled={!premiumOn} className="space-y-3">
          <div className={feat.brandColor ? '' : 'opacity-50 pointer-events-none'}>
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
          <label className={`${label} ${feat.announcement ? '' : 'opacity-50 pointer-events-none'}`}>Announcement strip <span className="font-normal">(max 100, shown on top of your shop)</span>
            <input className={field} maxLength={100} value={extras.announcement} onChange={(e) => set('announcement', e.target.value)} placeholder="e.g. Eid offer: free delivery this week" />
          </label>
          <div className={feat.pinned ? '' : 'opacity-50 pointer-events-none'}>
            <p className={label}>Pin top products <span className="font-normal">(up to 3, shown first on your shop; from the products you sell)</span></p>
            {pinChoices.length === 0 ? <p className="text-[11px] text-gray-500 mt-1">No products in your shop yet.</p> : (
              <div className="mt-2 flex flex-wrap gap-2">
                {pinChoices.map((p) => {
                  const on = extras.pinnedItems.includes(String(p.id));
                  return (
                    <button key={p.id} type="button" onClick={() => togglePin(String(p.id))} aria-pressed={on}
                      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-[11px] font-semibold max-w-full sm:max-w-[14rem] ${on ? 'border-[#D4AF37] bg-[#D4AF37] text-black' : 'border-gray-400/40'}`}>
                      {on ? '📌' : '+'} <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
