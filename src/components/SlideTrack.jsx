import React, { useState, useRef, useEffect } from 'react';

// Sliding banner: the slides sit side by side and slide in from the side.
// Finger / mouse drag follows the pointer, a two-finger sideways swipe on a laptop trackpad changes the slide.
// The last slide slides on to the first one (a copy of the first slide is added at the end for that).
// items: array of React nodes. index / onIndex: the slide shown (0..items.length-1) and how to change it.
export default function SlideTrack({ items, index, onIndex, className = '', loop = true }) {
  const n = items.length;
  const [pos, setPos] = useState(index);          // 0..n (n = the copy of the first slide)
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [snap, setSnap] = useState(false);        // jump without animation
  const box = useRef(null);
  const st = useRef(null);
  const wheel = useRef({ acc: 0, lock: false, idle: null });
  const posRef = useRef(pos);
  posRef.current = pos;

  // follow the index chosen from outside (dots, timer)
  useEffect(() => {
    if (index === posRef.current % n) return;
    const cur = posRef.current % n;
    if (loop && cur === n - 1 && index === 0) setPos(n); else setPos(index);
  }, [index, n, loop]);

  const move = (d) => {
    const cur = posRef.current;
    let next = cur + d;
    if (next < 0) next = 0;
    if (next > n) next = n;
    if (!loop && next > n - 1) next = n - 1;
    setPos(next);
    onIndex(next % n);
  };
  const moveRef = useRef(move);
  moveRef.current = move;

  const onEnd = () => {
    if (posRef.current === n) {           // arrived on the copy of the first slide: jump back to the real one
      setSnap(true);
      setPos(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setSnap(false)));
    }
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const w = wheel.current;
      if (w.lock) return;
      w.acc += e.deltaX;
      clearTimeout(w.idle);
      w.idle = setTimeout(() => { w.acc = 0; }, 160);
      if (Math.abs(w.acc) > 50) {
        moveRef.current(w.acc > 0 ? 1 : -1);
        w.acc = 0;
        w.lock = true;
        setTimeout(() => { w.lock = false; }, 450);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onDown = (e) => { st.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId, on: false }; };
  const onMove = (e) => {
    const s0 = st.current;
    if (!s0 || s0.id !== e.pointerId) return;
    const dx = e.clientX - s0.x, dy = e.clientY - s0.y;
    if (!s0.on) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        s0.on = true;
        setDragging(true);
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      } else return;
    }
    const edge = posRef.current === 0 && dx > 0;
    setDrag(edge ? dx / 3 : dx);
  };
  const end = (e) => {
    const s0 = st.current;
    st.current = null;
    if (!s0 || !s0.on) return;
    const dx = e.clientX - s0.x;
    const w = (box.current && box.current.clientWidth) || 300;
    const fast = Math.abs(dx) / Math.max(1, Date.now() - s0.t) > 0.45;
    if (Math.abs(dx) > w * 0.15 || (fast && Math.abs(dx) > 24)) move(dx < 0 ? 1 : -1);
    setDrag(0);
    setDragging(false);
  };

  const slides = loop && n > 1 ? [...items, items[0]] : items;
  return (
    <div ref={box} className={className} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={end} onPointerCancel={end}
      style={{ touchAction: 'pan-y', overscrollBehaviorX: 'contain', cursor: dragging ? 'grabbing' : 'default' }}>
      <div className="flex" onTransitionEnd={onEnd}
        style={{ transform: `translateX(calc(${-pos * 100}% + ${drag}px))`, transition: dragging || snap ? 'none' : 'transform 600ms cubic-bezier(.22,.8,.28,1)', willChange: 'transform' }}>
        {slides.map((node, i) => (
          <div key={i} className="shrink-0 w-full relative" aria-hidden={i % n !== index}>{node}</div>
        ))}
      </div>
    </div>
  );
}
