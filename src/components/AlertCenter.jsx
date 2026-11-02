import React, { useEffect, useState } from 'react';
import { WHATSAPP_NUMBER } from '../data/shopConfig';

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

// Premium text box (replaces prompt). Usage: const v = await askInput('Order number?', { placeholder: 'e.g. SS-123' }); v is null when cancelled.
export function askInput(message, opts = {}) {
  return new Promise((resolve) => {
    askQueue.push({ id: askId++, text: String(message == null ? '' : message), danger: false, input: true, placeholder: opts.placeholder || '', initial: opts.initial || '', yes: opts.confirmText || 'OK', no: opts.cancelText || 'Cancel', resolve });
    emitAsk();
  });
}

export function showAlert(message) {
  const text = String(message == null ? '' : message);
  if (!text.trim()) return;
  queue.push({ id: nextId++, text, kind: kindOf(text) });
  emit();
}

// Maintenance notice: a calm premium card that stays for 15 seconds (OK closes it right away).
// getWaText (optional) builds the WhatsApp message (the customer's cart) at the moment the WhatsApp button is pressed.
export const MAINT_MS = 15000;
export function showMaintenance(message, getWaText) {
  const text = String(message == null ? '' : message);
  if (!text.trim()) return;
  queue.push({ id: nextId++, text, kind: 'maint', ms: MAINT_MS, getWaText });
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
  const [inputVal, setInputVal] = useState('');
  useEffect(() => {
    listeners.push(setItems);
    askListeners.push(setAsks);
    setItems([...queue]);
    setAsks([...askQueue]);
    return () => { listeners = listeners.filter((l) => l !== setItems); askListeners = askListeners.filter((l) => l !== setAsks); };
  }, []);

  const ask = asks[0];
  const answer = (v) => { const a = askQueue[0]; if (!a) return; askQueue = askQueue.slice(1); emitAsk(); a.resolve(a.input ? (v ? inputVal.trim() : null) : v); };
  useEffect(() => { setInputVal(ask && ask.input ? ask.initial : ''); }, [ask && ask.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ask) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') answer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ask && ask.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = items[0];
  const close = () => { queue = queue.slice(1); emit(); };

  useEffect(() => {
    if (!cur || (cur.kind !== 'success' && cur.kind !== 'maint')) return undefined;
    const t = setTimeout(close, cur.ms || AUTO_MS);
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
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ring }}>{ask.input ? 'Almost done' : ask.danger ? 'Are you sure?' : 'Please confirm'}</p>
          <p className="text-[15px] leading-relaxed whitespace-pre-line break-words max-h-[40vh] overflow-y-auto">{ask.text}</p>
          {ask.input && (
            <input type="text" autoFocus value={inputVal} placeholder={ask.placeholder}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') answer(true); }}
              className={`mt-4 w-full rounded-xl border px-4 py-3 text-sm text-center outline-none transition focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#0e0e13] border-white/15 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-300 text-black placeholder-gray-400'}`} />
          )}
          {asks.length > 1 && <p className="mt-2 text-[11px] text-gray-500">+{asks.length - 1} more</p>}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => answer(false)}
              className={`py-3 rounded-xl text-xs font-bold uppercase tracking-[0.15em] border transition active:scale-[.98] ${isDarkMode ? 'border-white/15 text-gray-200 hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>{ask.no}</button>
            <button type="button" autoFocus={!ask.input} onClick={() => answer(true)}
              className={`py-3 rounded-xl text-xs font-bold uppercase tracking-[0.15em] transition hover:brightness-105 active:scale-[.98] ${ask.danger ? 'text-white' : 'text-black'}`}
              style={{ background: ask.danger ? 'linear-gradient(135deg,#f87171,#ef4444 55%,#b91c1c)' : 'linear-gradient(135deg,#F2D675,#D4AF37 55%,#B8932A)', boxShadow: `0 8px 20px ${glow}` }}>{ask.yes}</button>
          </div>
        </div>
      </div>
    );
  }

  if (!cur) return null;
  if (cur.kind === 'maint') {
    const parts = cur.text.split(/\n\s*\n/);
    const main = parts[0];
    const rest = parts.slice(1).join('\n\n');
    const waFor = (t) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t)}`;
    const wa = waFor('Hello Kyvro, I want to place an order manually.');
    const gold = '#D4AF37';
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center px-4" role="alertdialog" aria-live="polite" onClick={close}
        style={{ background: 'rgba(8,8,12,.62)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', animation: 'kvFade .35s ease-out' }}>
        <style>{`@keyframes kvFade{from{opacity:0}to{opacity:1}}@keyframes kvPopSlow{0%{opacity:0;transform:translateY(22px) scale(.95)}100%{opacity:1;transform:none}}@keyframes kvBar{from{width:100%}to{width:0}}@keyframes kvSpin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}@keyframes kvPulse{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.35)}50%{box-shadow:0 0 0 12px rgba(212,175,55,0)}}`}</style>
        <div onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md rounded-3xl overflow-hidden text-center px-6 sm:px-8 pt-9 pb-7 border ${isDarkMode ? 'bg-gradient-to-b from-[#1b1a16] to-[#121214] border-[#D4AF37]/25 text-white' : 'bg-gradient-to-b from-[#fffdf6] to-white border-[#D4AF37]/30 text-gray-900'}`}
          style={{ boxShadow: '0 28px 70px rgba(0,0,0,.5), 0 0 60px rgba(212,175,55,.22)', animation: 'kvPopSlow .7s cubic-bezier(.2,.8,.2,1)' }}>
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${gold}, #F2D675, ${gold}, transparent)` }} />
          <div className="mx-auto mb-5 w-[72px] h-[72px] rounded-full flex items-center justify-center" style={{ background: 'radial-gradient(circle at 30% 25%, rgba(242,214,117,.35), rgba(212,175,55,.12))', boxShadow: `inset 0 0 0 2px ${gold}`, animation: 'kvPulse 2.6s ease-in-out infinite' }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'kvSpin 9s linear infinite' }}>
              <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z" />
            </svg>
          </div>
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] mb-3" style={{ color: gold }}>Maintenance Mode</p>
          <p className="text-[15px] sm:text-base leading-[1.85] font-medium whitespace-pre-line break-words">{main}</p>
          {rest && (
            <>
              <div className="my-5 flex items-center gap-3 px-6">
                <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,.6))' }} />
                <span className="w-1.5 h-1.5 rotate-45" style={{ background: gold }} />
                <span className="h-px flex-1" style={{ background: 'linear-gradient(270deg, transparent, rgba(212,175,55,.6))' }} />
              </div>
              <p className={`text-[13px] leading-relaxed whitespace-pre-line break-words ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{rest}</p>
            </>
          )}
          <div className="mt-7 flex flex-col gap-3">
            <button type="button" autoFocus onClick={close}
              className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-[0.25em] text-black transition hover:brightness-105 active:scale-[.98]"
              style={{ background: 'linear-gradient(135deg,#F2D675,#D4AF37 55%,#B8932A)', boxShadow: '0 10px 24px rgba(212,175,55,.35)' }}>
              OK
            </button>
            <a href={wa} target="_blank" rel="noopener noreferrer"
              onClick={(e) => { try { const t = cur.getWaText && cur.getWaText(); if (t) e.currentTarget.href = waFor(t); } catch (err) { /* keep the plain link */ } close(); }}
              className={`w-full py-3 rounded-xl text-xs font-bold tracking-[0.12em] border transition active:scale-[.98] inline-flex items-center justify-center gap-2 ${isDarkMode ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10' : 'border-emerald-500/50 text-emerald-600 hover:bg-emerald-50'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" /></svg>
              WhatsApp এ অর্ডার করুন
            </a>
          </div>
          <div className="absolute bottom-0 left-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${gold}, #F2D675)`, animation: `kvBar ${cur.ms || MAINT_MS}ms linear forwards` }} />
        </div>
      </div>
    );
  }

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
