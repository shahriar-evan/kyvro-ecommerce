import React, { useState } from 'react';
import { ShoppingBag, Search, User, Menu, Sun, Moon } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { CURRENCIES } from '../data/currencies';

export default function Header({ cart, curr, currencyKey, currentView, isDarkMode, setCurrencyKey, setCurrentView, setIsCartOpen, setIsDarkMode, setIsMobileMenuOpen, setSelectedCategory, customerUser, displayName, photoURL, goAccount, onSignIn, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (fn) => { setMenuOpen(false); fn(); };
  const itemCls = `block w-full text-left px-5 py-3 text-xs font-bold uppercase tracking-wider hover:text-[#D4AF37] transition ${isDarkMode ? 'text-gray-200' : 'text-black'}`;
  return (
    <>
      <header className={`sticky top-0 z-40 backdrop-blur border-b ${isDarkMode ? 'bg-[#121212]/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-3 sm:gap-6">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className={`md:hidden p-1 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'}`}
            >
              <Menu size={24} />
            </button>
            <div 
              onClick={() => { setCurrentView('home'); setSelectedCategory('All'); }}
              className="cursor-pointer flex items-center gap-2 sm:gap-3"
            >
              <img src={logoImg} alt="Kyvro Logo" className="h-8 sm:h-10 w-auto object-contain" />
              <div className="flex flex-col items-start">
                <span className={`text-lg sm:text-2xl font-serif font-bold tracking-widest ${isDarkMode ? 'text-white' : 'text-black'}`}>KYVRO</span>
                <span className={`text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] font-sans -mt-1 ${isDarkMode ? 'text-[#D4AF37]' : 'text-black font-semibold'}`}>কাইভ্রো &bull; WEAR YOUR STORY</span>
              </div>
            </div>
          </div>

          <nav className={`hidden md:flex items-center gap-6 text-sm font-medium tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
            <button onClick={() => { setCurrentView('home'); setSelectedCategory('All'); }} className={`hover:text-[#D4AF37] transition ${currentView === 'home' ? 'text-[#D4AF37] border-b-2 border-[#D4AF37] pb-1' : ''}`}>HOME</button>
            <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Men"); }} className="hover:text-[#D4AF37] transition">MEN'S</button>
            <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Women"); }} className="hover:text-[#D4AF37] transition">WOMEN'S</button>
            <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Shoes"); }} className="hover:text-[#D4AF37] transition">SHOES</button>
            <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Wallets"); }} className="hover:text-[#D4AF37] transition">WALLETS</button>
            <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Watches"); }} className="hover:text-[#D4AF37] transition">WATCHES</button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs font-semibold ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-black'}`}>
              <span>{curr.flag}</span>
              <select 
                value={currencyKey} 
                onChange={(e) => setCurrencyKey(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                {Object.keys(CURRENCIES).map(key => (
                  <option key={key} value={key} className={isDarkMode ? 'bg-[#1a1a1a] text-white' : 'bg-white text-black'}>
                    {key} ({CURRENCIES[key].symbol})
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full border transition flex items-center justify-center ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-[#D4AF37] hover:bg-[#222]' : 'bg-gray-100 border-gray-300 text-black hover:bg-gray-200'}`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button 
              onClick={() => setCurrentView('shop')}
              className={`transition p-1 ${isDarkMode ? 'text-gray-300 hover:text-[#D4AF37]' : 'text-gray-700 hover:text-[#D4AF37]'}`}
              title="Search"
            >
              <Search size={18} />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`transition relative p-1 flex items-center ${isDarkMode ? 'text-gray-300 hover:text-[#D4AF37]' : 'text-gray-700 hover:text-[#D4AF37]'}`}
                title={customerUser ? 'My Account' : 'Sign in'}
              >
                {photoURL
                  ? <img src={photoURL} alt="" className="w-7 h-7 rounded-full object-cover border border-[#D4AF37]" />
                  : <User size={18} />}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className={`absolute right-0 top-full mt-3 w-64 z-50 rounded shadow-2xl border py-2 ${isDarkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200'}`}>
                    {customerUser ? (
                      <div className="px-5 py-3 border-b border-gray-200/20">
                        <p className="text-sm font-bold truncate">{displayName || 'Welcome'}</p>
                        <p className="text-[11px] text-gray-500 truncate">{customerUser.email}</p>
                      </div>
                    ) : (
                      <button onClick={() => go(onSignIn)} className={itemCls}>Sign In</button>
                    )}
                    <button onClick={() => go(() => goAccount('orders'))} className={itemCls}>My Orders</button>
                    <button onClick={() => go(() => goAccount('settings'))} className={itemCls}>My Account Settings</button>
                    <button onClick={() => go(() => goAccount('wallet'))} className={itemCls}>My Wallet</button>
                    <button onClick={() => go(() => goAccount('saved'))} className={itemCls}>My Saved Items</button>
                    {customerUser && <button onClick={() => go(onSignOut)} className={itemCls}>Sign Out</button>}
                    <button onClick={() => go(() => setCurrentView('admin'))} className={`${itemCls} border-t border-gray-200/20 mt-1`}>Admin Panel</button>
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={() => setIsCartOpen(true)}
              className={`transition relative flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full border ${isDarkMode ? 'text-gray-300 bg-[#1a1a1a] border-gray-800' : 'text-gray-800 bg-gray-100 border-gray-300'}`}
            >
              <ShoppingBag size={16} className="text-[#D4AF37]" />
              <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </button>
          </div>

        </div>
      </header>
    </>
  );
}
