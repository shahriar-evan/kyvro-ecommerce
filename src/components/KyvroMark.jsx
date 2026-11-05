import React from 'react';

// The Kyvro mark: a black rounded square with a gold "cut K" (stem, a thin white gap, then the arms).
// Drawn as shapes so it needs no image or font. The same mark is used in light and dark mode;
// in dark mode a thin grey edge keeps the black square visible on a dark page.
// public/favicon.svg holds the same drawing; change both together.
export default function KyvroMark({ dark = false, className = '', title = 'Kyvro' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="92" height="92" rx="20" fill="#111111" stroke={dark ? '#3a3a3a' : 'none'} strokeWidth="2" />
      <g transform="translate(50 50) scale(.66) translate(-54 -50)">
        <g fill="#D4AF37">
          <rect x="24" y="20" width="14" height="60" />
          <polygon points="48,50 68,20 84,20 58,58" />
          <polygon points="58,46 84,80 68,80 48,54" />
        </g>
        <rect x="41" y="20" width="3" height="60" fill="#ffffff" />
      </g>
    </svg>
  );
}
