import React, { useEffect, useState } from 'react';
import { saveStoreSettings } from '../storeSettings';
import { countSubscribers, sendOfferEmail } from '../subscribers';
import { normalizeSettings, bestDiscount, nextReward, describeRule, bannerFromRules } from '../data/shopConfig';

// Owner-only editor: top banner text + automatic discount rules
export default function StoreSettings({ settings, isDarkMode, staff, formatPrice }) {
  const [text, setText] = useState(settings.announcementText);
  const [enabled, setEnabled] = useState(settings.discountEnabled);
  const [rules, setRules] = useState(settings.discountRules.map((r) => ({ ...r })));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [testTotal, setTestTotal] = useState('4000');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [mailBusy, setMailBusy] = useState(false);
  const [mailMsg, setMailMsg] = useState('');
  const [counts, setCounts] = useState(null);
  const loadCounts = () => countSubscribers().then(setCounts).catch(() => setCounts(null));
  useEffect(() => { loadCounts(); }, []);

  // Pick up changes saved from another device
  useEffect(() => {
    setText(settings.announcementText);
    setEnabled(settings.discountEnabled);
    setRules(settings.discountRules.map((r) => ({ ...r })));
  }, [settings]);

  const card = `rounded-lg border p-5 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const input = `w-full border rounded px-3 py-2 text-sm outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#0f0f0f] border-gray-700' : 'bg-white border-gray-300'}`;

  const draft = normalizeSettings({ announcementText: text, discountEnabled: enabled, discountRules: rules });
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
    if (!testOnly) {
      const n = counts ? counts.active : 0;
      if (!window.confirm(`Send this email to ${n} subscribed customer${n === 1 ? '' : 's'} now? It cannot be undone.`)) return;
    }
    setMailBusy(true);
    try {
      const r = await sendOfferEmail({ subject: mailSubject.trim(), message: mailBody.trim(), testOnly });
      setMailMsg(testOnly ? 'Test email sent to your own address.' : `Sent to ${r.sent} customer${r.sent === 1 ? '' : 's'}${r.failed ? ` (${r.failed} failed)` : ''}.`);
    } catch (e) { setMailMsg('Error: ' + e.message); }
    setMailBusy(false);
  };

  // One click: the banner text above goes out as an offer email to every subscribed customer
  const sendBannerMail = async () => {
    setMailMsg('');
    const t = (text || '').trim();
    if (t.length < 10) { setMailMsg('Error: the banner text is too short to send.'); return; }
    const n = counts ? counts.active : 0;
    if (!window.confirm(`Send this banner as an email to ${n} subscribed customer${n === 1 ? '' : 's'}?\n\n"${t}"\n\nIt cannot be undone.`)) return;
    setMailBusy(true);
    try {
      const r = await sendOfferEmail({ subject: 'Kyvro: ' + t.slice(0, 90), message: `${t}\n\nVisit kyvro.store to see what is new.`, testOnly: false });
      setMailMsg(`Sent to ${r.sent} customer${r.sent === 1 ? '' : 's'}${r.failed ? ` (${r.failed} failed)` : ''}.`);
    } catch (e) { setMailMsg('Error: ' + e.message); }
    setMailBusy(false);
  };

  const save = async () => {
    setMsg('');
    const bad = rules.some((r) => !(Number(r.min) > 0) || !(Number(r.value) > 0));
    if (enabled && bad) { setMsg('Error: every discount rule needs a minimum total and a value above 0 (or delete the empty rule).'); return; }
    if (rules.some((r) => r.type === 'percent' && Number(r.value) > 100)) { setMsg('Error: a percent discount cannot be more than 100.'); return; }
    setSaving(true);
    try {
      await saveStoreSettings(draft, staff);
      setMsg('Saved. The banner and the discount are live on the website now.');
    } catch (err) {
      console.error(err);
      setMsg('Could not save: ' + (err.code === 'permission-denied' ? 'only the Owner can change store settings (check the Firestore rules).' : err.message));
    }
    setSaving(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,48rem)_minmax(0,26rem)] gap-6 items-start">
    <div className="space-y-6 min-w-0">
      <div className={card}>
        <h3 className="font-bold text-sm uppercase tracking-wider mb-1">Top Banner Text</h3>
        <p className="text-xs text-gray-500 mb-3">This text scrolls in the bar at the very top of the website.</p>
        <textarea rows={2} maxLength={200} value={text} onChange={(e) => setText(e.target.value)} className={input} />
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <button type="button" onClick={() => setText(bannerFromRules(draft))} className="text-xs underline text-[#D4AF37]">Write it from my discount rules</button>
          <span className="text-[11px] text-gray-500">{text.length}/200</span>
          <button type="button" onClick={sendBannerMail} disabled={mailBusy} className="ml-auto border border-[#D4AF37] text-[#D4AF37] font-bold px-4 py-2 rounded text-xs uppercase tracking-widest hover:bg-[#D4AF37]/10 disabled:opacity-50">{mailBusy ? 'Sending...' : 'Send this banner as email'}</button>
        </div>
        {mailMsg && <p className={`text-xs mt-2 ${mailMsg.startsWith('Error') ? 'text-red-500' : 'text-green-500'}`}>{mailMsg}</p>}
      </div>

      <div className={card}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="font-bold text-sm uppercase tracking-wider">Automatic Discount</h3>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-[#D4AF37]" />
            {enabled ? 'ON' : 'OFF'}
          </label>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          When the cart total (before delivery) reaches a minimum, the discount is applied automatically. The highest tier the customer reaches is the one that applies (for example 3500 BDT = 20%, 6000 BDT = 25%).
        </p>

        <div className="space-y-3">
          {rules.length === 0 && <p className="text-xs text-gray-500">No rules yet. Add one below.</p>}
          {rules.map((r, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
              <div>
                <label className="block text-[11px] font-semibold mb-1">Cart total at least (BDT)</label>
                <input type="number" min="1" value={r.min} onChange={(e) => setRule(i, { min: e.target.value })} className={input} placeholder="3500" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Discount type</label>
                <select value={r.type} onChange={(e) => setRule(i, { type: e.target.value })} className={input}>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed amount (BDT)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">{r.type === 'percent' ? 'Percent off' : 'BDT off'}</label>
                <input type="number" min="1" max={r.type === 'percent' ? 100 : undefined} value={r.value} onChange={(e) => setRule(i, { value: e.target.value })} className={input} placeholder={r.type === 'percent' ? '20' : '300'} />
              </div>
              <button type="button" onClick={() => removeRule(i)} className="text-xs text-red-500 border border-red-500/40 rounded px-3 py-2 hover:bg-red-500/10">Delete</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addRule} disabled={rules.length >= 10} className="mt-4 text-xs font-bold border border-[#D4AF37] text-[#D4AF37] rounded px-4 py-2 hover:bg-[#D4AF37]/10 disabled:opacity-40">+ Add another rule</button>

        <div className={`mt-5 rounded border p-4 text-xs space-y-2 ${isDarkMode ? 'border-gray-800 bg-[#0f0f0f]' : 'border-gray-200 bg-gray-50'}`}>
          <p className="font-bold uppercase tracking-wider text-[11px] text-gray-500">Try it</p>
          <div className="flex items-center gap-2">
            <span>If the cart total is</span>
            <input type="number" min="0" value={testTotal} onChange={(e) => setTestTotal(e.target.value)} className={`${input} !w-28`} />
            <span>BDT:</span>
          </div>
          <p>
            {hit.rule
              ? <>Customer gets <strong className="text-[#D4AF37]">{describeRule(hit.rule)}</strong> = {formatPrice(hit.amount)} off. Pays {formatPrice(t - hit.amount)} + delivery.</>
              : 'No discount at this total.'}
          </p>
          {next && <p className="text-gray-500">Next reward: spend {formatPrice(next.missing)} more to get {describeRule(next.rule)}.</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={saving} className="bg-[#D4AF37] text-black font-bold px-8 py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {msg && <p className={`text-xs ${msg.startsWith('Error') || msg.startsWith('Could not') ? 'text-red-500' : 'text-green-500'}`}>{msg}</p>}
      </div>
    </div>
    <div className="min-w-0">
        <div className={`${card} lg:sticky lg:top-4`}>
          <h3 className="font-bold text-sm mb-1">Send offer email</h3>
          <p className="text-xs text-gray-500 mb-3">
            Customers who signed in with Google are on the list unless they switched it off. Nothing is sent until you press the button.
            {counts && <> Subscribed now: <strong className="text-[#D4AF37]">{counts.active}</strong> of {counts.total}.</>}
          </p>
          <div className="space-y-3">
            <input value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} maxLength={150} placeholder="Email subject" className={input} />
            <textarea value={mailBody} onChange={(e) => setMailBody(e.target.value)} maxLength={4000} rows={6} placeholder="Message (e.g. Eid offer: 10% off above 3000 BDT...)" className={input} />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={fillMail} className="text-xs underline text-[#D4AF37]">Fill from banner text</button>
              <button type="button" onClick={() => sendMail(true)} disabled={mailBusy} className="border border-[#D4AF37] text-[#D4AF37] font-bold px-5 py-2.5 rounded text-xs uppercase tracking-widest disabled:opacity-50">Send test to me</button>
              <button type="button" onClick={() => sendMail(false)} disabled={mailBusy} className="bg-[#D4AF37] text-black font-bold px-5 py-2.5 rounded text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50">{mailBusy ? 'Sending...' : `Send to all${counts ? ` (${counts.active})` : ''}`}</button>
            </div>
            {mailMsg && <p className={`text-xs ${mailMsg.startsWith('Error') ? 'text-red-500' : 'text-green-500'}`}>{mailMsg}</p>}
          </div>
        </div>
    </div>
    </div>
  );
}