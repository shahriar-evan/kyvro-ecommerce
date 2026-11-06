import PriceTag, { DiscountBadge } from './PriceTag';
import React, { useState, useRef, useEffect } from 'react';
import { Heart, ZoomIn, X, Truck, Clock, Wallet, ChevronUp } from 'lucide-react';
import { deliveryFee, normalizeSettings, deliveryNote, freeDeliveryMissing, toBanglaDigits, bestDiscount, nextReward } from '../data/shopConfig';
import WhatsAppButton, { WhatsAppIcon } from './WhatsAppButton';
import { waOrderLink, waProductLines } from '../whatsappOrder';
import StockLabel from './StockLabel';
import { rankBySales, hasSizeStock, hasColorStock, totalStock, stockForSize, stockFor, stockForColor, productColors, imageFor, orderedSizes } from '../data/catalog';

// Photo slider: the photos sit side by side and slide in from the side.
// Works with a finger on a phone, mouse drag, and a two-finger sideways swipe on a laptop trackpad.
function PhotoSlider({ photos, index, onIndex, alt, className, onTap, children }) {
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const box = useRef(null);
  const st = useRef(null);
  const wheel = useRef({ acc: 0, lock: false, idle: null });
  const last = photos.length - 1;
  const go = (d) => onIndex(Math.max(0, Math.min(last, index + d)));
  const goRef = useRef(go);
  goRef.current = go;

  // trackpad: two fingers sideways (needs a non-passive listener so the browser does not go "back")
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // normal vertical scroll
      e.preventDefault();
      const w = wheel.current;
      if (w.lock) return;
      w.acc += e.deltaX;
      clearTimeout(w.idle);
      w.idle = setTimeout(() => { w.acc = 0; }, 160);
      if (Math.abs(w.acc) > 50) {
        goRef.current(w.acc > 0 ? 1 : -1);
        w.acc = 0;
        w.lock = true;
        setTimeout(() => { w.lock = false; }, 450); // ignore the trackpad's momentum
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
    // a little resistance at the first / last photo
    const edge = (index === 0 && dx > 0) || (index === last && dx < 0);
    setDrag(edge ? dx / 3 : dx);
  };
  const end = (e) => {
    const s0 = st.current;
    st.current = null;
    if (!s0) return;
    if (!s0.on) {
      if (onTap && Math.abs(e.clientX - s0.x) < 8 && Math.abs(e.clientY - s0.y) < 8 && !(e.target.closest && e.target.closest('button'))) onTap();
      return;
    }
    const dx = e.clientX - s0.x;
    const w = (box.current && box.current.clientWidth) || 300;
    const fast = Math.abs(dx) / Math.max(1, Date.now() - s0.t) > 0.45;
    if (Math.abs(dx) > w * 0.18 || (fast && Math.abs(dx) > 24)) go(dx < 0 ? 1 : -1);
    setDrag(0);
    setDragging(false);
  };

  return (
    <div ref={box} className={className} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={end} onPointerCancel={end}
      style={{ touchAction: 'pan-y', overscrollBehaviorX: 'contain', cursor: dragging ? 'grabbing' : photos.length > 1 ? 'grab' : 'default' }}>
      <div className="flex h-full" style={{ transform: `translateX(calc(${-index * 100}% + ${drag}px))`, transition: dragging ? 'none' : 'transform 420ms cubic-bezier(.22,.8,.28,1)', willChange: 'transform' }}>
        {photos.map((src, i) => (
          <div key={src + i} className="shrink-0 w-full h-full flex items-center justify-center" aria-hidden={i !== index}>
            <img src={src} alt={i === index ? alt : ''} draggable={false} loading={Math.abs(i - index) <= 1 ? 'eager' : 'lazy'} className="block w-full h-full object-contain select-none" />
          </div>
        ))}
      </div>
      {photos.length > 1 && index > 0 && (
        <button type="button" aria-label="Previous photo" onClick={() => go(-1)} className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/85 text-black shadow items-center justify-center hover:scale-110 transition">&#8249;</button>
      )}
      {photos.length > 1 && index < last && (
        <button type="button" aria-label="Next photo" onClick={() => go(1)} className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/85 text-black shadow items-center justify-center hover:scale-110 transition">&#8250;</button>
      )}
      {children}
    </div>
  );
}

