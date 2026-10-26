import React from 'react';
import { MessageCircle } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../data/shopConfig';
import { SUB_CATEGORIES, COLLECTION_LABELS, DEFAULT_SUB_LABEL, hasSizeStock, totalStock } from '../data/catalog';

export default function ShopView({ addToCart, filteredProducts, formatPrice, isDarkMode, products, searchQuery, selectedCategory, selectedSubCategory, setSelectedSubCategory, setCurrentView, setSearchQuery, setSelectedCategory, setSelectedProduct, setSortBy, sortBy }) {
  return (
    <>
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold">
                {selectedCategory === 'All' ? 'Complete Collection' : `${selectedCategory} Collection`}
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                {(selectedCategory === 'Men' || selectedCategory === 'Women') && <span className="text-[#D4AF37] font-semibold">{selectedSubCategory || DEFAULT_SUB_LABEL[selectedCategory]} &middot; </span>}
                Showing {filteredProducts.length} luxury products
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full md:w-auto">
              <input 
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 md:flex-none border px-4 py-2 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#181818] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
              />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`border px-4 py-2 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#181818] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
              >
                <option value="featured">Sort by: Featured</option>
                <option value="newest">Sort by: Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-6">
              <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <h3 className="text-sm font-serif font-bold mb-4 uppercase tracking-wider">Categories</h3>
                <div className="flex flex-col space-y-1 text-xs">
                  {(() => {
                    const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
                    const row = (active, extra = '') => `text-left py-1.5 px-3 rounded transition w-full ${extra} ${active ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`;
                    const subBtn = (name, indent = '') => (
                      <button key={name} onClick={() => setSelectedSubCategory(name)} className={row(same(selectedSubCategory, name), indent)}>
                        {name}
                      </button>
                    );
                    return (
                      <>
                        <button onClick={() => setSelectedCategory('All')} className={row(selectedCategory === 'All')}>All Products</button>

                        {['Men', 'Women'].map((col) => (
                          <div key={col}>
                            <button onClick={() => setSelectedCategory(col)} className={row(selectedCategory === col && !selectedSubCategory, 'ml-2')}>
                              &bull; {COLLECTION_LABELS[col]}
                            </button>
                            {selectedCategory === col && (
                              <div className={`ml-6 mt-1 mb-1 pl-2 border-l space-y-1 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                                {SUB_CATEGORIES[col].map((item) =>
                                  item.group ? (
                                    <div key={item.group}>
                                      <button onClick={() => setSelectedSubCategory(item.group)} className={row(same(selectedSubCategory, item.group))}>
                                        {item.group}
                                      </button>
                                      <div className="ml-3 mt-1 space-y-1">
                                        {item.items.map((i) => subBtn(i))}
                                      </div>
                                    </div>
                                  ) : subBtn(item.name)
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        {['Shoes', 'Wallets', 'Watches'].map((col) => (
                          <button key={col} onClick={() => setSelectedCategory(col)} className={row(selectedCategory === col, 'ml-2')}>
                            &bull; {COLLECTION_LABELS[col]}
                          </button>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <div key={product.id} className={`group rounded-lg overflow-hidden border flex flex-col ${isDarkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="relative h-64 overflow-hidden bg-gray-900 cursor-pointer" onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}>
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      {totalStock(product) <= 0 && <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">SOLD OUT</span>}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider">{product.category}</span>
                        <h3 onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }} className="text-sm font-semibold mt-1 cursor-pointer hover:text-[#D4AF37] line-clamp-1">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm font-bold">{formatPrice(product.price)}</span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}
                            className={`border text-[11px] font-semibold py-2 rounded transition text-center ${isDarkMode ? 'border-gray-700 text-gray-300 hover:border-[#D4AF37] hover:text-white' : 'border-gray-300 text-gray-700 hover:border-[#D4AF37]'}`}
                          >
                            Details
                          </button>
                          <button 
                            disabled={totalStock(product) <= 0}
                            onClick={() => hasSizeStock(product)
                              ? (setSelectedProduct(product), setCurrentView('product-detail'))
                              : addToCart(product, product.colors[0], product.sizes[0], 1)}
                            className="bg-[#D4AF37] text-black text-[11px] font-bold py-2 rounded hover:opacity-90 transition text-center disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {totalStock(product) <= 0 ? 'Sold Out' : hasSizeStock(product) ? 'Select Size' : 'Add to Cart'}
                          </button>
                        </div>
                        <button
                          disabled={totalStock(product) <= 0}
                          onClick={() => hasSizeStock(product)
                            ? (setSelectedProduct(product), setCurrentView('product-detail'))
                            : addToCart(product, product.colors[0], product.sizes[0], 1, true)}
                          className={`w-full border-2 border-[#D4AF37] ${isDarkMode ? 'text-[#D4AF37]' : 'text-black'} text-[11px] font-bold py-2 rounded hover:bg-[#D4AF37]/10 transition text-center uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          Buy Now
                        </button>
                        <a
                          href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hello%20Kyvro,%20I%20want%20to%20order:%0A*%20Name:%20${encodeURIComponent(product.name)}%0A*%20Price:%20${encodeURIComponent(formatPrice(product.price))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-[#25D366] text-white font-bold py-2 rounded text-[11px] uppercase tracking-wider hover:opacity-90 transition flex items-center justify-center gap-1.5 shadow"
                        >
                          <MessageCircle size={13} /> Order on WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
