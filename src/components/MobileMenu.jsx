import React from 'react';
import { X, ChevronRight, Home, Shirt, Sparkles, Footprints, Wallet, Watch } from 'lucide-react';

export default function MobileMenu({ isDarkMode, setCurrentView, setIsMobileMenuOpen, setSelectedCategory }) {
  const close = () => setIsMobileMenuOpen(false);
  const items = [
    { label: 'Home', sub: 'Back to the front page', icon: Home, go: () => setCurrentView('home') },
    { label: "Men's", sub: 'Shirt, Punjabi, Pants...', icon: Shirt, go: () => { setCurrentView('shop'); setSelectedCategory('Men'); } },
    { label: "Women's & Girls'", sub: 'Saree, Bags, Three Piece...', icon: Sparkles, go: () => { setCurrentView('shop'); setSelectedCategory('Women'); } },
    { label: 'Jackets', sub: 'Varsity & denim jackets', icon: Shirt, go: () => { setCurrentView('shop'); setSelectedCategory('Jackets'); } },
    { label: 'Shoes', sub: 'Sneakers & more', icon: Footprints, go: () => { setCurrentView('shop'); setSelectedCategory('Shoes'); } },
    { label: 'Wallets', sub: 'Genuine leather', icon: Wallet, go: () => { setCurrentView('shop'); setSelectedCategory('Wallets'); } },
    { label: 'Watches', sub: 'Classic & modern', icon: Watch, go: () => { setCurrentView('shop'); setSelectedCategory('Watches'); } },
  ];
  return (
    <>
      <div className="fixed inset-0 z-50 flex kyvro-fade bg-black/70 backdrop-blur-sm">
        <div className={`kyvro-slide w-[85%] max-w-sm h-full flex flex-col justify-between shadow-2xl ${isDarkMode ? 'bg-[#121212] text-white' : 'bg-white text-black'}`}>
          <div>
            <div className={`flex justify-between items-center px-6 pt-6 pb-5 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <div>
                <div className="text-2xl font-serif font-bold tracking-widest">KYVRO</div>
                <div className="text-[10px] tracking-[0.3em] text-[#D4AF37] font-semibold mt-0.5">কাইভ্রো &bull; WEAR YOUR STORY</div>
              </div>
              <button onClick={close} aria-label="Close menu" className={`w-10 h-10 rounded-full flex items-center justify-center transition ${isDarkMode ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                <X size={20} />
              </button>
            </div>
            <nav className="px-4 py-4 flex flex-col gap-1">
              {items.map(({ label, sub, icon: Icon, go }) => (
                <button
                  key={label}
                  onClick={() => { go(); close(); }}
                  className={`group flex items-center gap-4 text-left rounded-xl px-3 py-3.5 transition active:scale-[0.99] ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-[#D4AF37]/10'}`}
                >
                  <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-[#D4AF37]/15' : 'bg-[#D4AF37]/15'} text-[#B8921F]`}>
                    <Icon size={20} />
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
