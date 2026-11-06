import React from 'react';

// The Kyvro logo: the K emblem (public/brand/kyvro-emblem-*.png, made by scripts/emblem-assets.py from Evan's logo).
//   Classic theme: black in light mode, white in dark mode.
//   Other store themes (Minimal, Bold, Boutique, Editorial, Street, Fresh, Luxe): gold (index.css swaps the two
//   pictures with `[data-theme] .kyvro-mark`, so it follows the theme the page shows).
// Size it with a height class (h-8, h-10 ...); the width follows. The favicon stays the hexagon (too small for this).
export default function KyvroMark({ dark = false, className = '', title = 'Kyvro' }) {
  return (
    <span className={`kyvro-mark inline-flex items-center ${className}`} role="img" aria-label={title}>
      <img src={dark ? '/brand/kyvro-emblem-white.png' : '/brand/kyvro-emblem-black.png'} alt="" draggable={false} className="km-bw h-full w-auto select-none" />
      <img src="/brand/kyvro-emblem-gold.png" alt="" draggable={false} loading="lazy" className="km-gold h-full w-auto select-none" />
    </span>
  );
}
