import React, { useId } from 'react';

// The Kyvro mark: a solid hexagon with a K cut out of it (a straight cut beside the stem with a thin solid
// line down its middle, a V cut at the top and bottom) and a notch on the right. No background: the cuts are
// a mask, so the page colour shows through them.
//   Classic theme: black hexagon in light mode, white in dark mode, gold notch.
//   Other store themes (Minimal, Bold, Boutique): gold hexagon, black notch in light mode, white in dark mode
//   (index.css, `[data-theme] .kyvro-mark`, so it follows the theme the page shows).
// The round badge (Facebook / Instagram picture) is only in public/brand/kyvro-badge-*.svg.
// Same drawing in public/brand/*.svg, public/favicon.svg and the PNGs (scripts/brand-assets.py); change all together.
export const HEX = '50,6 88,28 88,72 50,94 12,72 12,28';
export const NOTCH = '88,28 60,50 88,72';
export const CUTS = ['37.5,0 44.5,0 44.5,100 37.5,100', '44.5,0 66,0 44.5,40', '44.5,100 66,100 44.5,60'];
export const LINE = '40.1,0 41.9,0 41.9,100 40.1,100';

export default function KyvroMark({ dark = false, className = '', title = 'Kyvro' }) {
  const id = `km${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="10 4 80 92" className={`kyvro-mark ${dark ? 'km-dark' : ''} ${className}`} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <polygon points={HEX} fill="#fff" />
        {CUTS.map((p) => <polygon key={p} points={p} fill="#000" />)}
        <polygon points={LINE} fill="#fff" />
        <polygon points={NOTCH} fill="#000" />
      </mask>
      <polygon className="km-hex" points={HEX} fill={dark ? '#ffffff' : '#000000'} mask={`url(#${id})`} />
      <polygon className="km-notch" points={NOTCH} fill="#C9A24B" />
    </svg>
  );
}
