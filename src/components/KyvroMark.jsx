import React, { useId } from 'react';

// The Kyvro mark (C2): a solid hexagon with a K cut out of it (a straight cut beside the stem,
// a V cut at the top and bottom) and a gold notch on the right.
// Light mode: deep black (#000) hexagon. Dark mode: white hexagon. The gold notch stays gold.
// The cuts are a mask, so the page colour shows through them.
// Same drawing in public/brand/*.svg, public/favicon.svg and the PNGs (scripts/brand-png.py); change all together.
export const HEX = '50,6 88,28 88,72 50,94 12,72 12,28';
export const NOTCH = '88,28 60,50 88,72';
export const CUTS = ['38,0 43,0 43,100 38,100', '43,0 66,0 43,40', '43,100 66,100 43,60'];

export default function KyvroMark({ dark = false, className = '', title = 'Kyvro' }) {
  const id = `km${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="10 4 80 92" className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <polygon points={HEX} fill="#fff" />
        {CUTS.map((p) => <polygon key={p} points={p} fill="#000" />)}
        <polygon points={NOTCH} fill="#000" />
      </mask>
      <polygon points={HEX} fill={dark ? '#ffffff' : '#000000'} mask={`url(#${id})`} />
      <polygon points={NOTCH} fill="#C9A24B" />
    </svg>
  );
}
