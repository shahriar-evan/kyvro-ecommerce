import PriceTag, { DiscountBadge } from './PriceTag';
import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import WhatsAppButton from './WhatsAppButton';
import { waOrderLink, waProductLines } from '../whatsappOrder';
import StockLabel from './StockLabel';
import ShoeWall from './ShoeWall';
import { CollectionRail } from './HomeShowcase';
import { subLabel, SUB_CATEGORIES, COLLECTION_LABELS, DEFAULT_SUB_LABEL, hasSubCategories, hasSizeStock, totalStock } from '../data/catalog';

export default function ShopView({ requestAdd, addToCart, filteredProducts, formatPrice, isDarkMode, products, searchQuery, selectedCategory, selectedSubCategory, setSelectedSubCategory, setCurrentView, setSearchQuery, setSelectedCategory, setSelectedProduct, setSortBy, sortBy, savedIds = [], toggleSaved = () => {} }) {
  // Men / Women: the hanging rail from the home page hangs at the top (pinned pieces first); the rest of the
  // whole collection is listed below it (the rail pieces last), 4 cards a row, with the sections as chips on top (no side menu).
  // The Complete Collection (All) page works the same way: the Men's rail on top, collection chips instead of the side menu.
  const allPage = selectedCategory === 'All';
  const railCol = selectedCategory === 'Men' || selectedCategory === 'Women' || allPage;
  const railCollection = allPage ? 'Men' : selectedCategory;
  const railOn = railCol && !String(searchQuery || '').trim();
  const [railIds, setRailIds] = useState([]);
  // the pieces on the rail are listed too, at the end (the others first)
  const gridProducts = railOn && railIds.length
    ? [...filteredProducts.filter((p) => !railIds.includes(String(p.id))), ...filteredProducts.filter((p) => railIds.includes(String(p.id)))]
    : filteredProducts;
  const openProduct = (p) => { setSelectedProduct(p); setCurrentView('product-detail'); };
  const seeAll = () => { try { document.getElementById('kyvro-shop-grid').scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* no grid */ } };
  const card = (product) => (
                  <div key={product.id} className={`group rounded-lg overflow-hidden border flex flex-col ${isDarkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="relative h-64 overflow-hidden bg-gray-900 cursor-pointer" onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}>
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSaved(product.id); }}
                        title={savedIds.includes(product.id) ? 'Remove from saved items' : 'Save this item'}
                        className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 text-black shadow flex items-center justify-center hover:scale-110 transition"
                      >
                        <Heart size={16} className={savedIds.includes(product.id) ? 'fill-red-500 text-red-500' : ''} />
                      </button>
                      <DiscountBadge price={product.price} originalPrice={product.originalPrice} className="absolute top-3 right-3" />
                      {totalStock(product) <= 0 && <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">SOLD OUT</span>}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider">{product.category}</span>
                        <h3 onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }} className="text-sm font-semibold mt-1 cursor-pointer hover:text-[#D4AF37] line-clamp-1">
                          {product.name}
                        </h3>
                        <div className="mt-2">
                          <PriceTag price={product.price} originalPrice={product.originalPrice} formatPrice={formatPrice} isDarkMode={isDarkMode} />
                        </div>
                        <StockLabel count={totalStock(product)} text={product.stockText} className="mt-1.5" />
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
                            onClick={() => requestAdd(product, false)}
                            className="bg-[#D4AF37] text-black text-[11px] font-bold py-2 rounded hover:opacity-90 transition text-center disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {totalStock(product) <= 0 ? 'Sold Out' : 'Add to Cart'}
                          </button>
                        </div>
                        <button
                          disabled={totalStock(product) <= 0}
                          onClick={() => requestAdd(product, true)}
                          className={`w-full border-2 border-[#D4AF37] ${isDarkMode ? 'text-[#D4AF37]' : 'text-black'} text-[11px] font-bold py-2 rounded hover:bg-[#D4AF37]/10 transition text-center uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          Buy Now
                        </button>
                        <WhatsAppButton compact href={waOrderLink(waProductLines({ id: product.id, name: product.name, price: product.price }))} />
                      </div>
                    </div>
                  </div>
  );
  return (
    <>
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold">
                {selectedCategory === 'All' ? 'Complete Collection' : (selectedCategory === 'Women' || selectedCategory === 'Winter') ? COLLECTION_LABELS[selectedCategory] : `${selectedCategory} Collection`}
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                {hasSubCategories(selectedCategory) && <span className="text-[#D4AF37] font-semibold">{selectedSubCategory || DEFAULT_SUB_LABEL[selectedCategory]} &middot; </span>}
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
                <option value="featured">Sort by: Best selling</option>
                <option value="newest">Sort by: Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Sub-categories as a chip row at the top (phones; Men / Women on every screen), products right below */}
          {allPage && (() => {
            const chip = (active) => `shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition ${active ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : isDarkMode ? 'border-gray-700 text-gray-300 hover:border-[#D4AF37]' : 'border-gray-300 text-gray-700 hover:border-[#D4AF37]'}`;
            return (
              <div className="lg:flex-wrap lg:overflow-visible -mx-4 px-4 mb-5 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                <button onClick={() => setSelectedCategory('All')} className={chip(true)}>All</button>
                {[['Men', "Men's"], ['Women', "Women's"], ['Winter', 'Winter'], ['Shoes', 'Shoes'], ['Wallets', 'Wallets'], ['Watches', 'Watches']].map(([col, label]) => (
                  <button key={col} onClick={() => { setSelectedCategory(col); try { window.scrollTo({ top: 0 }); } catch (e) { /* old browser */ } }} className={chip(false)}>{label}</button>
                ))}
              </div>
            );
          })()}
          {hasSubCategories(selectedCategory) && (() => {
            const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
            const names = SUB_CATEGORIES[selectedCategory].flatMap((it) => (it.group ? [it.group, ...it.items] : [it.name]));
            const chip = (active) => `shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition ${active ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-300 text-gray-700'}`;
            return (
              <div className={`${railCol ? 'lg:flex-wrap lg:overflow-visible' : 'lg:hidden'} -mx-4 px-4 mb-5 flex gap-2 overflow-x-auto pb-1`} style={{ scrollbarWidth: 'none' }}>
                <button onClick={() => setSelectedCategory(selectedCategory)} className={chip(!selectedSubCategory)}>All</button>
                {names.map((n) => (
                  <button key={n} onClick={() => setSelectedSubCategory(n)} className={chip(same(selectedSubCategory, n))}>{subLabel(n)}</button>
                ))}
              </div>
            );
          })()}
        </div>

        {railOn && (
          <CollectionRail products={products} collection={railCollection} sub={allPage ? null : selectedSubCategory} formatPrice={formatPrice}
            addToCart={addToCart} openProduct={openProduct} onItems={setRailIds} onSeeAll={seeAll} />
        )}

        <div id="kyvro-shop-grid" className={`flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 w-full scroll-mt-24 ${railOn ? 'pt-10 sm:pt-14' : ''}`}>
          {/* Shoes: the shoe wall (pairs on shelves, 2 / 4 / 6 a row) instead of the card grid */}
          {selectedCategory === 'Shoes' ? (
            <ShoeWall products={filteredProducts} formatPrice={formatPrice} isDarkMode={isDarkMode}
              openProduct={openProduct} />
          ) : railCol ? (
            <>
              {railOn && gridProducts.length > 0 && <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">{allPage ? 'All products' : 'More in this collection'}</h2>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
                {gridProducts.map(card)}
              </div>
            </>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-6 hidden lg:block">
              <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <h3 className="text-sm font-serif font-bold mb-4 uppercase tracking-wider">Categories</h3>
                <div className="flex flex-col space-y-1 text-xs">
                  {(() => {
                    const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
                    const row = (active, extra = '') => `text-left py-1.5 px-3 rounded transition w-full ${extra} ${active ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`;
                    const subBtn = (name, indent = '') => (
                      <button key={name} onClick={() => setSelectedSubCategory(name)} className={row(same(selectedSubCategory, name), indent)}>
                        {subLabel(name)}
                      </button>
                    );
                    return (
                      <>
                        <button onClick={() => setSelectedCategory('All')} className={row(selectedCategory === 'All')}>All Products</button>

                        {['Men', 'Women', 'Winter'].map((col) => (
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
                {filteredProducts.map(card)}
              </div>
            </div>
          </div>
          )}
        </div>
    </>
  );
}
