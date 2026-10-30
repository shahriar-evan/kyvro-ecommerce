import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { pushSupported, pushPermission, enablePush, warmPush, syncPushIfGranted, shouldAskPush, dismissPushAsk, listenForeground } from '../push';

// Centered card for signed-in customers: "Allow" -> browser permission popup
export default function PushPrompt({ customerUser, isDarkMode }) {
  const [show, setShow] = useState(false);

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
        warmPush(); // get things ready while the card is waiting
        timer = setTimeout(() => { if (!cancelled) setShow(true); }, 2500);
      }
    })();
    return () => { cancelled = true; clearTimeout(timer); try { unsub(); } catch (e) { /* ignore */ } };
  }, [customerUser]);

  if (!show) return null;

  // Close the card at once; the browser popup and the saving happen on their own
  const allow = () => {
    setShow(false);
    enablePush(customerUser).then((r) => { if (!r.ok) dismissPushAsk(); }).catch((e) => { console.error(e); });
  };
  const later = () => { dismissPushAsk(); setShow(false); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={later}>
      <div onClick={(e) => e.stopPropagation()} className={`relative w-full max-w-sm rounded-xl border shadow-2xl p-6 text-center ${isDarkMode ? 'bg-[#161616] border-gray-700 text-white' : 'bg-white border-gray-200 text-black'}`}>
        <button onClick={later} aria-label="Close" className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-[#D4AF37] text-black flex items-center justify-center"><Bell size={26} /></div>
        <p className="font-bold text-lg mb-2">Get offer alerts</p>
        <p className="text-sm text-gray-500 leading-relaxed">Allow notifications and we will tell you about new discounts and arrivals. No spam.</p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={allow} className="bg-[#D4AF37] text-black font-bold px-10 py-3 rounded uppercase tracking-widest text-xs hover:opacity-90 active:scale-95">Allow</button>
          <button onClick={later} className="px-6 py-3 rounded border border-gray-400/40 text-xs uppercase tracking-widest">Not now</button>
        </div>
      </div>
    </div>
  );
}
