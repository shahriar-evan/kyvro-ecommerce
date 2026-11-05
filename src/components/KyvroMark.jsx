import React, { useId } from 'react';

// The Kyvro mark (winged K), drawn as shapes so it needs no image or font and has no background.
// Dark mode: gold. Light mode: black. Same shapes as the profile picture and the Facebook cover.
const PATHS = [
  'M58 58 C44 56 28 46 20 28 C34 40 46 44 58 46 Z',
  'M58 72 C46 72 33 66 26 54 C37 61 48 63 58 62 Z',
  'M84 46 C97 44 110 38 120 26 C114 44 100 55 86 58 Z',
  'M58 30 H69 V94 H58 Z',
  'M52 30 H75 V34 H52 Z',
  'M52 90 H75 V94 H52 Z',
  'M67 62 L92 30 L101 30 L70 70 Z',
  'M70 60 L102 94 L91 94 L66 67 Z',
  'M63 14 L66 24 L63 28 L60 24 Z',
];

export default function KyvroMark({ dark = false, className = '', title = 'Kyvro' }) {
  const id = `kg-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="16 8 108 90" className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      {dark && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F3DC8C" />
            <stop offset=".45" stopColor="#D4AF37" />
            <stop offset=".75" stopColor="#A9841E" />
            <stop offset="1" stopColor="#E9CB6B" />
          </linearGradient>
        </defs>
      )}
      <g fill={dark ? `url(#${id})` : '#111111'}>
        {PATHS.map((d) => <path key={d} d={d} />)}
      </g>
    </svg>
  );
}
