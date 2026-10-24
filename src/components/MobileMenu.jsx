import React from 'react';
import { X } from 'lucide-react';

export default function MobileMenu({ isDarkMode, setCurrentView, setIsMobileMenuOpen, setSelectedCategory }) {
  return (
    <>
        <div className="fixed inset-0 z-50 bg-black/80 flex">
          <div className={`w-4/5 max-w-sm h-full p-6 flex flex-col justify-between border-r ${isDarkMode ? 'bg-[#121212] border-gray-800 text-white' : 'bg-white border-gray-300 text-black'}`}>
            <div>
              <div className="flex justify-between items-center mb-8">
                <div className="text-xl font-serif font-bold">KYVRO <span className="text-xs text-[#D4AF37]">কাইভ্রো</span></div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-black">
                  <X size={24} />
                </button>
              </div>
              <div className="flex flex-col gap-4 text-sm font-medium">
                <button onClick={() => { setCurrentView('home'); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 hover:text-[#D4AF37]">HOME</button>
                <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Men"); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 hover:text-[#D4AF37]">MEN'S (Shirt, Punjabi...)</button>
                <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Women"); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 hover:text-[#D4AF37]">WOMEN'S (Sharee, Bags...)</button>
                <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Shoes"); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 hover:text-[#D4AF37]">SHOES</button>
                <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Wallets"); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 hover:text-[#D4AF37]">WALLETS</button>
                <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Watches"); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 hover:text-[#D4AF37]">WATCHES</button>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              <p>www.kyvro.store</p>
              <p>Support: 24/7 Available</p>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)}></div>
        </div>
    </>
  );
}
