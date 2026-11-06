import React, { useState } from 'react';
import { Smartphone, Landmark, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { BKASH_RE, cleanBank, bankProblem, cleanName, saveSellerPayout } from '../sellers';

// Seller dashboard -> Earnings & Payout: where Kyvro sends the seller's markup. Up to 2 bKash numbers and up to 2 bank
// accounts. Write only: the seller cannot read it back (only the Owner sees it in Sellers), so the form starts empty and
// saving replaces everything that was saved before. Text in English + Bangla.
const EMPTY_BANK = { bank: '', account: '', holder: '', branch: '', routing: '', swift: '' };
const BANK_FIELDS = [
  ['bank', 'Bank Name', 'ব্যাংকের নাম', 'e.g. Dutch-Bangla Bank', true],
  ['account', 'Account Number', 'অ্যাকাউন্ট নম্বর', 'e.g. 1234567890123', true, 'numeric'],
  ['holder', 'Account Holder Name', 'অ্যাকাউন্টধারীর নাম', 'Name as in the bank', true],
  ['branch', 'Branch Name', 'শাখার নাম', 'e.g. Dhanmondi', true],
  ['routing', 'Routing Number', 'রাউটিং নম্বর', '9 digits (optional)', false, 'numeric'],
  ['swift', 'SWIFT Code', 'সুইফট কোড', 'e.g. DBBLBDDH (optional)', false],
];

export default function PayoutForm({ uid, isDarkMode, disabled = false }) {
  const [bkash, setBkash] = useState(['', '']);
  const [bkashName, setBkashName] = useState(['', '']);
  const [banks, setBanks] = useState([]);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // what was just saved (masked), shown until the page is left

  const input = `block mt-1 w-full border p-2 text-sm rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;
  const box = `rounded-xl border p-4 space-y-3 ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-gray-50'}`;
  const lab = 'text-xs font-semibold text-gray-500';
  const bn = 'font-normal text-gray-400';

  const setBank = (i, k, v) => setBanks((l) => l.map((b, j) => (j === i ? { ...b, [k]: v } : b)));

  const save = async () => {
    setMsg(null);
    const nums = bkash.map((n) => n.replace(/\D/g, ''));
    const names = bkashName.map(cleanName);
    for (const [i, n] of nums.entries()) {
      if (n && !BKASH_RE.test(n)) { setMsg({ type: 'err', text: `bKash ${i + 1}: write an 11-digit number, e.g. 01712345678 / ১১ সংখ্যার বিকাশ নম্বর লিখুন` }); return; }
      if (n && names[i].length < 2) { setMsg({ type: 'err', text: `bKash ${i + 1}: write the account name / বিকাশ অ্যাকাউন্টের নাম লিখুন` }); return; }
      if (!n && names[i]) { setMsg({ type: 'err', text: `bKash ${i + 1}: write the number too / বিকাশ নম্বরও লিখুন` }); return; }
    }
    const list = banks.map(cleanBank);
    for (const [i, b] of list.entries()) {
      const p = bankProblem(b);
      if (p) { setMsg({ type: 'err', text: `Bank ${i + 1}: ${p}` }); return; }
    }
    const given = nums.map((n, i) => [n, names[i]]).filter(([n]) => n); // number 2 alone becomes number 1
    const [[b1, n1] = [], [b2, n2] = []] = given;
    if (!b1 && !list.length) { setMsg({ type: 'err', text: 'Add a bKash number or a bank account. / একটি বিকাশ নম্বর বা ব্যাংক অ্যাকাউন্ট দিন।' }); return; }
    setSaving(true);
    try {
      await saveSellerPayout(uid, { bkash: b1 || '', bkashName: n1 || '', bkash2: b2 || '', bkash2Name: n2 || '', banks: list });
      setSaved({ bkash: given.map(([n, name]) => `••••${n.slice(-3)} (${name})`), banks: list.map((b) => `${b.bank} ••••${b.account.slice(-4)}`) });
      setBkash(['', '']); setBkashName(['', '']); setBanks([]);
      setMsg({ type: 'ok', text: 'Saved. Only Kyvro can see it. / সেভ হয়েছে। শুধু Kyvro দেখতে পারবে।' });
    } catch (e) {
      setMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Could not save. Open your shop first. / সেভ হয়নি। আগে দোকান খুলুন।' : e.message });
    }
    setSaving(false);
  };

  return (
    <fieldset disabled={disabled} className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs text-gray-500">Kyvro sends your markup here. Add up to 2 bKash numbers and up to 2 bank accounts. Fields with * are required.</p>
        <p className="text-xs text-gray-500 leading-relaxed">ডেলিভারি হওয়া অর্ডারের মার্কআপ (আপনার আয়) Kyvro এখানে পাঠাবে। সর্বোচ্চ ২টি বিকাশ নম্বর এবং ২টি ব্যাংক অ্যাকাউন্ট দিতে পারবেন; অন্তত একটি দিতে হবে। * চিহ্নিত ঘরগুলো অবশ্যই পূরণ করুন।</p>
        <p className="flex items-start gap-1.5 text-[11px] text-gray-500"><ShieldCheck size={14} className="shrink-0 mt-0.5 text-green-600" />
          <span>For your safety only Kyvro can see these details, so they are not shown here after saving. Saving again replaces everything. / নিরাপত্তার জন্য সেভ করার পর এগুলো এখানে দেখানো হয় না, শুধু Kyvro দেখে। আবার সেভ করলে আগের সব তথ্য বদলে যাবে, তাই সব একসাথে দিন।</span></p>
      </div>

      {/* bKash */}
      <div className={box}>
        <p className="flex items-center gap-2 font-bold text-sm">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#E2136E] text-white"><Smartphone size={16} /></span>
          bKash <span className={bn}>(বিকাশ, পার্সোনাল নম্বর)</span>
        </p>
        {[0, 1].map((i) => (
          <div key={i} className={`grid sm:grid-cols-2 gap-3 ${i ? 'pt-3 border-t border-gray-500/15' : ''}`}>
            <label className={lab}>bKash number {i + 1}{i === 0 ? '' : ' (optional)'} <span className={bn}>· বিকাশ নম্বর {i === 0 ? '১' : '২ (ঐচ্ছিক)'}</span>
              <input className={input} inputMode="numeric" maxLength={14} placeholder="017XXXXXXXX" value={bkash[i]} onChange={(e) => setBkash((l) => l.map((x, j) => (j === i ? e.target.value : x)))} />
            </label>
            <label className={lab}>bKash account name{bkash[i].trim() ? ' *' : ''} <span className={bn}>· বিকাশ অ্যাকাউন্টের নাম{bkash[i].trim() ? ' (অবশ্যই)' : ''}</span>
              <input className={input} maxLength={80} placeholder="Name on this bKash account" value={bkashName[i]} onChange={(e) => setBkashName((l) => l.map((x, j) => (j === i ? e.target.value : x)))} />
            </label>
          </div>
        ))}
      </div>

      {/* bank accounts */}
      {banks.map((b, i) => (
        <div key={i} className={box}>
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-bold text-sm">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4AF37] text-black"><Landmark size={16} /></span>
              Bank account {i + 1} <span className={bn}>(ব্যাংক অ্যাকাউন্ট {i === 0 ? '১' : '২'})</span>
            </p>
            <button type="button" onClick={() => setBanks((l) => l.filter((_, j) => j !== i))} className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline"><Trash2 size={14} />Remove</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {BANK_FIELDS.map(([k, en, bnLabel, ph, req, mode]) => (
              <label key={k} className={lab}>{en}{req ? ' *' : ''} <span className={bn}>· {bnLabel}{req ? '' : ' (ঐচ্ছিক)'}</span>
                <input className={input} inputMode={mode} maxLength={k === 'swift' ? 11 : 80} placeholder={ph} value={b[k]} onChange={(e) => setBank(i, k, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
      ))}
      {banks.length < 2 && (
        <button type="button" onClick={() => setBanks((l) => [...l, { ...EMPTY_BANK }])}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed text-sm font-semibold transition hover:border-[#D4AF37] ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
          <Plus size={16} /><Landmark size={16} />Add bank account <span className={bn}>· ব্যাংক অ্যাকাউন্ট যোগ করুন</span>
        </button>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving} onClick={save} className="bg-[#D4AF37] text-black font-bold px-6 py-2.5 rounded text-xs uppercase tracking-wider disabled:opacity-50">{saving ? 'Saving...' : 'Save payout details'}</button>
        {saved && <span className="text-xs text-gray-500">Saved: {[...saved.bkash.map((x) => `bKash ${x}`), ...saved.banks].join(' · ')}</span>}
      </div>
      {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
    </fieldset>
  );
}
