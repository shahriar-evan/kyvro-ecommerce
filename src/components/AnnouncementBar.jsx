import React, { useEffect, useRef, useState } from 'react';

// Scroll speed in pixels per second. Same speed for short and long text, slower on phones so it is easy to read.
const SPEED_DESKTOP = 45;
const SPEED_MOBILE = 32;

export default function AnnouncementBar({ announcementText, speed = 100, isDarkMode }) {
  const wrap = useRef(null);
  const unit = useRef(null);
  const [anim, setAnim] = useState({ copies: 2, seconds: 60 });

  useEffect(() => {
    const measure = () => {
      if (!wrap.current || !unit.current) return;
      const viewport = wrap.current.clientWidth || window.innerWidth;
      const w = unit.current.offsetWidth || 1;
      const half = Math.max(1, Math.ceil(viewport / w)); // copies in one half, so the half is at least as wide as the screen
      const base = viewport < 640 ? SPEED_MOBILE : SPEED_DESKTOP;
      const speedPx = base * (Number(speed) || 100) / 100;
      setAnim({ copies: half * 2, seconds: Math.max(4, (w * half) / speedPx) });
    };
    measure();
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 400); // again after fonts are loaded
    return () => { window.removeEventListener('resize', measure); clearTimeout(t); };
  }, [announcementText, speed]);

  const renderUnit = (refEl, key) => (
    <span key={key} ref={refEl} className="inline-block pr-12">
      {announcementText} &nbsp;&nbsp;&bull;&nbsp;&nbsp; 24/7 Customer Support: kyvrofashion@gmail.com &nbsp;&nbsp;&bull;&nbsp;&nbsp;
    </span>
  );

  return (
    <>
      <div ref={wrap} className={`text-[11px] sm:text-xs font-semibold py-2 overflow-hidden whitespace-nowrap border-b tracking-wider ${isDarkMode ? 'bg-[#1a1a1a] text-[#D4AF37] border-gray-800' : 'bg-gray-100 text-black border-gray-200'}`}>
        <div className="kyvro-marquee" style={{ animationDuration: `${anim.seconds}s` }}>
          {renderUnit(unit, 'first')}
          {Array.from({ length: anim.copies - 1 }).map((_, i) => renderUnit(null, i))}
        </div>
      </div>
    </>
  );
}
