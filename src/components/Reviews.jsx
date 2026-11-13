import React, { useEffect, useState } from 'react';
import { Star, Trash2, BadgeCheck } from 'lucide-react';
import { watchProductReviews, saveReview, deleteReview, averageRating } from '../reviews';
import { askConfirm } from './AlertCenter';

// Stars: value 0-5 (halves rounded), or pickable when onPick is given
export function Stars({ value = 0, size = 14, onPick = null, className = '' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = shown >= n - 0.25 ? 'full' : shown >= n - 0.75 ? 'half' : 'none';
        const icon = (
          <span className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-gray-300 dark:text-gray-600" fill="currentColor" strokeWidth={0} />
            {fill !== 'none' && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: fill === 'half' ? size / 2 : size }}>
                <Star size={size} className="text-[#D4AF37]" fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </span>
        );
        return onPick ? (
          <button key={n} type="button" onClick={() => onPick(n)} onMouseEnter={() => setHover(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="p-0.5">{icon}</button>
        ) : <span key={n}>{icon}</span>;
      })}
    </span>
  );
}

const when = (v) => {
  const ms = v && typeof v.toMillis === 'function' ? v.toMillis() : Date.parse(v) || 0;
  return ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

// Product page: average + every review. canModerate (Owner / Manager) gets a Delete button.
export function ProductReviews({ productId, isDarkMode, canModerate = false, onSummary = null }) {
  const [list, setList] = useState(null);
  useEffect(() => watchProductReviews(productId, setList), [productId]);
  useEffect(() => { if (list && onSummary) onSummary({ count: list.length, avg: averageRating(list) }); }, [list]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!list) return null;
  const avg = averageRating(list);
  const remove = async (r) => {
    if (!(await askConfirm(`Delete ${r.name}'s review? It cannot be brought back.`, { danger: true, confirmText: 'Delete' }))) return;
    try { await deleteReview(r.id); } catch (e) { alert(e.message); }
  };
  return (
    <section id="reviews" className="mt-14">
      <h2 className="text-xl sm:text-2xl font-serif font-bold text-center mb-2">Customer Reviews</h2>
      {list.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No reviews yet. Bought this? After delivery you can review it from My Account → Orders.<span className="block">এখনো কোনো রিভিউ নেই। ডেলিভারির পর My Account → Orders থেকে রিভিউ দিতে পারবেন।</span></p>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Stars value={avg} size={20} />
            <span className="font-bold">{avg.toFixed(1)}</span>
            <span className="text-sm text-gray-500">({list.length} review{list.length === 1 ? '' : 's'})</span>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {list.map((r) => (
              <div key={r.id} className={`rounded-lg border p-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{r.name}</span>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-green-600"><BadgeCheck size={13} /> Verified buyer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{when(r.createdAt)}</span>
                    {canModerate && <button type="button" onClick={() => remove(r)} className="text-red-500 p-1" aria-label="Delete review"><Trash2 size={14} /></button>}
                  </div>
                </div>
                <Stars value={r.rating} size={14} className="mt-1" />
                {r.text && <p className={`mt-2 text-sm whitespace-pre-line ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{r.text}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// My Account → Orders: a Delivered order's item can be reviewed once (and changed later)
export function ReviewForm({ order, item, index, user, existing, isDarkMode }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing ? existing.rating : 5);
  const [text, setText] = useState(existing ? existing.text : '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const send = async () => {
    setBusy(true); setMsg(null);
    try {
      await saveReview({ order, item, index, user, rating, text });
      setOpen(false);
    } catch (e) {
      setMsg(e.code === 'permission-denied' ? 'Could not save the review. Only delivered orders can be reviewed.' : e.message);
    }
    setBusy(false);
  };
  if (!open) {
    return existing ? (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[11px] text-gray-500 underline"><Stars value={existing.rating} size={11} /> Edit review</button>
    ) : (
      <button type="button" onClick={() => setOpen(true)} className="text-[11px] font-bold text-[#B8921F] underline">★ Write a review · রিভিউ দিন</button>
    );
  }
  return (
    <div className={`mt-2 rounded-lg border p-3 space-y-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <Stars value={rating} size={22} onPick={setRating} />
      <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 600))} rows={3} placeholder="How was it? Fit, quality, colour… · কেমন লেগেছে?"
        className={`w-full border p-2 text-sm rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`} />
      <p className="text-[10px] text-gray-500">Only your first name shows with the review.</p>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={send} className="px-4 py-2 rounded bg-[#D4AF37] text-black text-xs font-bold uppercase disabled:opacity-50">{busy ? 'Saving…' : existing ? 'Update' : 'Post review'}</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded border border-gray-400 text-xs font-semibold">Cancel</button>
      </div>
      {msg && <p className="text-xs text-red-500">{msg}</p>}
    </div>
  );
}
