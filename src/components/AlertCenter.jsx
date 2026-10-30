import React, { useEffect, useState } from 'react';

// Replaces the plain browser pop-up (alert) with a premium message in the middle of the page.
// Every existing alert("...") in the website now shows here automatically - nothing else has to change.
// Success messages close by themselves; problems and warnings wait for OK.
let queue = [];
let listeners = [];
let nextId = 1;
const emit = () => listeners.forEach((fn) => fn([...queue]));

const kindOf = (msg) => {
  const m = String(msg).toLowerCase();
  if (/^(only|sorry|your admin access)/.test(m)) return /^your/.test(m) ? 'info' : 'warn';
  if (/(success|saved|updated|added|sent|deleted|removed|copied|done|created|approved|unblocked|blocked|published|restored|cleared)/.test(m) && !/(fail|error|could not|cannot|can't|not saved|unable)/.test(m)) return 'success';
  if (/(fail|error|could not|cannot|can't|unable|denied|invalid|too big|too large|already|wrong|not allowed|permission)/.test(m)) return 'error';
  if (/(please|must|need|required|enter|choose|select|add a|add at|upload)/.test(m)) return 'warn';
  return 'info';
};

// Premium yes/no question in the middle of the page (replaces confirm). Usage: if (!(await askConfirm('Delete this?'))) return;
let askQueue = [];
let askListeners = [];
let askId = 1;
const emitAsk = () => askListeners.forEach((fn) => fn([...askQueue]));
export function askConfirm(message, opts = {}) {
  return new Promise((resolve) => {
    const text = String(message == null ? '' : message);
    const danger = opts.danger !== undefined ? opts.danger : /(delete|remove|permanently|block|cannot be undone|clear|lose money|reject|cancel order)/i.test(text);
    askQueue.push({ id: askId++, text, danger, yes: opts.confirmText || (danger ? 'Yes, continue' : 'Confirm'), no: opts.cancelText || 'Cancel', resolve });
    emitAsk();
  });
}

export function showAlert(message) {
  const text = String(message == null ? '' : message);
  if (!text.trim()) return;
  queue.push({ id: nextId++, text, kind: kindOf(text) });
  emit();
}

if (typeof window !== 'undefined' && !window.__kyvroAlert) {
  window.__kyvroAlert = true;
  window.alert = (m) => showAlert(m);
}

const LOOK = {
  success: { ring: '#22c55e', glow: 'rgba(34,197,94,.35)', title: 'Done', icon: <path d="M5 13l4 4L19 7" /> },
  error:   { ring: '#ef4444', glow: 'rgba(239,68,68,.35)', title: 'Something went wrong', icon: <path d="M6 6l12 12M18 6L6 18" /> },
  warn:    { ring: '#f59e0b', glow: 'rgba(245,158,11,.35)', title: 'Please check', icon: <path d="M12 7v6m0 4h.01" /> },
  info:    { ring: '#D4AF37', glow: 'rgba(212,175,55,.35)', title: 'Notice', icon: <path d="M12 11v6m0-10h.01" /> },
};
const AUTO_MS = 2600;

export default function AlertCenter({ isDarkMode }) {
  const [items, setItems] = useState([]);
  const [asks, setAsks] = useState([]);
  useEffect(() => {
    listeners.push(setItems);
    askListeners.push(setAsks);
    setItems([...queue]);
    setAsks([...askQueue]);
    return () => { listeners = listeners.filter((l) => l !== setItems); askListeners = askListeners.filter((l) => l !== setAsks); };
  }, []);

  const ask = asks[0];
  const answer = (v) => { const a = askQueue[0]; if (!a) return; askQueue = askQueue.slice(1); emitAsk(); a.resolve(v); };
  useEffect(() => {
    if (!ask) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') answer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ask && ask.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = items[0];
  const close = () => { queue = queue.slice(1); emit(); };

  useEffect(() => {
    if (!cur || cur.kind !== 'success') return undefined;
    const t = setTimeout(close, AUTO_MS);
    return () => clearTimeout(t);
  }, [cur && cur.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cur) return undefined;
    const onKey = (e) => { if (e.key === 'Enter' || e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cur && cur.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (ask) {
    const ring = ask.danger ? '#ef4444' : '#D4AF37';
    const glow = ask.danger ? 'rgba(239,68,68,.35)' : 'rgba(212,175,55,.35)';
    return (
      <div className="fixed inset-0 z-[310] flex items-center justify-center px-4" role="alertdialog" aria-modal="true" onClick={() => answer(false)}
        style={{ background: 'rgba(8,8,12,.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', animation: 'kvFade .18s ease-out' }}>
        <style>{`@keyframes kvFade{from{opacity:0}to{opacity:1}}@keyframes kvPop{0%{opacity:0;transform:translateY(14px) scale(.92)}100%{opacity:1;transform:none}}`}</style>
        <div onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-sm rounded-2xl overflow-hidden text-center px-7 pt-8 pb-6 border ${isDarkMode ? 'bg-[#15151a] border-white/10 text-white' : 'bg-white border-black/5 text-gray-900'}`}
          style={{ boxShadow: `0 24px 60px rgba(0,0,0,.45), 0 0 50px ${glow}`, animation: 'kvPop .26s cubic-bezier(.2,.9,.3,1.2)' }}>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${ring}, transparent)` }} />
          <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${ring}22`, boxShadow: `inset 0 0 0 2px ${ring}` }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={ring} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              {ask.danger ? <><path d="M12 8v5" /><path d="M12 17h.01" /></> : <><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" /><path d="M12 17h.01" /></>}
            </svg>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ring }}>{ask.danger ? 'Are you sure?' : 'Please confirm'}</p>
          <p className="text-[15px] leading-relaxed whitespace-pre-line break-words max-h-[40vh] overflow-y-auto">{ask.text}</p>
          {asks.length > 1 && <p className="mt-2 text-[11px] text-gray-500">+{asks.length - 1} more</p>}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => answer(false)}
              className={`py-3 rounded-xl text-xs font-bold uppercase tracking-[0.15em] border transition active:scale-[.98] ${isDarkMode ? 'border-white/15 text-gray-200 hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>{ask.no}</button>
            <button type="button" autoFocus onClick={() => answer(true)}
              className={`py-3 rounded-xl text-xs font-bold uppercase tracking-[0.15em] transition hover:brightness-105 active:scale-[.98] ${ask.danger ? 'text-white' : 'text-black'}`}
              style={{ background: ask.danger ? 'linear-gradient(135deg,#f87171,#ef4444 55%,#b91c1c)' : 'linear-gradient(135deg,#F2D675,#D4AF37 55%,#B8932A)', boxShadow: `0 8px 20px ${glow}` }}>{ask.yes}</button>
          </div>
        </div>
      </div>
    );
  }

  if (!cur) return null;
  const look = LOOK[cur.kind];
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4" role="alertdialog" aria-live="assertive" onClick={close}
      style={{ background: 'rgba(8,8,12,.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', animation: 'kvFade .18s ease-out' }}>
      <style>{`@keyframes kvFade{from{opacity:0}to{opacity:1}}@keyframes kvPop{0%{opacity:0;transform:translateY(14px) scale(.92)}100%{opacity:1;transform:none}}@keyframes kvDraw{to{stroke-dashoffset:0}}@keyframes kvBar{from{width:100%}to{width:0}}`}</style>
      <div onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm rounded-2xl overflow-hidden text-center px-7 pt-8 pb-6 border ${isDarkMode ? 'bg-[#15151a] border-white/10 text-white' : 'bg-white border-black/5 text-gray-900'}`}
        style={{ boxShadow: `0 24px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.04), 0 0 50px ${look.glow}`, animation: 'kvPop .26s cubic-bezier(.2,.9,.3,1.2)' }}>
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${look.ring}, transparent)` }} />
        <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${look.ring}22`, boxShadow: `inset 0 0 0 2px ${look.ring}` }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={look.ring} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray: 40, strokeDashoffset: 40, animation: 'kvDraw .45s .1s ease-out forwards' }}>{look.icon}</svg>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: look.ring }}>{look.title}</p>
        <p className="text-[15px] leading-relaxed whitespace-pre-line break-words">{cur.text}</p>
        {items.length > 1 && <p className="mt-2 text-[11px] text-gray-500">+{items.length - 1} more</p>}
        <button type="button" autoFocus onClick={close}
          className="mt-6 w-full py-3 rounded-xl text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:brightness-105 active:scale-[.98]"
          style={{ background: 'linear-gradient(135deg,#F2D675,#D4AF37 55%,#B8932A)', boxShadow: '0 8px 20px rgba(212,175,55,.35)' }}>
          OK
        </button>
        {cur.kind === 'success' && <div className="absolute bottom-0 left-0 h-[3px]" style={{ background: look.ring, animation: `kvBar ${AUTO_MS}ms linear forwards` }} />}
      </div>
    </div>
  );
}
