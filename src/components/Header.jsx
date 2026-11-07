import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Search, User, Menu, Sun, Moon, Truck } from 'lucide-react';
import KyvroMark from './KyvroMark';
import { CURRENCIES } from '../data/currencies';

export default function Header({ shopBrand = null, onStartSelling, sellLabel = 'Start your own business', onAdminPanel = null, cart, curr, currencyKey, currentView, isDarkMode, setCurrencyKey, setCurrentView, setIsCartOpen, setIsDarkMode, setIsMobileMenuOpen, setSelectedCategory, navHas = () => true, winterNav = false, customerUser, displayName, photoURL, goAccount, onSignIn, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the account menu when the person taps/clicks anywhere else, presses Esc, or opens another page
  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onOutside); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);
  useEffect(() => { setMenuOpen(false); }, [currentView]);
  const go = (fn) => { setMenuOpen(false); fn(); };
  const itemCls = `block w-full text-left px-5 py-3 text-xs font-bold uppercase tracking-wider hover:text-[#D4AF37] transition ${isDarkMode ? 'text-gray-200' : 'text-black'}`;
  return (
    <>
      <header className={`sticky top-0 z-40 backdrop-blur border-b ${isDarkMode ? 'bg-[#121212]/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
        {/* from xl the menu sits in the middle of the page: logo | menu | buttons (side columns share the rest; never overlap) */}
        <div className="max-w-7xl mx-auto px-3 min-[380px]:px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2 xl:grid xl:grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] xl:gap-6">
          
          <div className="flex items-center gap-1.5 min-[380px]:gap-2 sm:gap-6 min-w-0 xl:justify-self-start">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className={`xl:hidden p-1 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'}`}
            >
              <Menu size={24} />
            </button>
            <div 
              onClick={() => { setCurrentView('home'); setSelectedCategory('All'); }}
              className="cursor-pointer flex items-center gap-1 min-w-0"
            >
              {/* the Kyvro logo is always there; a Premium shop shows its own name as a wordmark next to it; otherwise "KYVRO" (English only) next to the logo; under 320px only the logo */}
              {shopBrand && shopBrand.logo && <img src={shopBrand.logo} alt="" className="h-9 w-9 sm:h-11 sm:w-11 rounded object-cover border border-gray-300/40" />}
              <KyvroMark dark={isDarkMode} title="Kyvro logo" className={`${shopBrand && shopBrand.wordmark ? 'h-7 sm:h-9' : 'h-7 min-[400px]:h-8 sm:h-9'} w-auto shrink-0`} />
              {shopBrand && shopBrand.wordmark ? (
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-lg sm:text-2xl font-serif font-bold tracking-wide truncate max-w-[9rem] sm:max-w-[16rem]" style={{ color: shopBrand.color }}>{shopBrand.name}</span>
                  <span className="text-[9px] tracking-[0.2em] font-sans -mt-0.5 text-gray-500">POWERED BY KYVRO</span>
                </div>
              ) : (
                <span className={`flex items-center whitespace-nowrap leading-none max-[319px]:hidden ${isDarkMode ? 'text-[#D4AF37]' : 'text-black'}`}>
                  {/* Montserrat 600 with wide letter spacing (font loaded in index.html, only these 5 letters); the negative right margin cancels the last letter's spacing */}
                  <span className="text-[17px] min-[400px]:text-[20px] sm:text-[24px] font-semibold tracking-[0.3em] -mr-[0.3em] ml-1 sm:ml-1.5" style={{ fontFamily: 'Montserrat, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>KYVRO</span>
                </span>
              )}
            </div>
          </div>

          <nav className={`hidden xl:flex items-center gap-6 text-sm font-medium tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
            <button onClick={() => { setCurrentView('home'); setSelectedCategory('All'); }} className={`hover:text-[#D4AF37] transition ${currentView === 'home' ? 'text-[#D4AF37] border-b-2 border-[#D4AF37] pb-1' : ''}`}>HOME</button>
            {navHas('Men') && <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Men"); }} className="hover:text-[#D4AF37] transition">MEN'S</button>}
            {navHas('Women') && <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Women"); }} className="hover:text-[#D4AF37] transition">WOMEN'S</button>}
            {/* a shop with winter products gets its own WINTER entry (the main store keeps its menu) */}
            {winterNav && <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Winter"); }} className="hover:text-[#D4AF37] transition">WINTER</button>}
            {navHas('Shoes') && <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Shoes"); }} className="hover:text-[#D4AF37] transition">SHOES</button>}
            {navHas('Wallets') && <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Wallets"); }} className="hover:text-[#D4AF37] transition">WALLETS</button>}
            {navHas('Watches') && <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Watches"); }} className="hover:text-[#D4AF37] transition">WATCHES</button>}
          </nav>

          <div className="flex items-center gap-1 sm:gap-4 shrink-0 xl:justify-self-end">
            <div className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs font-semibold ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-black'}`}>
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
              className={`p-1.5 sm:p-2 rounded-full border transition hidden min-[430px]:flex items-center justify-center ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-[#D4AF37] hover:bg-[#222]' : 'bg-gray-100 border-gray-300 text-black hover:bg-gray-200'}`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              onClick={() => setCurrentView('tracking')}
              className={`transition p-1 hidden md:flex items-center gap-1 ${isDarkMode ? 'text-gray-300 hover:text-[#D4AF37]' : 'text-gray-700 hover:text-[#D4AF37]'}`}
              title="Order Tracking"
            >
              <Truck size={18} /><span className="hidden lg:inline text-xs font-semibold">Order Tracking</span>
            </button>

            <button 
              onClick={() => setCurrentView('shop')}
              className={`transition p-1 ${isDarkMode ? 'text-gray-300 hover:text-[#D4AF37]' : 'text-gray-700 hover:text-[#D4AF37]'}`}
              title="Search"
            >
              <Search size={18} />
            </button>

            <div className="relative" ref={menuRef}>
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
                  <div className={`absolute right-0 top-full mt-3 w-64 max-w-[calc(100vw-2rem)] z-50 rounded shadow-2xl border py-2 ${isDarkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200'}`}>
                    {customerUser ? (
                      <div className="px-5 py-3 border-b border-gray-200/20">
                        <p className="text-sm font-bold truncate">{displayName || 'Welcome'}</p>
                        <p className="text-[11px] text-gray-500 truncate">{customerUser.email}</p>
                      </div>
                    ) : (
                      <button onClick={() => go(onSignIn)} className={itemCls}>Sign In</button>
                    )}
                    <button onClick={() => go(() => goAccount('orders'))} className={itemCls}>My Orders</button>
                    <button onClick={() => go(() => setCurrentView('tracking'))} className={itemCls}>Order Tracking</button>
                    <button onClick={() => go(() => goAccount('settings'))} className={itemCls}>My Account Settings</button>
                    <button onClick={() => go(() => goAccount('wallet'))} className={itemCls}>My Wallet</button>
                    <button onClick={() => go(() => goAccount('saved'))} className={itemCls}>My Saved Items</button>
                    {customerUser && <button onClick={() => go(onSignOut)} className={itemCls}>Sign Out</button>}
                    {onStartSelling && <button onClick={() => go(onStartSelling)} className={`${itemCls} border-t border-gray-200/20 mt-1 text-[#D4AF37] font-semibold`}>{sellLabel}</button>}
                    {/* only the team (Owner / Manager / Admin): straight to the Admin Panel */}
                    {onAdminPanel && <button onClick={() => go(onAdminPanel)} className={`${itemCls} border-t border-gray-200/20 mt-1 font-semibold`}>Admin Panel</button>}
                  </div>
                </>
              )}
            </div>

            <button 
              data-cart-toggle
              onClick={() => setIsCartOpen((open) => !open)}
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
