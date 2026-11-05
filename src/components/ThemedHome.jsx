import React from 'react';
import { ArrowRight, Heart, Shield, Truck, RefreshCw, User } from 'lucide-react';
import PriceTag, { DiscountBadge } from './PriceTag';
import SlideTrack from './SlideTrack';
import StockLabel from './StockLabel';
import { totalStock, rankBySales } from '../data/catalog';
import shirtImg from '../assets/shirts.png';
import sneakersImg from '../assets/Snekers.png';

// Home page of the Minimal, Bold and Boutique themes (Classic is HomeView itself). Same products, categories and
// buttons as Classic; only the layout and the look change.
const CATEGORIES = [
  { name: 'Men', label: "Men's", image: shirtImg },
  { name: 'Women', label: "Women's & Girls'", image: shirtImg },
  { name: 'Winter', label: 'Winter', image: shirtImg },
  { name: 'Shoes', label: 'Shoes', image: sneakersImg },
  { name: 'Wallets', label: 'Wallets', image: sneakersImg },
  { name: 'Watches', label: 'Watches', image: sneakersImg },
];
const TRUST = [
  { icon: Shield, title: 'Quality checked' },
  { icon: Truck, title: 'Delivery all over Bangladesh' },
  { icon: RefreshCw, title: '14-day refund policy' },
  { icon: User, title: '24/7 support' },
];

