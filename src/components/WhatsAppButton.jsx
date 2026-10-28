import React from 'react';

export function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88zM20.52 3.45A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.95L.05 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.17-3.48-8.45z" />
    </svg>
  );
}

// Premium WhatsApp order button. `compact` is the smaller version used on product cards.
export default function WhatsAppButton({ href, onClick, compact = false }) {
  return (
    <a
      href={href}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative w-full overflow-hidden flex items-center justify-center gap-2.5 rounded-lg font-bold uppercase text-white
        bg-gradient-to-r from-[#128C7E] via-[#1FAF5A] to-[#25D366] shadow-[0_6px_18px_-6px_rgba(37,211,102,0.65)]
        ring-1 ring-white/20 transition-all duration-300 hover:shadow-[0_10px_24px_-6px_rgba(37,211,102,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]
        ${compact ? 'py-2.5 text-[11px] tracking-wider' : 'py-3.5 text-xs tracking-[0.18em]'}`}
    >
      <span className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/25 transition-all duration-700 group-hover:left-[140%]" />
      <span className={`relative flex items-center justify-center rounded-full bg-white/20 ${compact ? 'w-5 h-5' : 'w-7 h-7'}`}>
        <WhatsAppIcon size={compact ? 12 : 16} />
      </span>
      <span className="relative">Order on WhatsApp</span>
    </a>
  );
}