// Full-screen photo viewer: tap the photo to zoom in / out, scroll or drag to look around, arrows to change photo.
function ZoomViewer({ photos, index, onIndex, onClose }) {
  const [zoomed, setZoomed] = useState(false);
  const box = useRef(null);
  useEffect(() => { setZoomed(false); }, [index]);
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') onIndex(Math.min(photos.length - 1, index + 1)); if (e.key === 'ArrowLeft') onIndex(Math.max(0, index - 1)); };
    window.addEventListener('keydown', key);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = old; };
  }, [index, photos.length, onClose, onIndex]);
  useEffect(() => {
    const el = box.current;
    if (zoomed && el) { el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; el.scrollTop = (el.scrollHeight - el.clientHeight) / 2; }
  }, [zoomed]);
  return (
    <div className="fixed inset-0 z-[90] bg-black/95 flex flex-col" role="dialog" aria-label="Photo viewer">
      <div className="flex items-center justify-between px-4 py-3 text-white text-xs">
        <span>{index + 1} / {photos.length} &middot; {zoomed ? 'Tap to zoom out' : 'Tap photo to zoom in'}</span>
        <button type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25"><X size={20} /></button>
      </div>
      <div ref={box} className={`flex-1 min-h-0 ${zoomed ? 'overflow-auto' : 'overflow-hidden flex items-center justify-center'}`}>
        <img src={photos[index]} alt="" draggable={false} onClick={() => setZoomed((z) => !z)}
          className={zoomed ? 'block w-[250%] max-w-none h-auto cursor-zoom-out select-none' : 'block max-w-full max-h-full object-contain cursor-zoom-in select-none'} />
      </div>
      {photos.length > 1 && (
        <div className="flex items-center justify-center gap-3 py-3">
          <button type="button" disabled={index === 0} onClick={() => onIndex(index - 1)} className="w-10 h-10 rounded-full bg-white/15 text-white text-xl disabled:opacity-30">&#8249;</button>
          <button type="button" disabled={index === photos.length - 1} onClick={() => onIndex(index + 1)} className="w-10 h-10 rounded-full bg-white/15 text-white text-xl disabled:opacity-30">&#8250;</button>
        </div>
      )}
    </div>
  );
}

