import React from 'react';

// The Kyvro logo: the K emblem (public/brand/kyvro-emblem-*.png, made by scripts/emblem-assets.py from Evan's logo).
// Light mode: gold. Dark mode: white. The same on every store theme.
// Size it with a height class (h-8, h-10 ...); the width follows. The favicon stays the hexagon (too small for this).
// ?v= changes when the pictures are redrawn, so browsers never keep an old copy.
const V = '2';
export default function KyvroMark({ dark = false, className = '', title = 'Kyvro' }) {
  return (
    <span className={`kyvro-mark inline-flex items-center ${className}`} role="img" aria-label={title}>
      <img src={`/brand/kyvro-emblem-${dark ? 'white' : 'gold'}.png?v=${V}`} alt="" draggable={false} className="h-full w-auto select-none" />
    </span>
  );
}
