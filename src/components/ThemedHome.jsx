import React from 'react';
import { ArrowRight, Heart, Shield, Truck, RefreshCw, User } from 'lucide-react';
import PriceTag, { DiscountBadge } from './PriceTag';
import SlideTrack from './SlideTrack';
import StockLabel from './StockLabel';
import { totalStock, rankBySales } from '../data/catalog';
import shirtImg from '../assets/shirts.png';
import sneakersImg from '../assets/Snekers.png';

// Home page of the Minimal, Bold, Boutique, Editorial, Street, Fresh and Luxe themes (Classic is HomeView itself). Same products, categories and
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

  // ---------------- Editorial: a magazine page, big serif words, numbered category list ----------------
  if (theme === 'editorial') {
    return (
      <div className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <p className={`text-[11px] uppercase tracking-[0.35em] ${muted}`}>Issue 01 · {brandName}</p>
            <h1 className={`mt-4 font-serif text-5xl sm:text-7xl leading-[0.95] ${ink}`}>Wear<br />your<br /><em className="text-[#B8921F]">story.</em></h1>
            <p className={`mt-5 max-w-sm text-sm ${muted}`}>New pieces picked for everyday life. Cash on delivery all over Bangladesh.</p>
            <button type="button" onClick={shopAll} className={`mt-7 inline-flex items-center gap-2 border-b-2 border-current pb-1 text-sm font-semibold ${ink} hover:text-[#B8921F] transition`}>
              See the collection <ArrowRight size={15} />
            </button>
          </div>
          <div className="relative overflow-hidden select-none">
            <SlideTrack index={heroIdx} onIndex={setHeroIdx}
              items={heroImages.map((src, i) => <img key={i} src={src} alt="" draggable={false} className="block w-full aspect-[4/5] object-cover" />)} />
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h2 className={`font-serif text-2xl sm:text-3xl ${ink}`}>In this issue</h2>
          <div className={`mt-6 border-t ${line}`}>
            {cats.map((c, i) => (
              <button key={c.name} type="button" onClick={() => goCat(c.name)} className={`group w-full flex items-center gap-4 sm:gap-8 py-4 border-b text-left ${line}`}>
                <span className={`w-8 font-serif text-sm ${muted}`}>{String(i + 1).padStart(2, '0')}</span>
                <span className={`flex-1 font-serif text-xl sm:text-3xl ${ink} group-hover:italic`}>{c.label}</span>
                <img src={c.image} alt="" className="w-14 h-14 sm:w-20 sm:h-20 object-cover" />
                <ArrowRight size={18} className={`${muted} group-hover:text-[#B8921F] group-hover:translate-x-1 transition`} />
              </button>
            ))}
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className={`font-serif text-2xl sm:text-3xl ${ink}`}>Most read</h2>
            <button type="button" onClick={shopAll} className={`text-xs font-semibold underline ${muted}`}>View all</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-10">
            {featured.slice(0, 6).map((p, i) => (
              <div key={p.id} className="group">
                <div className={`relative overflow-hidden cursor-pointer ${i % 3 === 1 ? 'aspect-[3/4]' : 'aspect-square'} ${isDarkMode ? 'bg-[#181818]' : 'bg-gray-100'}`} onClick={() => open(p)}>
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500" />
                  {heart(p, 'top-2 right-2 !w-8 !h-8')}
                  <DiscountBadge price={p.price} originalPrice={p.originalPrice} className="absolute top-2 left-2" />
                </div>
                <p className={`mt-3 text-[10px] uppercase tracking-[0.3em] ${muted}`}>No. {String(i + 1).padStart(2, '0')}</p>
                <h3 onClick={() => open(p)} className={`mt-1 font-serif text-base sm:text-lg cursor-pointer line-clamp-1 ${ink}`}>{p.name}</h3>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <PriceTag price={p.price} originalPrice={p.originalPrice} formatPrice={formatPrice} isDarkMode={isDarkMode} />
                  <button type="button" disabled={soldOut(p)} onClick={() => requestAdd(p, false)} className={`text-[11px] font-semibold uppercase tracking-wider border-b border-current disabled:opacity-40 ${ink}`}>{soldOut(p) ? 'Sold out' : 'Add'}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className={`border-t ${line}`}>
          <p className={`max-w-7xl mx-auto px-4 py-6 text-center font-serif italic text-sm ${muted}`}>{TRUST.map((t) => t.title).join('  ·  ')}</p>
        </section>
      </div>
    );
  }

  // ---------------- Street: black and gold, a moving text band, square tiles ----------------
  if (theme === 'street') {
    const edge = isDarkMode ? 'border-white' : 'border-black';
    return (
      <div className="flex-1">
        <section className="relative bg-black overflow-hidden select-none">
          <SlideTrack index={heroIdx} onIndex={setHeroIdx}
            items={heroImages.map((src, i) => <img key={i} src={src} alt="" draggable={false} className="block w-full h-[20rem] sm:h-[30rem] object-cover opacity-80" />)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 max-w-7xl mx-auto px-4 sm:px-8 pb-6 sm:pb-10">
            <span className="inline-block -rotate-6 bg-[#D4AF37] text-black text-[11px] sm:text-xs font-black uppercase tracking-widest px-3 py-1">New drop</span>
            <h1 className="mt-3 text-5xl sm:text-8xl font-black uppercase tracking-tighter leading-none text-white break-words">{brandName}</h1>
            <button type="button" onClick={shopAll} className="mt-5 inline-flex items-center gap-2 bg-white text-black px-6 py-3 text-xs font-black uppercase tracking-widest hover:bg-[#D4AF37] transition">
              Shop the drop <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <div className="bg-[#D4AF37] text-black overflow-hidden whitespace-nowrap py-2" aria-hidden="true">
          <div className="kyvro-marquee inline-block text-xs sm:text-sm font-black uppercase tracking-[0.25em]">
            {Array.from({ length: 8 }).map((_, i) => <span key={i} className="mx-4">Wear your story ✦ Cash on delivery ✦ All over Bangladesh ✦</span>)}
          </div>
        </div>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <h2 className={`text-2xl sm:text-4xl font-black uppercase tracking-tight ${ink}`}>Categories</h2>
          <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {cats.map((c) => (
              <button key={c.name} type="button" onClick={() => goCat(c.name)} className={`group relative aspect-square overflow-hidden border-2 ${edge}`}>
                <img src={c.image} alt={c.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                <span className="absolute inset-x-0 bottom-0 bg-black text-white text-[10px] sm:text-xs font-black uppercase tracking-wider py-1.5 text-center">{c.label}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
          <div className="flex items-end justify-between gap-3 mb-5">
            <h2 className={`text-2xl sm:text-4xl font-black uppercase tracking-tight ${ink}`}>Hot right now</h2>
            <button type="button" onClick={shopAll} className="text-xs font-black uppercase tracking-wider text-[#B8921F]">All →</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {featured.map((p) => (
              <div key={p.id} className={`group border-2 ${edge} flex flex-col`}>
                <div className="relative aspect-square overflow-hidden cursor-pointer" onClick={() => open(p)}>
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  {heart(p, 'top-2 right-2 !rounded-none')}
                  <DiscountBadge price={p.price} originalPrice={p.originalPrice} className="absolute top-2 left-2" />
                </div>
                <div className={`p-3 border-t-2 ${edge} flex-1 flex flex-col`}>
                  <h3 onClick={() => open(p)} className={`text-sm font-black uppercase cursor-pointer line-clamp-1 ${ink}`}>{p.name}</h3>
                  <div className="mt-1"><PriceTag price={p.price} originalPrice={p.originalPrice} formatPrice={formatPrice} isDarkMode={isDarkMode} /></div>
                  <button type="button" disabled={soldOut(p)} onClick={() => requestAdd(p, false)} className="mt-auto pt-3">
                    <span className={`block w-full py-2.5 text-[11px] font-black uppercase tracking-widest ${soldOut(p) ? 'bg-gray-500/30 text-gray-500' : isDarkMode ? 'bg-white text-black hover:bg-[#D4AF37]' : 'bg-black text-white hover:bg-[#D4AF37] hover:text-black'}`}>{soldOut(p) ? 'Sold out' : 'Add to cart'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="bg-black text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST.map(({ icon: I, title }) => <span key={title} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider"><I size={18} className="text-[#D4AF37] shrink-0" />{title}</span>)}
          </div>
        </section>
      </div>
    );
  }

  // ---------------- Fresh: soft mint, rounded cards, light and friendly ----------------
  if (theme === 'fresh') {
    const mint = isDarkMode ? 'bg-[#13201b]' : 'bg-[#E8F3EE]';
    const green = isDarkMode ? 'text-[#7fd1ad]' : 'text-[#2E8B6A]';
    const cardBg = isDarkMode ? 'bg-[#161616]' : 'bg-white shadow-sm';
    return (
      <div className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
          <div className={`rounded-[2rem] ${mint} p-6 sm:p-10 grid md:grid-cols-2 gap-6 md:gap-10 items-center`}>
            <div>
              <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${isDarkMode ? 'bg-white/10' : 'bg-white'} ${green}`}>Hello from {brandName}</span>
              <h1 className={`mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight ${ink}`}>Easy outfits for <span className={green}>every day</span></h1>
              <p className={`mt-3 text-sm ${muted}`}>Comfortable picks, fair prices, cash on delivery all over Bangladesh.</p>
              <button type="button" onClick={shopAll} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2E8B6A] text-white px-7 py-3 text-sm font-bold hover:brightness-110 active:scale-95 transition">
                Start shopping <ArrowRight size={16} />
              </button>
            </div>
            <div className="relative rounded-[1.5rem] overflow-hidden select-none">
              <SlideTrack index={heroIdx} onIndex={setHeroIdx}
                items={heroImages.map((src, i) => <img key={i} src={src} alt="" draggable={false} className="block w-full h-56 sm:h-80 object-cover" />)} />
            </div>
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            {cats.map((c) => (
              <button key={c.name} type="button" onClick={() => goCat(c.name)} className={`shrink-0 flex items-center gap-2 rounded-full pl-1.5 pr-4 py-1.5 ${cardBg} border ${isDarkMode ? 'border-gray-800' : 'border-transparent'} hover:ring-2 hover:ring-[#2E8B6A]/40 transition`}>
                <img src={c.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                <span className={`text-xs font-bold ${ink}`}>{c.label}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className={`text-xl sm:text-2xl font-extrabold ${ink}`}>Popular this week</h2>
            <button type="button" onClick={shopAll} className={`text-xs font-bold ${green}`}>See all</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {featured.map((p) => (
              <div key={p.id} className={`group rounded-3xl p-2.5 flex flex-col ${cardBg}`}>
                <div className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer" onClick={() => open(p)}>
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  {heart(p, 'top-2 right-2 !w-8 !h-8')}
                  <DiscountBadge price={p.price} originalPrice={p.originalPrice} className="absolute top-2 left-2" />
                </div>
                <div className="px-1.5 pt-3 pb-1 flex-1 flex flex-col">
                  <h3 onClick={() => open(p)} className={`text-sm font-bold cursor-pointer line-clamp-1 ${ink}`}>{p.name}</h3>
                  <div className="mt-1"><PriceTag price={p.price} originalPrice={p.originalPrice} formatPrice={formatPrice} isDarkMode={isDarkMode} /></div>
                  <button type="button" disabled={soldOut(p)} onClick={() => requestAdd(p, false)} className="mt-auto pt-3">
                    <span className={`block w-full rounded-full py-2.5 text-[11px] font-bold ${soldOut(p) ? 'bg-gray-500/20 text-gray-500' : 'bg-[#2E8B6A] text-white hover:brightness-110'}`}>{soldOut(p) ? 'Sold out' : 'Add to cart'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 grid grid-cols-2 md:grid-cols-4 gap-3">
          {TRUST.map(({ icon: I, title }) => (
            <div key={title} className={`rounded-2xl ${mint} p-4 flex items-center gap-3`}>
              <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-white/10' : 'bg-white'} ${green}`}><I size={17} /></span>
              <span className={`text-xs font-bold ${ink}`}>{title}</span>
            </div>
          ))}
        </section>
      </div>
    );
  }

  // ---------------- Luxe: deep black with thin gold lines, arched categories ----------------
  if (theme === 'luxe') {
    return (
      <div className="flex-1 bg-[#0b0b0b] text-white">
        <section className="relative overflow-hidden select-none">
          <SlideTrack index={heroIdx} onIndex={setHeroIdx}
            items={heroImages.map((src, i) => <img key={i} src={src} alt="" draggable={false} className="block w-full h-[22rem] sm:h-[36rem] object-cover" />)} />
          <div className="absolute inset-0 bg-black/65 pointer-events-none" />
          <div className="absolute inset-3 sm:inset-6 border border-[#D4AF37]/60 pointer-events-none" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-[#D4AF37]">{brandName}</p>
            <h1 className="mt-4 font-serif text-3xl sm:text-6xl uppercase tracking-[0.18em]">Wear your story</h1>
            <span className="mt-5 h-px w-20 bg-[#D4AF37]" />
            <button type="button" onClick={shopAll} className="mt-7 px-8 py-3 border border-[#D4AF37] text-[#D4AF37] text-[11px] uppercase tracking-[0.3em] hover:bg-[#D4AF37] hover:text-black transition">Discover</button>
          </div>
        </section>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <h2 className="text-center font-serif text-xl sm:text-3xl uppercase tracking-[0.2em]">The collections</h2>
          <span className="mx-auto mt-4 block h-px w-12 bg-[#D4AF37]" />
          <div className="mt-10 flex justify-start sm:justify-center gap-4 sm:gap-6 overflow-x-auto pb-2 [scrollbar-width:none]">
            {cats.map((c) => (
              <button key={c.name} type="button" onClick={() => goCat(c.name)} className="group shrink-0 w-28 sm:w-36 text-center">
                <span className="block h-40 sm:h-52 rounded-t-full overflow-hidden border border-[#D4AF37]/50 p-1">
                  <img src={c.image} alt={c.label} className="w-full h-full rounded-t-full object-cover group-hover:scale-105 transition duration-700" />
                </span>
                <span className="mt-3 block text-[11px] uppercase tracking-[0.25em] text-gray-300 group-hover:text-[#D4AF37] transition">{c.label}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <h2 className="text-center font-serif text-xl sm:text-3xl uppercase tracking-[0.2em]">Signature pieces</h2>
          <span className="mx-auto mt-4 block h-px w-12 bg-[#D4AF37]" />
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10">
            {featured.map((p) => (
              <div key={p.id} className="group text-center">
                <div className="relative aspect-[3/4] border border-[#D4AF37]/40 p-1 cursor-pointer" onClick={() => open(p)}>
                  <div className="w-full h-full overflow-hidden"><img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" /></div>
                  {heart(p, 'top-3 right-3')}
                  <DiscountBadge price={p.price} originalPrice={p.originalPrice} className="absolute top-3 left-3" />
                </div>
                <h3 onClick={() => open(p)} className="mt-4 font-serif text-sm sm:text-base cursor-pointer line-clamp-1">{p.name}</h3>
                <div className="mt-1 flex justify-center"><PriceTag price={p.price} originalPrice={p.originalPrice} formatPrice={formatPrice} isDarkMode /></div>
                <button type="button" disabled={soldOut(p)} onClick={() => requestAdd(p, false)} className="mt-3 text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] border-b border-[#D4AF37]/60 pb-0.5 disabled:opacity-40">{soldOut(p) ? 'Sold out' : 'Add to bag'}</button>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <button type="button" onClick={shopAll} className="px-8 py-3 border border-[#D4AF37] text-[#D4AF37] text-[11px] uppercase tracking-[0.3em] hover:bg-[#D4AF37] hover:text-black transition">View all</button>
          </div>
        </section>
        <section className="border-t border-[#D4AF37]/30">
          <p className="max-w-6xl mx-auto px-4 py-6 text-center text-[11px] uppercase tracking-[0.25em] text-gray-400">{TRUST.map((t) => t.title).join('  ·  ')}</p>
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
