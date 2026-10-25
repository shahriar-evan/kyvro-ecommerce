import React from 'react';
import { hasSizeStock, totalStock } from '../data/catalog';
import { User, Shield, Truck, RefreshCw, ChevronRight, MessageCircle } from 'lucide-react';
import heroBannerImg from '../assets/hero-banner.png';
import shirtImg from '../assets/shirts.png';
import sneakersImg from '../assets/Snekers.png';

export default function HomeView({ addToCart, banners, calculateDiscountPercent, currentBannerIndex, formatPrice, isDarkMode, products, setCurrentBannerIndex, setCurrentView, setSelectedCategory, setSelectedProduct }) {
  return (
    <>
        <div className="flex-1">
          <section className="relative h-[70vh] sm:h-[80vh] flex flex-col justify-between items-center text-center bg-cover bg-center py-6 px-4" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${heroBannerImg})` }}>
            <div className="w-full flex justify-center pt-2">
              <span className={`text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] font-semibold px-4 sm:px-6 py-2 rounded-full border shadow-xl ${isDarkMode ? 'bg-black/70 text-[#D4AF37] border-[#D4AF37]/50' : 'bg-white/90 text-black border-black/20'}`}>
                KYVRO &bull; কাইভ্রো LUXURY COLLECTION
              </span>
            </div>
            <div></div>
            <div className="w-full flex justify-center pb-12 sm:pb-20">
              <button 
                onClick={() => setCurrentView('shop')}
                className="bg-[#D4AF37] text-black font-bold px-6 sm:px-8 py-3.5 sm:py-4 rounded text-xs tracking-[0.2em] uppercase hover:bg-white transition shadow-2xl transform hover:scale-105"
              >
                Explore Collection
              </button>
            </div>
          </section>

          {/* AUTOMATIC BANNERS SLIDER */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-4">
            <div className="relative h-[280px] sm:h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-transparent">
              {banners.map((img, idx) => (
                <div 
                  key={idx}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                  <img src={img} alt={`Kyvro Banner ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center">
                    <button 
                      onClick={() => setCurrentView('shop')}
                      className="bg-[#D4AF37] text-black text-xs font-bold px-6 sm:px-8 py-2.5 sm:py-3 uppercase tracking-widest rounded shadow-2xl hover:bg-white transition transform hover:scale-105"
                    >
                      Shop Now
                    </button>
                  </div>
                </div>
              ))}

              <div className="absolute bottom-4 right-6 z-20 flex gap-2">
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
              ].map((cat, idx) => (
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
                {products.slice(0, 4).map(product => {
                  const discountPct = calculateDiscountPercent(product.price, product.originalPrice);
                  return (
                    <div key={product.id} className={`group rounded-lg overflow-hidden border flex flex-col ${isDarkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="relative h-64 sm:h-72 overflow-hidden bg-gray-900 cursor-pointer" onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}>
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        {product.isNew && (
                          <span className="absolute top-3 left-3 bg-[#D4AF37] text-black text-[10px] font-bold px-2.5 py-1 tracking-wider uppercase">
                            New
                          </span>
                        )}
                        {product.originalPrice > product.price && (
                          <div className="absolute top-3 right-3 flex flex-col items-end">
                            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">Sale</span>
                          </div>
                        )}
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
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-sm sm:text-base font-bold">{formatPrice(product.price)}</span>
                            {product.originalPrice > product.price && (
                              <span className="text-xs text-gray-500 line-through">{formatPrice(product.originalPrice)}</span>
                            )}
                          </div>
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
                              onClick={() => hasSizeStock(product)
                                ? (setSelectedProduct(product), setCurrentView('product-detail'))
                                : addToCart(product, product.colors[0], product.sizes[0], 1)}
                              className="bg-[#D4AF37] text-black text-xs font-bold py-2.5 rounded hover:opacity-90 transition text-center disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {totalStock(product) <= 0 ? 'Sold Out' : hasSizeStock(product) ? 'Select Size' : 'Add to Cart'}
                            </button>
                          </div>
                          <a 
                            href={`https://wa.me/60123456789?text=Hello%20Kyvro,%20I%20want%20to%20order:%0A*%20Name:%20${encodeURIComponent(product.name)}%0A*%20Price:%20${encodeURIComponent(formatPrice(product.price))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-[#25D366] text-white font-bold py-2 rounded text-[11px] uppercase tracking-wider hover:opacity-90 transition flex items-center justify-center gap-1.5 shadow"
                          >
                            <MessageCircle size={13} /> Order on WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Why Choose Kyvro */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
              {[
                { icon: Shield, title: "Uncompromising Quality", desc: "Hand-selected fabrics, genuine leather, and premium stainless steel materials." },
                { icon: Truck, title: "Secure Worldwide Delivery", desc: "Fast, insured shipping directly to your doorstep with real-time tracking." },
                { icon: RefreshCw, title: "Hassle-Free Returns", desc: "30-day return policy for peace of mind and absolute customer satisfaction." },
                { icon: User, title: "24/7 VIP Support", desc: "Dedicated assistance anytime at kyvrofashion@gmail.com." }
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
