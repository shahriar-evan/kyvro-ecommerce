import React from 'react';
import KyvroMark from './KyvroMark';

export default function Footer({ onStartSelling, sellLabel = 'Start your own business', navHas = () => true, isDarkMode, setCurrentView, setSelectedCategory, customerUser, onSignIn, goAccount }) {
  return (
    <>
      <footer className={`border-t pt-12 sm:pt-16 pb-12 mt-auto ${isDarkMode ? 'bg-[#121212] border-gray-800 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr] gap-8 sm:gap-10 text-xs">
          <div className="space-y-4">
            {/* logo + name: centered on a phone (one column), left from 640px (grid columns) */}
            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <KyvroMark dark={isDarkMode} title="Kyvro logo" className="h-11 sm:h-12 xl:h-11 w-auto shrink-0" />
              {/* same look as the header wordmark: Montserrat 600, wide spacing (font loaded in index.html); Bangla name in the normal font, not bold */}
              <span className={`flex items-center gap-2 whitespace-nowrap leading-none ${isDarkMode ? 'text-[#D4AF37]' : 'text-black'}`}>
                <span className="text-[28px] font-semibold tracking-[0.3em] -mr-[0.3em] ml-1" style={{ fontFamily: 'Montserrat, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>KYVRO</span>
                <span className="text-[28px] leading-none" aria-hidden="true">&middot;</span>
                <span className="text-[28px] font-normal" lang="bn">কাইভ্রো</span>
              </span>
            </div>
            <p className="leading-relaxed">
              Kyvro offers stylish, comfortable, and affordable clothing made for everyday wear. Discover premium fabrics, modern designs, and perfect fits.
            </p>
            <p className={`font-semibold ${isDarkMode ? 'text-[#D4AF37]' : 'text-black'}`}>Domain: www.kyvro.store</p>
          </div>

          <div>
            <h4 className={`font-bold uppercase tracking-wider mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Customer Care</h4>
            <ul className="space-y-2">
              <li><button onClick={() => setCurrentView('shop')} className="hover:text-[#D4AF37]">Shop Collection</button></li>
              <li><a href="mailto:kyvrofashion@gmail.com" className="hover:text-[#D4AF37]">24/7 Support: kyvrofashion@gmail.com</a></li>
              <li><span>Facebook: www.facebook.com/kyvrofashion</span></li>
              <li><span>Instagram: @kyvro_fashion</span></li>
              <li><span>TikTok: tiktok.com/@kyvro.store</span></li>
              <li><button onClick={() => setCurrentView('tracking')} className="hover:text-[#D4AF37]">Order Tracking</button></li>
              {onStartSelling && <li><button onClick={onStartSelling} className="hover:text-[#D4AF37]">{sellLabel}</button></li>}
              <li><button onClick={() => setCurrentView('privacy')} className="hover:text-[#D4AF37]">Privacy Policy</button></li>
              <li><button onClick={() => setCurrentView('terms')} className="hover:text-[#D4AF37]">Terms &amp; Conditions</button></li>
              <li><button onClick={() => setCurrentView('refund')} className="hover:text-[#D4AF37]">Return &amp; Refund Policy</button></li>
              <li><button onClick={() => (customerUser ? (goAccount && goAccount('settings')) : (onSignIn && onSignIn()))} className="text-[#D4AF37] font-semibold hover:underline">{customerUser ? 'Manage offer emails' : 'Get offers by email (sign in with Google)'}</button></li>
            </ul>
          </div>

          <div>
            <h4 className={`font-bold uppercase tracking-wider mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Categories</h4>
            <ul className="space-y-2">
              {navHas('Men') && <li><button onClick={() => { setSelectedCategory("Men"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Men's Collection</button></li>}
              {navHas('Women') && <li><button onClick={() => { setSelectedCategory("Women"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Women's &amp; Girls' Fashion</button></li>}
              {navHas('Winter') && <li><button onClick={() => { setSelectedCategory("Winter"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Winter Collection</button></li>}
              {navHas('Shoes') && <li><button onClick={() => { setSelectedCategory("Shoes"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Shoes</button></li>}
              {navHas('Wallets') && <li><button onClick={() => { setSelectedCategory("Wallets"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Wallets</button></li>}
              {navHas('Watches') && <li><button onClick={() => { setSelectedCategory("Watches"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Watches</button></li>}
            </ul>
          </div>

          <div>
            <h4 className={`font-bold uppercase tracking-wider mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Secure Shopping</h4>
            <p className="leading-relaxed mb-4">
              All transactions and customer details are encrypted and securely handled.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-12 pt-6 border-t text-center text-gray-500 text-[11px]">
          &copy; 2026 Kyvro &middot; কাইভ্রো &bull; www.kyvro.store. All rights reserved.
          {/* the team's way in (also kyvro.store/Admin); kept small on purpose */}
          <button type="button" onClick={() => setCurrentView('admin')} className="block mx-auto mt-2 text-[10px] text-gray-400 hover:text-gray-500 hover:underline">Team login</button>
        </div>
      </footer>
    </>
  );
}
