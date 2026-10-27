import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { pushSupported, pushPermission, enablePush, syncPushIfGranted, shouldAskPush, dismissPushAsk, listenForeground } from '../push';

// Small card for signed-in customers: "Allow alerts" -> browser permission popup
export default function PushPrompt({ customerUser, isDarkMode }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!customerUser || !customerUser.uid) { setShow(false); return undefined; }
    let cancelled = false;
    let unsub = () => {};
    let timer;
    (async () => {
      if (!(await pushSupported()) || cancelled) return;
      const perm = pushPermission();
      if (perm === 'granted') {
        syncPushIfGranted(customerUser);
        unsub = listenForeground();
      } else if (perm === 'default' && shouldAskPush()) {
        timer = setTimeout(() => { if (!cancelled) setShow(true); }, 2500);
      }
    })();
    return () => { cancelled = true; clearTimeout(timer); try { unsub(); } catch (e) { /* ignore */ } };
  }, [customerUser]);

  if (!show) return null;

  const allow = async () => {
    setBusy(true);
    try { await enablePush(customerUser); } catch (e) { console.error(e); }
    setBusy(false);
    setShow(false);
  };
  const later = () => { dismissPushAsk(); setShow(false); };

  return (
    <div className={`fixed z-50 bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 rounded-lg border shadow-2xl p-4 ${isDarkMode ? 'bg-[#161616] border-gray-700 text-white' : 'bg-white border-gray-200 text-black'}`}>
      <button onClick={later} aria-label="Close" className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>
      <div className="flex items-start gap-3 pr-5">
        <div className="shrink-0 w-9 h-9 rounded-full bg-[#D4AF37] text-black flex items-center justify-center"><Bell size={18} /></div>
        <div className="text-xs">
          <p className="font-bold text-sm mb-1">Get offer alerts</p>
          <p className="text-gray-500 leading-relaxed">Allow notifications and we will tell you about new discounts and arrivals. No spam.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={allow} disabled={busy} className="bg-[#D4AF37] text-black font-bold px-4 py-2 rounded uppercase tracking-widest text-[10px] hover:opacity-90 disabled:opacity-50">{busy ? '...' : 'Allow'}</button>
            <button onClick={later} className="px-4 py-2 rounded border border-gray-400/40 text-[10px] uppercase tracking-widest">Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
