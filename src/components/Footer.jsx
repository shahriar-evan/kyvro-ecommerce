import React from 'react';
import logoImg from '../assets/logo.png';

export default function Footer({ isDarkMode, setCurrentView, setSelectedCategory, customerUser, onSignIn, goAccount }) {
  return (
    <>
      <footer className={`border-t pt-12 sm:pt-16 pb-12 mt-auto ${isDarkMode ? 'bg-[#121212] border-gray-800 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 text-xs">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Kyvro Logo" className="h-10 sm:h-12 w-auto object-contain" />
              <div className="flex flex-col items-start">
                <span className={`text-lg sm:text-xl font-serif font-bold tracking-widest ${isDarkMode ? 'text-white' : 'text-black'}`}>KYVRO</span>
                <span className={`text-[8px] sm:text-[9px] tracking-[0.3em] font-sans -mt-1 ${isDarkMode ? 'text-[#D4AF37]' : 'text-black font-semibold'}`}>কাইভ্রো &bull; WEAR YOUR STORY</span>
              </div>
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
              <li><button onClick={() => setCurrentView('privacy')} className="hover:text-[#D4AF37]">Privacy Policy</button></li>
              <li><button onClick={() => setCurrentView('terms')} className="hover:text-[#D4AF37]">Terms &amp; Conditions</button></li>
              <li><button onClick={() => setCurrentView('refund')} className="hover:text-[#D4AF37]">Return &amp; Refund Policy</button></li>
              <li><button onClick={() => (customerUser ? (goAccount && goAccount('settings')) : (onSignIn && onSignIn()))} className="text-[#D4AF37] font-semibold hover:underline">{customerUser ? 'Manage offer emails' : 'Get offers by email (sign in with Google)'}</button></li>
            </ul>
          </div>

          <div>
            <h4 className={`font-bold uppercase tracking-wider mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Categories</h4>
            <ul className="space-y-2">
              <li><button onClick={() => { setSelectedCategory("Men"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Men's Collection</button></li>
              <li><button onClick={() => { setSelectedCategory("Women"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Women's &amp; Girls' Fashion</button></li>
              <li><button onClick={() => { setSelectedCategory("Jackets"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Varsity / Denim Jacket</button></li>
              <li><button onClick={() => { setSelectedCategory("Shoes"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Shoes</button></li>
              <li><button onClick={() => { setSelectedCategory("Wallets"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Wallets</button></li>
              <li><button onClick={() => { setSelectedCategory("Watches"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Watches</button></li>
            </ul>
          </div>

          <div>
            <h4 className={`font-bold uppercase tracking-wider mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Secure Shopping</h4>
            <p className="leading-relaxed mb-4">
              All transactions and customer details are encrypted and securely handled.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 flex justify-center">
          <button
            onClick={() => setCurrentView('admin')}
            className={`inline-flex items-center gap-2 border px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-[#D4AF37] hover:bg-[#222]' : 'bg-gray-100 border-gray-300 text-black hover:bg-gray-200'}`}
          >
            Admin Portal Login
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-12 pt-6 border-t text-center text-gray-500 text-[11px]">
          &copy; 2026 Kyvro - কাইভ্রো &bull; www.kyvro.store. All rights reserved.
        </div>
      </footer>
    </>
  );
}
