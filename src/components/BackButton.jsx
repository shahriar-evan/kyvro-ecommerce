import React from 'react';
import { ArrowLeft } from 'lucide-react';

// Floating Back button: stays on screen while scrolling, on phone and laptop
export default function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      title="Back"
      className="fixed top-28 sm:top-36 left-3 sm:left-5 z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#D4AF37] text-black shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition"
    >
      <ArrowLeft size={20} />
    </button>
  );
}