export default function ThemedHome({ theme, brandName, heroImages, heroIdx, setHeroIdx, hideEmptyCategories, requestAdd, banners, currentBannerIndex, setCurrentBannerIndex, formatPrice, isDarkMode, products, setCurrentView, setSelectedCategory, setSelectedProduct, savedIds = [], toggleSaved = () => {} }) {
  const ranked = rankBySales(products);
  const cats = CATEGORIES.map((cat) => {
    const top = ranked.find((p) => (['Men', 'Women', 'Winter'].includes(cat.name)
      ? String(p.gender === 'Jackets' ? 'Winter' : p.gender || '').toLowerCase() === cat.name.toLowerCase()
      : (p.category === cat.name || p.gender === cat.name)));
    return { ...cat, image: (top && top.image) || cat.image, hasProduct: !!top };
  }).filter((c) => !hideEmptyCategories || c.hasProduct);
  const open = (p) => { setSelectedProduct(p); setCurrentView('product-detail'); };
  const goCat = (name) => { setSelectedCategory(name); setCurrentView('shop'); };
  const shopAll = () => setCurrentView('shop');
  const featured = ranked.slice(0, 8);
  const ink = isDarkMode ? 'text-white' : 'text-black';
  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const line = isDarkMode ? 'border-gray-800' : 'border-gray-200';
  const heart = (p, cls) => (
    <button type="button" onClick={(e) => { e.stopPropagation(); toggleSaved(p.id); }} title={savedIds.includes(p.id) ? 'Remove from saved items' : 'Save this item'}
      className={`absolute z-10 w-9 h-9 rounded-full bg-white/90 text-black shadow flex items-center justify-center hover:scale-110 transition ${cls}`}>
      <Heart size={16} className={savedIds.includes(p.id) ? 'fill-red-500 text-red-500' : ''} />
    </button>
  );
  const soldOut = (p) => totalStock(p) <= 0;

  // ---------------- Minimal: products first, no big pictures ----------------
  if (theme === 'minimal') {
    return (
      <div className="flex-1">
        <section className={`border-b ${line}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
            <p className={`text-[11px] uppercase tracking-[0.3em] ${muted}`}>New season</p>
            <h1 className={`mt-3 text-3xl sm:text-5xl font-bold tracking-tight ${ink}`}>{brandName}</h1>
            <p className={`mt-3 text-sm ${muted}`}>Simple, comfortable fashion. Cash on delivery all over Bangladesh.</p>
            <button type="button" onClick={shopAll} className={`mt-7 inline-flex items-center gap-2 px-7 py-3 text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'} hover:opacity-85 transition`}>
              Shop all <ArrowRight size={14} />
            </button>
          </div>
        </section>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
            {cats.map((c) => (
              <button key={c.name} type="button" onClick={() => goCat(c.name)} className={`shrink-0 px-4 py-2 border text-xs font-semibold ${line} ${ink} hover:border-current transition`}>{c.label}</button>
            ))}
          </div>
        </section>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className={`text-lg font-bold ${ink}`}>Best sellers</h2>
            <button type="button" onClick={shopAll} className={`text-xs font-semibold underline ${muted}`}>View all</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8">
            {featured.map((p) => (
              <div key={p.id} className="group">
                <div className={`relative aspect-square overflow-hidden cursor-pointer ${isDarkMode ? 'bg-[#181818]' : 'bg-gray-100'}`} onClick={() => open(p)}>
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500" />
                  {heart(p, 'bottom-2 right-2 !w-8 !h-8')}
                  <DiscountBadge price={p.price} originalPrice={p.originalPrice} className="absolute top-2 left-2" />
                </div>
                <h3 onClick={() => open(p)} className={`mt-3 text-sm cursor-pointer line-clamp-1 ${ink}`}>{p.name}</h3>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <PriceTag price={p.price} originalPrice={p.originalPrice} formatPrice={formatPrice} isDarkMode={isDarkMode} />
                  <button type="button" disabled={soldOut(p)} onClick={() => requestAdd(p, false)} className={`text-[11px] font-bold uppercase tracking-wider underline disabled:opacity-40 disabled:no-underline ${ink}`}>{soldOut(p) ? 'Sold out' : 'Add'}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className={`border-t ${line}`}>
          <div className={`max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs ${muted}`}>
            {TRUST.map(({ icon: I, title }) => <span key={title} className="flex items-center gap-2"><I size={16} />{title}</span>)}
          </div>
        </section>
      </div>
    );
  }

  // ---------------- Bold: big headline over the photo, large tiles, strong buttons ----------------
  if (theme === 'bold') {
    return (
      <div className="flex-1">
        <section className="relative w-full overflow-hidden select-none">
          <SlideTrack index={heroIdx} onIndex={setHeroIdx}
            items={heroImages.map((src, i) => <img key={i} src={src} alt="" draggable={false} className="block w-full h-[22rem] sm:h-[34rem] object-cover" />)} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent pointer-events-none" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl w-full mx-auto px-5 sm:px-8">
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.35em] text-[#D4AF37]">{brandName}</p>
              <h1 className="mt-3 max-w-xl text-4xl sm:text-6xl font-black uppercase leading-[0.95] text-white">Wear your story</h1>
              <p className="mt-4 max-w-md text-sm text-gray-200">Bold looks for every day. Cash on delivery all over Bangladesh.</p>
              <button type="button" onClick={shopAll} className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#D4AF37] text-black px-8 py-3.5 text-xs sm:text-sm font-black uppercase tracking-widest hover:brightness-105 active:scale-95 transition">
                Shop now <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h2 className={`text-2xl sm:text-4xl font-black uppercase ${ink}`}>Shop by category</h2>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {cats.map((c) => (
              <button key={c.name} type="button" onClick={() => goCat(c.name)} className="group relative h-44 sm:h-72 rounded-3xl overflow-hidden text-left">
                <img src={c.image} alt={c.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <span className="absolute inset-0 bg-black/45 group-hover:bg-black/30 transition" />
                <span className="absolute left-4 bottom-4 sm:left-6 sm:bottom-6 text-lg sm:text-3xl font-black uppercase text-white">{c.label}</span>
              </button>
            ))}
          </div>
        </section>
        <section className={`${isDarkMode ? 'bg-[#121212]' : 'bg-gray-100'} py-12 sm:py-16`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-3 mb-6">
              <h2 className={`text-2xl sm:text-4xl font-black uppercase ${ink}`}>Best sellers</h2>
              <button type="button" onClick={shopAll} className="text-xs font-black uppercase tracking-wider text-[#B8921F]">View all →</button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {featured.map((p) => (
                <div key={p.id} className={`group rounded-3xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white shadow-sm'}`}>
                  <div className="relative aspect-[4/5] overflow-hidden cursor-pointer" onClick={() => open(p)}>
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    {heart(p, 'top-3 right-3')}
                    <DiscountBadge price={p.price} originalPrice={p.originalPrice} className="absolute top-3 left-3" />
                  </div>
                  <div className="p-3 sm:p-4 flex-1 flex flex-col">
                    <h3 onClick={() => open(p)} className={`text-sm font-bold cursor-pointer line-clamp-2 ${ink}`}>{p.name}</h3>
                    <div className="mt-1"><PriceTag price={p.price} originalPrice={p.originalPrice} formatPrice={formatPrice} isDarkMode={isDarkMode} /></div>
                    <StockLabel count={totalStock(p)} text={p.stockText} className="mt-1" />
                    <button type="button" disabled={soldOut(p)} onClick={() => requestAdd(p, false)} className="mt-auto pt-3">
                      <span className={`block w-full rounded-full py-2.5 text-[11px] font-black uppercase tracking-widest ${soldOut(p) ? 'bg-gray-500/30 text-gray-500' : 'bg-[#D4AF37] text-black hover:brightness-105'}`}>{soldOut(p) ? 'Sold out' : 'Add to cart'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="bg-black text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-5">
            {TRUST.map(({ icon: I, title }) => <span key={title} className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider"><I size={22} className="text-[#D4AF37] shrink-0" />{title}</span>)}
          </div>
        </section>
      </div>
    );
  }

  // ---------------- Boutique: soft, centered, round categories, tall photos ----------------
  return (
    <div className="flex-1">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-[#B8921F]">The boutique</p>
        <h1 className={`mt-2 text-3xl sm:text-5xl font-serif ${ink}`}>{brandName}</h1>
        <div className="mx-auto mt-4 h-px w-16 bg-[#D4AF37]" />
      </section>
      {banners && banners.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
          <div className="relative rounded-[2rem] overflow-hidden select-none">
            <SlideTrack index={currentBannerIndex} onIndex={setCurrentBannerIndex} items={banners.map((img, i) => <img key={i} src={img} alt="" className="block w-full h-auto" />)} />
          </div>
        </section>
      )}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex justify-start sm:justify-center gap-5 sm:gap-8 overflow-x-auto pb-2 [scrollbar-width:none]">
          {cats.map((c) => (
            <button key={c.name} type="button" onClick={() => goCat(c.name)} className="shrink-0 w-20 sm:w-24 text-center group">
              <span className={`block w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-2 ring-offset-2 ${isDarkMode ? 'ring-[#D4AF37]/40 ring-offset-[#0f0f0f]' : 'ring-[#D4AF37]/50 ring-offset-[#FBF7F0]'} group-hover:ring-[#D4AF37] transition`}>
                <img src={c.image} alt={c.label} className="w-full h-full object-cover" />
              </span>
              <span className={`mt-2 block text-xs font-serif ${ink}`}>{c.label}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20">
        <h2 className={`text-center text-xl sm:text-3xl font-serif ${ink}`}>Loved by our customers</h2>
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-10">
          {featured.slice(0, 6).map((p) => (
            <div key={p.id} className="group text-center">
              <div className="relative aspect-[3/4] rounded-[1.5rem] overflow-hidden cursor-pointer" onClick={() => open(p)}>
                <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-700" />
                {heart(p, 'top-3 right-3')}
                <DiscountBadge price={p.price} originalPrice={p.originalPrice} className="absolute top-3 left-3" />
              </div>
              <h3 onClick={() => open(p)} className={`mt-4 text-sm sm:text-base font-serif cursor-pointer line-clamp-1 ${ink}`}>{p.name}</h3>
              <div className="mt-1 flex justify-center"><PriceTag price={p.price} originalPrice={p.originalPrice} formatPrice={formatPrice} isDarkMode={isDarkMode} /></div>
              <button type="button" disabled={soldOut(p)} onClick={() => requestAdd(p, false)} className="mt-3 inline-block px-5 py-2 rounded-full border border-[#D4AF37] text-[#B8921F] text-[11px] font-semibold uppercase tracking-wider hover:bg-[#D4AF37]/10 disabled:opacity-40">{soldOut(p) ? 'Sold out' : 'Add to bag'}</button>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <button type="button" onClick={shopAll} className={`text-sm font-serif underline underline-offset-4 ${ink}`}>See the whole collection</button>
        </div>
      </section>
      <section className={`border-t ${isDarkMode ? 'border-gray-800' : 'border-[#E9DFC9]'}`}>
        <p className={`max-w-6xl mx-auto px-4 py-6 text-center text-xs ${muted}`}>{TRUST.map((t) => t.title).join('  ·  ')}</p>
      </section>
    </div>
  );
}
