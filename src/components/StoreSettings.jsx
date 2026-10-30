import React, { useEffect, useState } from 'react';
import { askConfirm } from './AlertCenter';
import { saveStoreSettings } from '../storeSettings';
import { countSubscribers, countPushDevices, sendOfferEmail } from '../subscribers';
import { normalizeSettings, bestDiscount, nextReward, describeRule, bannerFromRules, deliveryNote } from '../data/shopConfig';

// Owner-only editor: top banner text + automatic discount rules + delivery charge + offer sending
export default function StoreSettings({ settings, isDarkMode, staff, formatPrice }) {
  const [text, setText] = useState(settings.announcementText);
  const [speed, setSpeed] = useState(settings.bannerSpeed || 100);
  const [enabled, setEnabled] = useState(settings.discountEnabled);
  const [rules, setRules] = useState(settings.discountRules.map((r) => ({ ...r })));
  const [dIn, setDIn] = useState(String(settings.deliveryInside));
  const [dOut, setDOut] = useState(String(settings.deliveryOutside));
  const [dExtra, setDExtra] = useState(String(settings.deliveryExtraPerItem));
  const [dIncl, setDIncl] = useState(String(settings.deliveryIncludedItems));
  const [freeOn, setFreeOn] = useState(settings.freeDeliveryEnabled);
  const [freeMin, setFreeMin] = useState(String(settings.freeDeliveryMin));
  const [freeFor, setFreeFor] = useState(settings.freeDeliveryFor);
  const [maintOn, setMaintOn] = useState(settings.maintenanceMode);
  const [maintMsg, setMaintMsg] = useState(settings.maintenanceMessage || '');
  const [maintBusy, setMaintBusy] = useState(false);
  const [maintNote, setMaintNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgAt, setMsgAt] = useState('discount'); // which Save button the message belongs to
  const [testTotal, setTestTotal] = useState('4000');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [mailBusy, setMailBusy] = useState(false);
  const [mailMsg, setMailMsg] = useState('');
  const [counts, setCounts] = useState(null);
  const loadCounts = () => Promise.all([countSubscribers(), countPushDevices().catch(() => 0)])
    .then(([c, devices]) => setCounts({ ...c, devices }))
    .catch(() => setCounts(null));
  const resultText = (r, testOnly) => {
    const bits = [];
    bits.push(testOnly ? (r.sent ? 'Test email sent to you.' : 'No test email sent.') : `Email: sent to ${r.sent} customer${r.sent === 1 ? '' : 's'}${r.failed ? ` (${r.failed} failed)` : ''}.`);
    if (r.pushError && !r.pushSent) bits.push(`Notification: not sent (${r.pushError})`);
    else bits.push(`Notification: sent to ${r.pushSent || 0} device${r.pushSent === 1 ? '' : 's'}${r.pushFailed ? ` (${r.pushFailed} failed)` : ''}.`);
    return bits.join(' ');
  };
  const confirmText = () => {
    const n = counts ? counts.active : 0;
    const d = counts ? counts.devices : 0;
    return `This sends an EMAIL to ${n} customer${n === 1 ? '' : 's'} and a pop-up NOTIFICATION to ${d} device${d === 1 ? '' : 's'}.`;
  };
  useEffect(() => { loadCounts(); }, []);

  // Pick up changes saved from another device
  useEffect(() => {
    setText(settings.announcementText);
    setSpeed(settings.bannerSpeed || 100);
    setEnabled(settings.discountEnabled);
    setRules(settings.discountRules.map((r) => ({ ...r })));
    setDIn(String(settings.deliveryInside));
    setDOut(String(settings.deliveryOutside));
    setDExtra(String(settings.deliveryExtraPerItem));
    setDIncl(String(settings.deliveryIncludedItems));
    setFreeOn(settings.freeDeliveryEnabled);
    setFreeMin(String(settings.freeDeliveryMin));
    setFreeFor(settings.freeDeliveryFor);
    setMaintOn(settings.maintenanceMode);
    setMaintMsg(settings.maintenanceMessage || '');
  }, [settings]);

  // Look: deep indigo accent (readable in both light and dark), soft rounded cards
  const accentText = isDarkMode ? 'text-indigo-300' : 'text-indigo-700';
  const card = `relative overflow-hidden rounded-2xl border p-6 ${isDarkMode ? 'bg-[#15151b] border-white/10' : 'bg-white border-slate-200 shadow-[0_8px_30px_-12px_rgba(30,27,75,0.18)]'}`;
  const input = `w-full border rounded-lg px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 ${isDarkMode ? 'bg-[#0e0e13] border-white/10 placeholder-gray-600' : 'bg-white border-slate-300 placeholder-slate-400'}`;
  const label = `block text-[11px] font-semibold mb-1.5 tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`;
  const muted = isDarkMode ? 'text-gray-400' : 'text-slate-500';
  const primaryBtn = 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold px-6 py-2.5 rounded-lg text-xs uppercase tracking-widest shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed';
  const outlineBtn = `border font-semibold px-5 py-2.5 rounded-lg text-xs uppercase tracking-widest transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'border-indigo-400/40 text-indigo-200 hover:bg-indigo-500/10' : 'border-indigo-600/40 text-indigo-700 hover:bg-indigo-50'}`;
  const linkBtn = `text-xs font-medium underline underline-offset-4 decoration-indigo-400/60 hover:decoration-indigo-400 ${accentText}`;
  const subBox = `rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-[#0e0e13]' : 'border-slate-200 bg-slate-50'}`;

  const draft = normalizeSettings({ announcementText: text, bannerSpeed: speed, discountEnabled: enabled, discountRules: rules, deliveryInside: dIn === '' ? 0 : dIn, deliveryOutside: dOut === '' ? 0 : dOut, deliveryExtraPerItem: dExtra === '' ? 0 : dExtra, deliveryIncludedItems: dIncl === '' ? 1 : dIncl, freeDeliveryEnabled: freeOn, freeDeliveryMin: freeMin === '' ? 0 : freeMin, freeDeliveryFor: freeFor, maintenanceMode: maintOn, maintenanceMessage: maintMsg });
  const t = Number(testTotal) || 0;
  const hit = bestDiscount(t, draft);
  const next = nextReward(t, draft);

  const setRule = (i, patch) => setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRule = () => setRules((prev) => [...prev, { min: '', type: 'percent', value: '' }]);
  const removeRule = (i) => setRules((prev) => prev.filter((_, idx) => idx !== i));

  const fillMail = () => {
    setMailSubject('Kyvro offer: ' + (text || 'new discounts are live').slice(0, 80));
    setMailBody(`${text || 'We have a new offer for you.'}\n\nVisit kyvro.store to see what is new.`);
  };

  const sendMail = async (testOnly) => {
    setMailMsg('');
    if (mailSubject.trim().length < 3 || mailBody.trim().length < 10) { setMailMsg('Error: write a subject and a message first.'); return; }
    if (!testOnly && !(await askConfirm(`${confirmText()}\n\nSend now? It cannot be undone.`))) return;
    setMailBusy(true);
    try {
      const r = await sendOfferEmail({ subject: mailSubject.trim(), message: mailBody.trim(), testOnly, pushTitle: mailSubject.trim(), pushBody: mailBody.trim() });
      setMailMsg(resultText(r, testOnly));
      loadCounts();
    } catch (e) { setMailMsg('Error: ' + e.message); }
    setMailBusy(false);
  };

  // One click: the banner text above goes out as an offer email to every subscribed customer
  const sendBannerMail = async () => {
    setMailMsg('');
    const t = (text || '').trim();
    if (t.length < 10) { setMailMsg('Error: the banner text is too short to send.'); return; }
    if (!(await askConfirm(`${confirmText()}\n\n"${t}"\n\nSend now? It cannot be undone.`))) return;
    setMailBusy(true);
    try {
      const r = await sendOfferEmail({ subject: 'Kyvro: ' + t.slice(0, 90), message: `${t}\n\nVisit kyvro.store to see what is new.`, testOnly: false, pushTitle: 'Kyvro', pushBody: t });
      setMailMsg(resultText(r, false));
      loadCounts();
    } catch (e) { setMailMsg('Error: ' + e.message); }
    setMailBusy(false);
  };

  const save = async (where) => {
    setMsg('');
    setMsgAt(where);
    const bad = rules.some((r) => !(Number(r.min) > 0) || !(Number(r.value) > 0));
    if (enabled && bad) { setMsg('Error: every discount rule needs a minimum total and a value above 0 (or delete the empty rule).'); return; }
    if (dIn === '' || dOut === '' || dExtra === '' || !(Number(dIncl) >= 1) || !(Number(dExtra) >= 0) || !(Number(dIn) >= 0) || !(Number(dOut) >= 0)) { setMsg('Error: type both delivery charges (0 or more).'); return; }
    if (freeOn && !(Number(freeMin) > 0)) { setMsg('Error: type the minimum order amount for free delivery (above 0), or switch free delivery OFF.'); return; }
    if (rules.some((r) => r.type === 'percent' && Number(r.value) > 100)) { setMsg('Error: a percent discount cannot be more than 100.'); return; }
    setSaving(true);
    try {
      await saveStoreSettings(draft, staff);
      setMsg('Saved. The banner, discount and delivery charge are live on the website now.');
    } catch (err) {
      console.error(err);
      setMsg('Could not save: ' + (err.code === 'permission-denied' ? 'only the Owner can change store settings (check the Firestore rules).' : err.message));
    }
    setSaving(false);
  };

  // Website ON / OFF: saves right away (other unsaved edits on this page are NOT saved by this button)
  const toggleMaintenance = async () => {
    const next = !maintOn;
    const ask = next
      ? 'Turn ON maintenance?\n\nVisitors can still browse the whole website, but Add to Cart, Buy Now, Order on WhatsApp and checkout are locked and a "maintenance mode ON, we\'ll be back soon" bar shows on top. You and your team can still test-order.'
      : 'Turn OFF maintenance and open the website for everyone?';
    if (!(await askConfirm(ask))) return;
    setMaintBusy(true);
    setMaintNote('');
    try {
      await saveStoreSettings({ ...settings, maintenanceMode: next, maintenanceMessage: maintMsg }, staff);
      setMaintOn(next);
      setMaintNote(next ? 'Maintenance is ON. Visitors can browse, but ordering is locked.' : 'Website is LIVE for everyone.');
    } catch (err) {
      console.error(err);
      setMaintNote('Error: could not change it (' + (err.code === 'permission-denied' ? 'only the Owner can do this, and the Firestore rules must be published' : err.message) + ').');
    }
    setMaintBusy(false);
  };

  const msgClass = (m) => `text-xs ${m.startsWith('Error') || m.startsWith('Could not') ? 'text-red-500' : 'text-emerald-500'}`;

  // Card shell with a thin gradient line on top and a small accent dot before the title
  const section = (title, desc, body, right) => (
    <div className={card}>
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h3 className="font-bold text-[13px] uppercase tracking-[0.14em] flex items-center gap-2.5">
          <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_0_0_4px_rgba(99,102,241,0.15)]" />
          {title}
        </h3>
        {right}
      </div>
      {desc && <p className={`text-xs leading-relaxed mb-4 ${muted}`}>{desc}</p>}
      {body}
    </div>
  );

  const saveButton = (where) => (
    <button type="button" onClick={() => save(where)} disabled={saving} className={primaryBtn}>
      {saving && msgAt === where ? 'Saving...' : 'Save Settings'}
    </button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,46rem)_minmax(0,28rem)] gap-6 items-start">
      <div className="space-y-6 min-w-0">
        {section(
          'Website Status',
          'Switch maintenance ON while you work on the website. Visitors can still see everything, but Add to Cart, Buy Now, Order on WhatsApp and checkout are locked, with an orange "maintenance mode ON, we\'ll be back soon" bar on top. You and your team can still test-order.',
          <>
            <div className="flex flex-wrap items-center gap-4">
              <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase ${maintOn ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'}`}>
                <span className={`w-2 h-2 rounded-full ${maintOn ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {maintOn ? 'Maintenance ON' : 'Website LIVE'}
              </span>
              <button type="button" onClick={toggleMaintenance} disabled={maintBusy} className={maintOn ? primaryBtn : outlineBtn}>
                {maintBusy ? 'Please wait...' : maintOn ? 'Turn OFF (open website)' : 'Turn ON maintenance'}
              </button>
            </div>
            <div className="mt-4">
              <label className={label}>Message visitors will read (optional, leave empty for the default English + Bangla message)</label>
              <textarea rows={2} maxLength={300} value={maintMsg} onChange={(e) => setMaintMsg(e.target.value)} className={input} placeholder="Sorry, we are improving Kyvro. Back in 30 minutes." />
              <p className={`text-[11px] mt-1 ${muted}`}>The message is saved when you press the button above, or with "Save Settings".</p>
            </div>
            {maintNote && <p className={`mt-3 ${msgClass(maintNote)}`}>{maintNote}</p>}
          </>
        )}

        {section(
          'Top Banner Text',
          'This text scrolls in the bar at the very top of the website.',
          <>
            <textarea rows={2} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} className={input} />
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <button type="button" onClick={() => setText(bannerFromRules(draft))} className={linkBtn}>Write it from my discount rules</button>
              <span className={`text-[11px] ${muted}`}>{text.length}/500</span>
              <button type="button" onClick={sendBannerMail} disabled={mailBusy} className={`ml-auto ${outlineBtn}`}>{mailBusy ? 'Sending...' : 'Send this banner (email + notification)'}</button>
            </div>
            <div className="mt-4">
              <label className={label}>Scroll speed: {speed < 100 ? 'slower' : speed > 100 ? 'faster' : 'normal'} ({speed}%)</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setSpeed((v) => Math.max(25, v - 25))} className={outlineBtn}>Slower</button>
                <input type="range" min="25" max="300" step="5" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="flex-1" />
                <button type="button" onClick={() => setSpeed((v) => Math.min(300, v + 25))} className={outlineBtn}>Faster</button>
                <button type="button" onClick={() => setSpeed(100)} className={linkBtn}>Reset</button>
              </div>
              <p className={`text-[11px] mt-1 ${muted}`}>Press "Save" below to make the new speed live.</p>
            </div>
            {mailMsg && <p className={`mt-2 ${msgClass(mailMsg)}`}>{mailMsg}</p>}
          </>
        )}

        {section(
          'Automatic Discount',
          'When the cart total (before delivery) reaches a minimum, the discount is applied automatically. The highest tier the customer reaches is the one that applies (for example 3500 BDT = 20%, 6000 BDT = 25%).',
          <>
            <div className="space-y-3">
              {rules.length === 0 && <p className={`text-xs ${muted}`}>No rules yet. Add one below.</p>}
              {rules.map((r, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                  <div>
                    <label className={label}>Cart total at least (BDT)</label>
                    <input type="number" min="1" value={r.min} onChange={(e) => setRule(i, { min: e.target.value })} className={input} placeholder="3500" />
                  </div>
                  <div>
                    <label className={label}>Discount type</label>
                    <select value={r.type} onChange={(e) => setRule(i, { type: e.target.value })} className={input}>
                      <option value="percent">Percent (%)</option>
                      <option value="fixed">Fixed amount (BDT)</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>{r.type === 'percent' ? 'Percent off' : 'BDT off'}</label>
                    <input type="number" min="1" max={r.type === 'percent' ? 100 : undefined} value={r.value} onChange={(e) => setRule(i, { value: e.target.value })} className={input} placeholder={r.type === 'percent' ? '20' : '300'} />
                  </div>
                  <button type="button" onClick={() => removeRule(i)} className="text-xs font-medium text-red-500 border border-red-500/40 rounded-lg px-3.5 py-2.5 hover:bg-red-500/10 transition">Delete</button>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={addRule} disabled={rules.length >= 10} className={outlineBtn}>+ Add another rule</button>
              {saveButton('discount')}
            </div>
            {msg && msgAt === 'discount' && <p className={`mt-3 ${msgClass(msg)}`}>{msg}</p>}

            <div className={`mt-6 text-xs space-y-2 ${subBox}`}>
              <p className={`font-bold uppercase tracking-[0.14em] text-[11px] ${muted}`}>Try it</p>
              <div className="flex items-center gap-2">
                <span>If the cart total is</span>
                <input type="number" min="0" value={testTotal} onChange={(e) => setTestTotal(e.target.value)} className={`${input} !w-28 !py-1.5`} />
                <span>BDT:</span>
              </div>
              <p>
                {hit.rule
                  ? <>Customer gets <strong className={accentText}>{describeRule(hit.rule)}</strong> = {formatPrice(hit.amount)} off. Pays {formatPrice(t - hit.amount)} + delivery.</>
                  : 'No discount at this total.'}
              </p>
              {next && <p className={muted}>Next reward: spend {formatPrice(next.missing)} more to get {describeRule(next.rule)}.</p>}
            </div>
          </>,
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
            {enabled ? 'ON' : 'OFF'}
          </label>
        )}
      </div>

      <div className="space-y-6 min-w-0">
        {section(
          'Send offer (email + notification)',
          <>
            One press sends the email AND a pop-up notification to the phones / computers that allowed notifications. Nothing is sent until you press a button.
            {counts && <> Email list: <strong className={accentText}>{counts.active}</strong> of {counts.total}. Notification devices: <strong className={accentText}>{counts.devices}</strong>.</>}
          </>,
          <div className="space-y-3">
            <input value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} maxLength={150} placeholder="Email subject" className={input} />
            <textarea value={mailBody} onChange={(e) => setMailBody(e.target.value)} maxLength={4000} rows={6} placeholder="Message (e.g. Eid offer: 10% off above 3000 BDT...)" className={input} />
            <button type="button" onClick={fillMail} className={linkBtn}>Fill from banner text</button>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button type="button" onClick={() => sendMail(true)} disabled={mailBusy} className={outlineBtn}>Send test to me</button>
              <button type="button" onClick={() => sendMail(false)} disabled={mailBusy} className={primaryBtn}>{mailBusy ? 'Sending...' : `Send to all${counts ? ` (${counts.active})` : ''}`}</button>
            </div>
            {mailMsg && <p className={msgClass(mailMsg)}>{mailMsg}</p>}
          </div>
        )}

        {section(
          'Delivery Charge',
          "The charge is added at checkout by the customer's delivery area. The area charge covers the first few items (default 2); every item after that adds the extra amount (the supplier charges more for more items). Free delivery is counted on the product total after the discount.",
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>Inside Dhaka (BDT)</label>
                <input type="number" min="0" value={dIn} onChange={(e) => setDIn(e.target.value)} className={input} placeholder="100" />
              </div>
              <div>
                <label className={label}>Outside Dhaka (BDT)</label>
                <input type="number" min="0" value={dOut} onChange={(e) => setDOut(e.target.value)} className={input} placeholder="150" />
              </div>
              <div>
                <label className={label}>Items covered by the charge above</label>
                <input type="number" min="1" value={dIncl} onChange={(e) => setDIncl(e.target.value)} className={input} placeholder="2" />
              </div>
              <div>
                <label className={label}>Extra for each item after that (BDT)</label>
                <input type="number" min="0" value={dExtra} onChange={(e) => setDExtra(e.target.value)} className={input} placeholder="15" />
              </div>
            </div>

            <div className={`mt-4 ${subBox}`}>
              <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer select-none">
                <input type="checkbox" checked={freeOn} onChange={(e) => setFreeOn(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
                Free delivery for big orders: {freeOn ? 'ON' : 'OFF'}
              </label>
              {freeOn && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className={label}>Free delivery when the order is at least (BDT)</label>
                    <input type="number" min="1" value={freeMin} onChange={(e) => setFreeMin(e.target.value)} className={input} placeholder="2000" />
                  </div>
                  <div>
                    <label className={label}>Free delivery applies to</label>
                    <select value={freeFor} onChange={(e) => setFreeFor(e.target.value)} className={input}>
                      <option value="online">Online Payment only</option>
                      <option value="cod">Cash on Delivery only</option>
                      <option value="both">Both payment methods</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <p className={`text-xs mt-4 leading-relaxed ${muted}`}>Customers will read: <strong className={accentText}>{deliveryNote(draft).en}</strong></p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {saveButton('delivery')}
            </div>
            {msg && msgAt === 'delivery' && <p className={`mt-3 ${msgClass(msg)}`}>{msg}</p>}
          </>
        )}
      </div>
    </div>
  );
}
