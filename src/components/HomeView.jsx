import PriceTag, { DiscountBadge } from './PriceTag';
import React, { useState, useEffect } from 'react';
import { hasSizeStock, totalStock, rankBySales } from '../data/catalog';
import StockLabel from './StockLabel';
import WhatsAppButton from './WhatsAppButton';
import { WHATSAPP_NUMBER } from '../data/shopConfig';
import { User, Shield, Truck, RefreshCw, ChevronRight, ArrowRight, Heart } from 'lucide-react';
import heroBannerImg from '../assets/hero-banner.png';
import heroBanner1Img from '../assets/hero-banner1.png';
import heroBanner2Img from '../assets/hero-banner2.png';
import shirtImg from '../assets/shirts.png';
import sneakersImg from '../assets/Snekers.png';

// Photos of the big top (hero) section. Each one stays 10 seconds, then the next fades in.
// To add a photo: put it in src/assets, import it above and add it to this list.
const HERO_IMAGES = [heroBannerImg, heroBanner1Img, heroBanner2Img];
const HERO_SECONDS = 10;

// Swipe / drag sideways on a photo to change it (finger on a phone, mouse drag on a computer).
// A normal click is not a swipe, so buttons on top of the photo keep working.
function useSwipe(onNext, onPrev) {
  const start = React.useRef(null);
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

export default function HomeView({ requestAdd, addToCart, banners, calculateDiscountPercent, currentBannerIndex, formatPrice, isDarkMode, products, setCurrentBannerIndex, setCurrentView, setSelectedCategory, setSelectedProduct, savedIds = [], toggleSaved = () => {} }) {
  const [heroIdx, setHeroIdx] = useState(0);
  const heroSwipe = useSwipe(
    () => setHeroIdx((i) => (i + 1) % HERO_IMAGES.length),
    () => setHeroIdx((i) => (i - 1 + HERO_IMAGES.length) % HERO_IMAGES.length)
  );
  const bannerSwipe = useSwipe(
    () => setCurrentBannerIndex((currentBannerIndex + 1) % banners.length),
    () => setCurrentBannerIndex((currentBannerIndex - 1 + banners.length) % banners.length)
  );
  useEffect(() => {
    if (HERO_IMAGES.length < 2) return undefined;
    const t = setTimeout(() => setHeroIdx((i) => (i + 1) % HERO_IMAGES.length), HERO_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [heroIdx]);
  useEffect(() => { HERO_IMAGES.forEach((src) => { const im = new Image(); im.src = src; }); }, []);

  return (
    <>
        <div className="flex-1">
          <section {...heroSwipe} style={heroSwipe.style} className="relative w-full overflow-hidden select-none">
            {/* the box takes the shape of the photo: nothing is cropped and there is no blurred space */}
            {HERO_IMAGES.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Kyvro hero ${i + 1}`}
                draggable={false}
                className={`block w-full h-auto transition-opacity duration-1000 ease-in-out ${i === heroIdx ? 'relative opacity-100 z-0' : 'absolute top-0 left-0 opacity-0 pointer-events-none'}`}
              />
            ))}
            <div className="absolute inset-x-0 top-2 sm:top-4 z-10 flex justify-center px-4">
              <span className={`text-[8px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.4em] font-semibold px-3 sm:px-6 py-1 sm:py-2 rounded-full border shadow-xl ${isDarkMode ? 'bg-black/70 text-[#D4AF37] border-[#D4AF37]/50' : 'bg-white/90 text-black border-black/20'}`}>
                KYVRO &bull; কাইভ্রো LUXURY COLLECTION
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-3 sm:bottom-8 z-10 flex justify-center">
              <button
                onClick={() => setCurrentView('shop')}
                className="group relative overflow-hidden inline-flex items-center gap-2 sm:gap-3 rounded-full bg-gradient-to-b from-[#E9CB6B] via-[#D4AF37] to-[#B8921F] text-black font-bold pl-5 pr-2 sm:pl-9 sm:pr-3 py-1.5 sm:py-2.5 text-[10px] sm:text-xs tracking-[0.2em] uppercase shadow-[0_10px_28px_-8px_rgba(0,0,0,0.7)] ring-1 ring-white/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-8px_rgba(212,175,55,0.7)] active:scale-95"
              >
                <span className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/40 transition-all duration-700 group-hover:left-[140%]" />
                <span className="relative">Explore Collection</span>
                <span className="relative flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black text-[#D4AF37] transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight size={14} />
                </span>
              </button>
            </div>
            {HERO_IMAGES.length > 1 && (
              <div className="absolute bottom-3 sm:bottom-5 right-4 sm:right-6 z-10 flex gap-2">
                {HERO_IMAGES.map((_, i) => (
                  <button key={i} type="button" aria-label={`Photo ${i + 1}`} onClick={() => setHeroIdx(i)}
                    className={`h-2.5 rounded-full transition-all ${i === heroIdx ? 'bg-[#D4AF37] w-6' : 'bg-white/60 w-2.5'}`} />
                ))}
              </div>
            )}
          </section>

          {/* AUTOMATIC BANNERS SLIDER */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-4">
            <div {...bannerSwipe} style={bannerSwipe.style} className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-800 select-none">
              {banners.map((img, idx) => (
                <div 
                  key={idx}
                  className={`transition-opacity duration-1000 ease-in-out ${idx === currentBannerIndex ? 'relative opacity-100 z-10' : 'absolute top-0 left-0 w-full opacity-0 z-0 pointer-events-none'}`}
                >
                  {/* the box takes the photo's own shape: nothing is cropped and there is no empty space */}
                  <img src={img} alt={`Kyvro Banner ${idx + 1}`} className="block w-full h-auto" />
                  <div className="absolute inset-x-0 bottom-1.5 sm:bottom-5 z-20 flex justify-center">
                    <button
                      onClick={() => setCurrentView('shop')}
                      className="group relative overflow-hidden inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-b from-[#E9CB6B] via-[#D4AF37] to-[#B8921F] text-black font-bold pl-4 pr-2.5 sm:pl-7 sm:pr-4 py-1 sm:py-2.5 text-[9px] sm:text-xs uppercase tracking-[0.18em] shadow-[0_8px_22px_-8px_rgba(0,0,0,0.7)] ring-1 ring-white/40 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
                    >
                      <span className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/40 transition-all duration-700 group-hover:left-[140%]" />
                      <span className="relative">Shop Now</span>
                      <ArrowRight size={12} className="relative transition-transform duration-300 group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="absolute bottom-2 sm:bottom-4 right-4 sm:right-6 z-20 flex gap-1.5 sm:gap-2">
                {banners.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentBannerIndex(idx)}
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition ${idx === currentBannerIndex ? 'bg-[#D4AF37] w-6 sm:w-8' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Shop by Category */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-xl sm:text-3xl font-serif font-bold tracking-wider">SHOP BY CATEGORY</h2>
              <div className="w-12 h-0.5 bg-[#D4AF37] mx-auto mt-3"></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
              {[
                { name: "Men", label: "Men's Collection", image: shirtImg },
                { name: "Women", label: "Women's Collection", image: shirtImg },
                { name: "Shoes", label: "Shoes", image: sneakersImg },
                { name: "Wallets", label: "Wallets", image: sneakersImg },
                { name: "Watches", label: "Watches", image: sneakersImg }
              ].map((cat) => {
                // the card shows the photo of the best selling product of this collection (newest wins a tie)
                const top = rankBySales(products).find((p) => (cat.name === 'Men' || cat.name === 'Women')
                  ? String(p.gender || '').toLowerCase() === cat.name.toLowerCase()
                  : (p.category === cat.name || p.gender === cat.name));
                return { ...cat, image: (top && top.image) || cat.image, hasProduct: !!top };
              }).map((cat, idx) => (
                <div 
                  key={idx}
                  onClick={() => { setSelectedCategory(cat.name); setCurrentView('shop'); }}
                  className="group relative h-60 sm:h-80 rounded-lg overflow-hidden cursor-pointer shadow-xl border border-gray-800"
                >
                  <img src={cat.image} alt={cat.label} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-4 sm:p-6">
                    <h3 className="text-sm sm:text-lg font-serif font-bold text-white group-hover:text-[#D4AF37] transition">{cat.label}</h3>
                    <p className="text-[11px] sm:text-xs text-gray-300 mt-1 flex items-center gap-1">Shop Now <ChevronRight size={12} /></p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Featured & New Arrivals */}
          <section className={`py-16 sm:py-20 border-y ${isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 sm:mb-12 gap-3">
                <div>
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">Curated Masterpieces</span>
                  <h2 className="text-xl sm:text-3xl font-serif font-bold mt-1">FEATURED & NEW ARRIVALS</h2>
                </div>
                <button 
                  onClick={() => setCurrentView('shop')}
                  className="text-xs font-bold text-[#D4AF37] hover:underline flex items-center gap-1 tracking-wider uppercase"
                >
                  View All Products <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {rankBySales(products).slice(0, 8).map(product => {
                  const discountPct = calculateDiscountPercent(product.price, product.originalPrice);
                  return (
                    <div key={product.id} className={`group rounded-lg overflow-hidden border flex flex-col ${isDarkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="relative h-64 sm:h-72 overflow-hidden bg-gray-900 cursor-pointer" onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}>
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleSaved(product.id); }}
                          title={savedIds.includes(product.id) ? 'Remove from saved items' : 'Save this item'}
                          className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 text-black shadow flex items-center justify-center hover:scale-110 transition"
                        >
                          <Heart size={16} className={savedIds.includes(product.id) ? 'fill-red-500 text-red-500' : ''} />
                        </button>
                        {product.isNew && (
                          <span className="absolute top-3 left-3 bg-[#D4AF37] text-black text-[10px] font-bold px-2.5 py-1 tracking-wider uppercase">
                            New
                          </span>
                        )}
                        <DiscountBadge price={product.price} originalPrice={product.originalPrice} className="absolute top-3 right-3" />
                      </div>

                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] sm:text-[11px] text-[#D4AF37] uppercase tracking-wider">{product.category}</span>
                          <h3 
                            onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}
                            className="text-sm sm:text-base font-serif font-semibold mt-1 cursor-pointer hover:text-[#D4AF37] transition line-clamp-1"
                          >
                            {product.name}
                          </h3>
                          <div className="mt-2">
                            <PriceTag price={product.price} originalPrice={product.originalPrice} formatPrice={formatPrice} isDarkMode={isDarkMode} />
                          </div>
                          <StockLabel count={totalStock(product)} text={product.stockText} className="mt-1.5" />
                        </div>

                        <div className="mt-5 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}
                              className={`border text-xs font-semibold py-2.5 rounded transition text-center ${isDarkMode ? 'border-gray-700 text-gray-300 hover:border-[#D4AF37] hover:text-white' : 'border-gray-300 text-gray-700 hover:border-[#D4AF37]'}`}
                            >
                              Details
                            </button>
                            <button 
                              disabled={totalStock(product) <= 0}
                              onClick={() => requestAdd(product, false)}
                              className="bg-[#D4AF37] text-black text-xs font-bold py-2.5 rounded hover:opacity-90 transition text-center disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {totalStock(product) <= 0 ? 'Sold Out' : 'Add to Cart'}
                            </button>
                          </div>
                          <button
                            disabled={totalStock(product) <= 0}
                            onClick={() => requestAdd(product, true)}
                            className={`w-full border-2 border-[#D4AF37] ${isDarkMode ? 'text-[#D4AF37]' : 'text-black'} text-[11px] font-bold py-2 rounded hover:bg-[#D4AF37]/10 transition text-center uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            Buy Now
                          </button>
                          <WhatsAppButton compact href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hello%20Kyvro,%20I%20want%20to%20order:%0A*%20Name:%20${encodeURIComponent(product.name)}%0A*%20Price:%20${encodeURIComponent(formatPrice(product.price))}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-12 sm:mt-14 flex justify-center">
                <button
                  type="button"
                  onClick={() => setCurrentView('shop')}
                  className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-full text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-black transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: 'linear-gradient(135deg,#F2D675 0%,#D4AF37 50%,#B8932A 100%)', boxShadow: '0 12px 30px rgba(212,175,55,.35), inset 0 1px 0 rgba(255,255,255,.5)' }}
                >
                  More Collection
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1.5" />
                </button>
              </div>
            </div>
          </section>

          {/* Why Choose Kyvro */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
              {[
                { icon: Shield, title: "Uncompromising Quality", desc: "Hand-selected fabrics, genuine leather, and premium stainless steel materials." },
                { icon: Truck, title: "Secure & Fastest Delivery", desc: "Fast and secure delivery to your doorstep, all over Bangladesh." },
                { icon: RefreshCw, title: "14-Day Refund Policy", desc: "Refunds are made within 14 days. Check your product at delivery. See our Return & Refund Policy." },
                { icon: User, title: "24/7 Support", desc: "Dedicated assistance anytime at kyvrofashion@gmail.com." }
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div key={idx} className={`p-6 sm:p-8 rounded-lg border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <IconComponent size={32} className="mx-auto text-[#D4AF37] mb-3 sm:mb-4" />
                    <h4 className="font-serif font-bold text-sm sm:text-base mb-2">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
    </>
  );
}