export default function ProductDetail({ product, products, addToCart, calculateDiscountPercent, formatPrice, isDarkMode, setCurrentView, setSelectedProduct = () => {}, storeSettings = {}, cartSubtotal = 0, cartUnits = 0, savedIds = [], toggleSaved = () => {}, teamShop = '' }) {
  // Always use the latest version of the product (admin may have changed stock)
  const live = (products || []).find((p) => p.id === product.id) || product;
  const sized = hasSizeStock(live);
  const sizes = sized ? orderedSizes(Object.keys(live.sizeStock), live.gender) : [];
  const colors = productColors(live);
  const byColor = hasColorStock(live);

  // how many of a color are left (for the chosen size, or in total while no size is chosen yet)
  const colorLeftFor = (s, c) => (sized ? (s ? stockFor(live, s, c) : stockForColor(live, c)) : stockFor(live, '', c));
  const firstColorFor = (s) => colors.find((c) => colorLeftFor(s, c) > 0) || colors[0] || '';

  const [size, setSize] = useState('');
  const [color, setColor] = useState(byColor ? firstColorFor('') : (colors[0] || ''));
  const [qty, setQty] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [area, setArea] = useState(null); // 'Inside Dhaka' | 'Outside Dhaka'
  useEffect(() => { window.scrollTo(0, 0); }, [product.id]);
  const sizeRef = useRef(null);

  // photo gallery: the main photo + the photo of each color. Swipe sideways to change.
  // order: main photo, then each color's photos together (its main photo, then its extra ones), then the product's extra photos
  const colorOrder = Object.keys({ ...(live.colorImages || {}), ...(live.colorGallery || {}) });
  const gallery = [...new Set([live.image, ...colorOrder.flatMap((c) => [(live.colorImages || {})[c], ...(((live.colorGallery || {})[c]) || [])]), ...(Array.isArray(live.images) ? live.images : [])].filter(Boolean))];
  const [manualIdx, setManualIdx] = useState(null); // null = show the photo of the chosen color
  const colorPhoto = imageFor(live, color);
  const currentIdx = manualIdx !== null ? Math.min(manualIdx, gallery.length - 1) : Math.max(0, gallery.indexOf(colorPhoto));
  const shownPhoto = gallery[currentIdx] || colorPhoto;

  // price details for what is in the cart plus the quantity chosen here (discount rules from the Owner's settings)
  const stP = normalizeSettings(storeSettings);
  const thisTotal = live.price * qty;
  const baseTotal = (cartSubtotal || 0) + thisTotal;
  const discHit = bestDiscount(baseTotal, stP);
  const netTotal = baseTotal - discHit.amount;
  const missFree = freeDeliveryMissing(netTotal, stP);
  const nextRw = nextReward(baseTotal, stP);
  const unitsAll = (cartSubtotal > 0 ? cartUnits : 0) + qty;
  const feeCod = area ? deliveryFee(area, 'Cash on Delivery', netTotal, stP, unitsAll) : 0;
  const feeOnline = area ? deliveryFee(area, 'Online Payment', netTotal, stP, unitsAll) : 0;

  // related products: same collection, same category first, best sellers first
  const gOf = (p) => (p.gender === 'Jackets' ? 'Winter' : p.gender);
  const related = rankBySales((products || []).filter((p) => p.id !== live.id && gOf(p) === gOf(live)))
    .sort((x, y) => (y.category === live.category ? 1 : 0) - (x.category === live.category ? 1 : 0))
    .slice(0, 8);

  const total = totalStock(live);
  const available = byColor
    ? (sized && !size ? 0 : stockFor(live, size, color))
    : (sized ? (size ? stockForSize(live, size) : 0) : total);
  const soldOut = total <= 0;
  const discount = calculateDiscountPercent(live.price, live.originalPrice);
  const needsSize = sized && !size;

  const pickSize = (s) => {
    setSize(s);
    setQty(1);
    // if the chosen color is finished in this size, move to a color that is still available
    if (byColor && colorLeftFor(s, color) <= 0) setColor(firstColorFor(s));
  };
  const pickColor = (c) => {
    setColor(c);
    setManualIdx(null);
    setQty(1);
  };
  // the green line follows the choice: size M + blue -> only the pieces of M blue
  const labelCount = byColor
    ? (sized ? (size ? stockFor(live, size, color) : (color ? stockForColor(live, color) : total)) : stockFor(live, '', color))
    : (sized && size ? stockForSize(live, size) : total);
  const colorOut = byColor && !needsSize && available <= 0;

  const handleAdd = () => {
    if (soldOut || needsSize || colorOut) return;
    addToCart(live, color || undefined, sized ? size : (live.sizes && live.sizes[0]), qty);
  };

  const handleBuyNow = () => {
    if (soldOut || needsSize || colorOut) return;
    addToCart(live, color || undefined, sized ? size : (live.sizes && live.sizes[0]), qty, true);
  };

  // WhatsApp message carries the size / color / quantity the customer picked
  const waLink = waOrderLink(waProductLines({ id: live.id, name: live.name, color: color || '', size: sized && size ? size : '', qty, price: live.price }));
  const waNeedsSize = needsSize;

  const cardBtn = (active, disabled) =>
    `min-w-[3.5rem] h-12 sm:h-auto px-4 sm:px-3 py-2 text-sm sm:text-xs rounded-lg sm:rounded border transition active:scale-95 ${
      disabled
        ? 'opacity-40 line-through cursor-not-allowed border-gray-300 dark:border-gray-700'
        : active
          ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-bold'
          : (isDarkMode ? 'border-gray-700 hover:border-[#D4AF37]' : 'border-gray-300 hover:border-[#D4AF37]')
    }`;

  return (
    <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-32 md:py-12 w-full">
      <button onClick={() => setCurrentView('shop')} className="text-xs text-gray-500 hover:text-[#D4AF37] mb-6">&larr; Back to shop</button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <PhotoSlider photos={gallery.length ? gallery : [shownPhoto]} index={currentIdx} onIndex={setManualIdx} alt={live.name} onTap={() => setZoomOpen(true)}
          className={`relative self-start md:sticky md:top-28 w-full h-[430px] sm:h-[540px] rounded-lg overflow-hidden border select-none ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
          {gallery.length > 1 && (
            <div className="absolute bottom-3 inset-x-0 z-10 flex justify-center gap-1.5">
              {gallery.map((_, i) => (
                <button key={i} type="button" aria-label={`Photo ${i + 1}`} onClick={() => setManualIdx(i)} className={`h-2 rounded-full transition-all ${i === currentIdx ? 'w-5 bg-[#D4AF37]' : 'w-2 bg-white/70'}`} />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => toggleSaved(live.id)}
            title={savedIds.includes(live.id) ? 'Remove from saved items' : 'Save this item'}
            className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/90 text-black shadow flex items-center justify-center hover:scale-110 transition"
          >
            <Heart size={18} className={savedIds.includes(live.id) ? 'fill-red-500 text-red-500' : ''} />
          </button>
          <span className="absolute bottom-9 left-1/2 -translate-x-1/2 z-10 pointer-events-none inline-flex items-center gap-1.5 bg-black/65 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full"><ZoomIn size={13} /> Tap to zoom</span>
          {soldOut && <span className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded">SOLD OUT</span>}
          {!soldOut && discount > 0 && <DiscountBadge price={live.price} originalPrice={live.originalPrice} className="absolute top-3 left-3" />}
        </PhotoSlider>

        <div className="space-y-5">
          <div>
            <span className="text-[11px] text-[#D4AF37] uppercase tracking-wider">{live.gender === live.category ? live.category : `${live.gender} / ${live.category}`}</span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold mt-1">{live.name}</h1>
          </div>

          <PriceTag price={live.price} originalPrice={live.originalPrice} formatPrice={formatPrice} isDarkMode={isDarkMode} size="lg" />

          <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{live.description}</p>

          {colors.length > 1 && (
            <div>
              <p className="text-xs font-semibold mb-2">Color: <span className="font-normal text-gray-500">{color}</span></p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => {
                  const out = byColor && colorLeftFor(size, c) <= 0;
                  return <button key={c} disabled={out} onClick={() => pickColor(c)} className={cardBtn(color === c, out)} title={out ? 'Out of stock' : undefined}>{c}</button>;
                })}
              </div>
            </div>
          )}

          <StockLabel count={labelCount} text={product.stockText} className="!text-base" />

          {sized && (
            <div ref={sizeRef} className="scroll-mt-24">
              <p className="text-xs font-semibold mb-2">
                Size: <span className="font-normal text-gray-500">{size || 'select a size'}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const left = stockForSize(live, s);
                  return (
                    <button key={s} disabled={left <= 0} onClick={() => pickSize(s)} className={cardBtn(size === s, left <= 0)} title={left <= 0 ? 'Out of stock' : `${left} available`}>
                      <span className="block">{s}</span>
                      {left > 0 && left <= 5 && <span className="block text-[9px] opacity-80">{left} left</span>}
                    </button>
                  );
                })}
              </div>
              {size && available <= 0 && <p className="text-xs font-semibold text-red-500 mt-2">Out of stock in size {size}{byColor && color ? `, ${color}` : ''}</p>}
            </div>
          )}

          {byColor && !sized && color && !soldOut && available <= 0 && <p className="text-xs font-semibold text-red-500">Out of stock in {color}</p>}
          {!sized && !soldOut && total <= 5 && <p className="text-xs font-semibold text-orange-600">Hurry! Only {total} left.</p>}

          {!soldOut && (
            <div className="flex flex-wrap items-center gap-3">
              <div className={`flex items-center border rounded ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-sm">−</button>
                <span className="px-4 text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(Math.max(available, 1), q + 1))} disabled={needsSize || qty >= available} className="px-3 py-2 text-sm disabled:opacity-40">+</button>
              </div>
              <button
                onClick={handleAdd}
                disabled={needsSize || colorOut}
                className="hidden md:block flex-1 bg-[#D4AF37] text-black font-bold py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {needsSize ? 'Select a size' : colorOut ? 'Out of stock' : 'Add to Cart'}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={needsSize || colorOut}
                className={`hidden md:block flex-1 font-bold py-3 rounded text-xs uppercase tracking-widest border-2 border-[#D4AF37] transition disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'text-[#D4AF37] hover:bg-[#D4AF37]/10' : 'text-black hover:bg-[#D4AF37]/10'}`}
              >
                Buy Now
              </button>
            </div>
          )}
          {!soldOut && (
            <WhatsAppButton
              href={waNeedsSize ? undefined : waLink}
              onClick={(e) => { if (waNeedsSize) { e.preventDefault(); alert('Please select a size first.'); } }}
            />
          )}
          {soldOut && <p className="text-sm font-bold text-red-500">This product is currently sold out.</p>}

          {/* team only, on a shop link: place a WhatsApp customer's order for this shop (the shop's owner earns the markup) */}
          {teamShop && !soldOut && (
            <div className={`rounded-lg border-2 border-dashed p-4 space-y-2 ${isDarkMode ? 'border-green-600/50 bg-green-600/5' : 'border-green-600/60 bg-green-50'}`}>
              <p className="text-xs font-bold uppercase tracking-wider text-green-700">Team · WhatsApp order for {teamShop}</p>
              <p className="text-xs text-gray-500">Pick size / color / quantity, then order for the customer: write their name, phone and address at checkout. The order is saved for {teamShop}, so the shop's owner earns the markup when it is Delivered. Then confirm it in Orders; if they already paid, press "Mark payment received" there.</p>
              <button type="button" onClick={needsSize ? () => sizeRef.current && sizeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }) : handleBuyNow} disabled={colorOut}
                className="w-full bg-green-600 text-white font-bold py-3 rounded text-xs uppercase tracking-widest hover:bg-green-700 transition disabled:opacity-50">
                {needsSize ? 'Select a size' : `Order for customer (${teamShop})`}
              </button>
            </div>
          )}

          {/* Delivery information */}
          {(() => {
            const st = stP;
            const miss = missFree;
            const reward = nextRw;
            const units = (cartSubtotal > 0 ? cartUnits : 0) + qty;
            return (
              <div className={`rounded-lg border border-dashed p-4 space-y-2.5 text-sm ${isDarkMode ? 'border-[#D4AF37]/50 bg-[#161616]' : 'border-[#D4AF37] bg-[#D4AF37]/5'}`}>
                <p className="flex items-start gap-2.5"><Clock size={16} className="mt-0.5 shrink-0 text-[#D4AF37]" /><span><b>Delivery time:</b> Inside Dhaka 1&ndash;2 days &middot; Outside Dhaka 3&ndash;4 days</span></p>
                <p className="flex items-start gap-2.5"><Wallet size={16} className="mt-0.5 shrink-0 text-[#D4AF37]" /><span>Cash on Delivery available</span></p>
                <div className="flex items-start gap-2.5 text-xs leading-relaxed">
                  <Truck size={16} className="mt-0.5 shrink-0 text-[#D4AF37]" />
                  <div>
                    <p>{deliveryNote(st, units).bn}</p>
                    {miss > 0 && <p className="mt-1 font-semibold">আরও {toBanglaDigits(miss)} টাকার পণ্য যোগ করলে ডেলিভারি চার্জ ফ্রি পাবেন।</p>}
                    {reward && reward.missing > 0 && reward.missing <= 1500 && (
                      <p className="mt-1 font-semibold">আরও {toBanglaDigits(reward.missing)} টাকার পণ্য যোগ করলে {reward.rule.type === 'percent' ? `${toBanglaDigits(reward.rule.value)}% ছাড়` : `${toBanglaDigits(reward.rule.value)} টাকা ছাড়`} পাবেন।</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {zoomOpen && <ZoomViewer photos={gallery.length ? gallery : [shownPhoto]} index={currentIdx} onIndex={setManualIdx} onClose={() => setZoomOpen(false)} />}

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-center mb-6">Related Products</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {related.map((rp) => (
              <div key={rp.id} onClick={() => { setSelectedProduct(rp); setCurrentView('product-detail'); }}
                className={`cursor-pointer rounded-lg overflow-hidden border transition hover:shadow-lg hover:border-[#D4AF37] ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className={`relative aspect-square overflow-hidden ${isDarkMode ? 'bg-[#0f0f0f]' : 'bg-gray-100'}`}>
                  <img src={rp.image} alt={rp.name} loading="lazy" className="w-full h-full object-contain" />
                  <DiscountBadge price={rp.price} originalPrice={rp.originalPrice} className="absolute top-2 left-2" />
                </div>
                <div className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#D4AF37]">{rp.category}</p>
                  <h3 className="text-xs sm:text-sm font-semibold mt-1 line-clamp-2 min-h-[2.5rem]">{rp.name}</h3>
                  <div className="mt-2"><PriceTag price={rp.price} originalPrice={rp.originalPrice} formatPrice={formatPrice} isDarkMode={isDarkMode} /></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Phone only: the buy buttons stay at the bottom of the screen while the customer scrolls */}
      {!soldOut && (
        <div className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex items-center gap-2 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.35)] ${isDarkMode ? 'bg-[#121212]/95 border-gray-800' : 'bg-white/95 border-gray-200'} backdrop-blur`}>
          {showBreakdown && <div className="fixed inset-0 -z-10" onClick={() => setShowBreakdown(false)} />}
          {showBreakdown && (
            <div className={`absolute bottom-full inset-x-0 border-t px-4 py-3 text-xs space-y-1.5 shadow-[0_-12px_24px_-12px_rgba(0,0,0,0.35)] ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200'}`}>
              <p className="font-bold text-sm mb-1">Price details</p>
              <div className="flex justify-between"><span>{formatPrice(live.price)} &times; {qty}</span><span>{formatPrice(thisTotal)}</span></div>
              {cartSubtotal > 0 && <div className="flex justify-between"><span>Already in your cart</span><span>{formatPrice(cartSubtotal)}</span></div>}
              <div className="flex justify-between border-t border-dashed border-gray-400/40 pt-1.5"><span>Subtotal</span><span className="font-semibold">{formatPrice(baseTotal)}</span></div>
              {discHit.amount > 0 && discHit.rule ? (
                <div className="flex justify-between text-green-600 font-semibold"><span>Discount ({discHit.rule.type === 'percent' ? `${discHit.rule.value}%` : formatPrice(discHit.rule.value)} off on {formatPrice(discHit.rule.min)}+)</span><span>&minus; {formatPrice(discHit.amount)}</span></div>
              ) : (
                <div className="flex justify-between text-gray-500"><span>Discount</span><span>{formatPrice(0)}</span></div>
              )}
              <div className="flex justify-between border-t border-gray-400/40 pt-1.5 text-sm font-bold"><span>After discount</span><span className="text-[#D4AF37]">{formatPrice(netTotal)}</span></div>
              {nextRw && nextRw.missing > 0 && nextRw.missing <= 1500 && (
                <p className="text-[11px] font-semibold text-[#B8921F] pt-1">Add {formatPrice(nextRw.missing)} more to get {nextRw.rule.type === 'percent' ? `${nextRw.rule.value}%` : formatPrice(nextRw.rule.value)} OFF</p>
              )}
              <div className="pt-1.5">
                <p className="font-semibold mb-1.5">Delivery charge</p>
                <div className="grid grid-cols-2 gap-2">
                  {[['Inside Dhaka', stP.deliveryInside], ['Outside Dhaka', stP.deliveryOutside]].map(([a, fee]) => (
                    <button key={a} type="button" onClick={() => setArea(a)}
                      className={`py-2 rounded-lg border text-[11px] font-bold transition active:scale-95 ${area === a ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                      {a}<span className="block font-semibold opacity-80">{formatPrice(fee)}</span>
                    </button>
                  ))}
                </div>
              </div>
              {area ? (
                <>
                  <div className="flex justify-between pt-1"><span>Delivery ({area}, Cash on Delivery)</span><span className="font-semibold">{feeCod === 0 ? 'Free' : formatPrice(feeCod)}</span></div>
                  {feeOnline !== feeCod && <div className="flex justify-between text-green-600 font-semibold"><span>Delivery with Online Payment</span><span>{feeOnline === 0 ? 'Free' : formatPrice(feeOnline)}</span></div>}
                  <div className="flex justify-between border-t border-gray-400/40 pt-1.5 text-sm font-bold"><span>Total to pay (COD)</span><span className="text-[#D4AF37]">{formatPrice(netTotal + feeCod)}</span></div>
                  {feeOnline !== feeCod && <div className="flex justify-between text-sm font-bold"><span>Total to pay (Online)</span><span className="text-[#D4AF37]">{formatPrice(netTotal + feeOnline)}</span></div>}
                </>
              ) : (
                <p className="text-[10px] text-gray-500">Select your area to see the delivery charge and the total.</p>
              )}
            </div>
          )}
          <button type="button" onClick={() => setShowBreakdown((v) => !v)} aria-expanded={showBreakdown} aria-label="Price details" className="leading-tight pr-1 min-w-[4.5rem] text-left">
            <ChevronUp size={14} className={`text-[#D4AF37] transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
            <p className="text-[10px] text-gray-500">{qty > 1 ? `Total (${qty})` : 'Price'}</p>
            <p className="text-base font-bold text-[#D4AF37]">{formatPrice(thisTotal)}</p>
          </button>
          <button
            onClick={needsSize ? () => sizeRef.current && sizeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }) : handleAdd}
            disabled={colorOut}
            className="flex-1 h-12 rounded-lg bg-gradient-to-b from-[#E9CB6B] via-[#D4AF37] to-[#B8921F] text-black font-bold text-xs uppercase tracking-wider shadow active:scale-95 transition disabled:opacity-50"
          >
            {needsSize ? 'Select size' : colorOut ? 'Out of stock' : 'Add to Cart'}
          </button>
          <button
            onClick={needsSize ? () => sizeRef.current && sizeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }) : handleBuyNow}
            disabled={colorOut}
            className={`flex-1 h-12 rounded-lg border-2 border-[#D4AF37] font-bold text-xs uppercase tracking-wider active:scale-95 transition disabled:opacity-50 ${isDarkMode ? 'text-[#D4AF37]' : 'text-black'}`}
          >
            Buy Now
          </button>
          <a
            href={waNeedsSize ? undefined : waLink}
            onClick={(e) => { if (waNeedsSize) { e.preventDefault(); sizeRef.current && sizeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Order on WhatsApp"
            className="w-12 h-12 shrink-0 rounded-lg bg-gradient-to-br from-[#128C7E] to-[#25D366] text-white flex items-center justify-center shadow active:scale-95 transition"
          >
            <WhatsAppIcon size={22} />
          </a>
        </div>
      )}
    </div>
  );
}
