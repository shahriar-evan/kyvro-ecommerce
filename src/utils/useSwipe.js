import { useRef } from 'react';

// Swipe / drag sideways on a photo to change it (finger on a phone, mouse drag on a computer).
// A normal tap is not a swipe, so buttons on top of the photo keep working.
export default function useSwipe(onNext, onPrev) {
  const start = useRef(null);
  return {
    onPointerDown: (e) => { start.current = { x: e.clientX, y: e.clientY }; },
    onPointerUp: (e) => {
      const s0 = start.current;
      start.current = null;
      if (!s0) return;
      const dx = e.clientX - s0.x;
      const dy = e.clientY - s0.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? onNext : onPrev)();
    },
    onPointerCancel: () => { start.current = null; },
    onDragStart: (e) => e.preventDefault(),
    style: { touchAction: 'pan-y' },
  };
}
