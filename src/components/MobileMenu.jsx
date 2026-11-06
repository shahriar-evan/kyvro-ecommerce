import React from 'react';
import { X, ChevronRight, Home, Footprints, Wallet, Watch } from 'lucide-react';
import KyvroMark from './KyvroMark';

// Custom line icons: a man, a woman and a jacket (lucide has no icon for them)
const mk = (paths) => function CustomIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths}
    </svg>
  );
};
const ManIcon = mk(<>
  <circle cx="12" cy="6.2" r="3" />
  <path d="M4.8 21v-3.2a5.2 5.2 0 0 1 5.2-5.2h4a5.2 5.2 0 0 1 5.2 5.2V21" />
  <path d="M9.6 12.7 12 15.2l2.4-2.5" />
  <path d="m12 15.2-1.1 1.8L12 20l1.1-3z" />
</>);
const WomanIcon = mk(<>
  <circle cx="12" cy="5.4" r="2.7" />
  <path d="M9.2 6.4c-.9 2.2-.6 4.1.5 5.6M14.8 6.4c.9 2.2.6 4.1-.5 5.6" />
  <path d="M12 9.6c-1.9 0-3.2 1-3.6 2.5L5.6 21h12.8l-2.8-8.9c-.4-1.5-1.7-2.5-3.6-2.5z" />
  <path d="M9.3 13.4h5.4" />
</>);
const JacketIcon = mk(<>
  <path d="M8.2 3.2 3 6.2l2 5 3-1V21h8V10.2l3 1 2-5-5.2-3c-.5 1.6-2 2.6-3.8 2.6S8.7 4.8 8.2 3.2z" />
  <path d="M12 5.8V21" />
</>);

export default function MobileMenu({ navHas = () => true, isDarkMode, setIsDarkMode, setCurrentView, setIsMobileMenuOpen, setSelectedCategory }) {
  const close = () => setIsMobileMenuOpen(false);
  const items = ([
    { label: 'Home', sub: 'Back to the front page', icon: Home, go: () => setCurrentView('home') },
    { label: "Men's", sub: 'Shirt, Punjabi, Pants...', icon: ManIcon, go: () => { setCurrentView('shop'); setSelectedCategory('Men'); } },
    { label: "Women's & Girls'", sub: 'Saree, Bags, Three Piece...', icon: WomanIcon, go: () => { setCurrentView('shop'); setSelectedCategory('Women'); } },
    { label: 'Winter', sub: 'Varsity & denim jackets', icon: JacketIcon, go: () => { setCurrentView('shop'); setSelectedCategory('Winter'); } },
    { label: 'Shoes', sub: 'Sneakers & more', icon: Footprints, go: () => { setCurrentView('shop'); setSelectedCategory('Shoes'); } },
    { label: 'Wallets', sub: 'Genuine leather', icon: Wallet, go: () => { setCurrentView('shop'); setSelectedCategory('Wallets'); } },
    { label: 'Watches', sub: 'Classic & modern', icon: Watch, go: () => { setCurrentView('shop'); setSelectedCategory('Watches'); } },
  ]).filter((it) => ({ 'Home': true, "Men's": navHas('Men'), "Women's & Girls'": navHas('Women'), 'Winter': navHas('Winter'), 'Shoes': navHas('Shoes'), 'Wallets': navHas('Wallets'), 'Watches': navHas('Watches') }[it.label]));
  return (
    <>
      <div className="fixed inset-0 z-50 flex kyvro-fade bg-black/70 backdrop-blur-sm">
        <div className={`kyvro-slide w-[85%] max-w-sm h-full flex flex-col justify-between shadow-2xl ${isDarkMode ? 'bg-[#121212] text-white' : 'bg-white text-black'}`}>
          <div>
            <div className={`flex justify-between items-center px-6 pt-6 pb-5 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center gap-1.5 whitespace-nowrap leading-none">
                <KyvroMark dark={isDarkMode} title="Kyvro logo" className="h-8 w-auto shrink-0" />
                <span className="text-2xl font-serif font-bold tracking-wide">KYVRO</span>
                <span className="text-[#D4AF37] text-2xl" aria-hidden="true">&bull;</span>
                <span className="text-xl font-bold" lang="bn">কাইভ্রো</span>
              </div>
              <button onClick={close} aria-label="Close menu" className={`w-10 h-10 rounded-full flex items-center justify-center transition ${isDarkMode ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                <X size={20} />
              </button>
            </div>
            {setIsDarkMode && (
              <div className={`mx-4 mt-4 flex items-center justify-between rounded-xl border px-4 py-3 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <span className="text-sm font-semibold">{isDarkMode ? 'Dark mode' : 'Light mode'}</span>
                <button type="button" role="switch" aria-checked={isDarkMode} aria-label="Dark mode" onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${isDarkMode ? 'bg-[#D4AF37]' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${isDarkMode ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>
            )}
            <nav className="px-4 py-4 flex flex-col gap-1">
              {items.map(({ label, sub, icon: Icon, go }) => (
                <button
                  key={label}
                  onClick={() => { go(); close(); }}
                  className={`group flex items-center gap-4 text-left rounded-xl px-3 py-3.5 transition active:scale-[0.99] ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-[#D4AF37]/10'}`}
                >
                  <span className="relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-[#8A6A12] group-hover:text-black group-active:text-black transition-all duration-200 group-hover:scale-105"
                    style={{ background: 'linear-gradient(145deg, #FBF1CF 0%, #EBCF74 55%, #D4AF37 100%)', boxShadow: '0 6px 14px -4px rgba(212,175,55,.55), inset 0 1px 0 rgba(255,255,255,.7), inset 0 0 0 1px rgba(184,146,31,.45)' }}>
                    <Icon size={22} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold uppercase tracking-wider">{label}</span>
                    <span className="block text-xs text-gray-500 mt-0.5 truncate">{sub}</span>
                  </span>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-[#D4AF37] transition" />
                </button>
              ))}
            </nav>
          </div>
          <div className={`px-6 py-5 text-xs text-gray-500 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <p className="font-semibold text-[#D4AF37]">www.kyvro.store</p>
            <p className="mt-0.5">Support: 24/7 Available</p>
          </div>
        </div>
        <div className="flex-1" onClick={close}></div>
      </div>
    </>
  );
}
