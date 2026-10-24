import React from 'react';

export default function ShopView({ addToCart, filteredProducts, formatPrice, isDarkMode, products, searchQuery, selectedCategory, setCurrentView, setSearchQuery, setSelectedCategory, setSelectedProduct, setSortBy, sortBy }) {
  return (
    <>
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold">
                {selectedCategory === 'All' ? 'Complete Collection' : `${selectedCategory} Collection`}
              </h1>
              <p className="text-xs text-gray-500 mt-1">Showing {filteredProducts.length} luxury products</p>
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
                <div className="flex flex-col space-y-2 text-xs">
                  <button onClick={() => setSelectedCategory('All')} className={`text-left py-2 px-3 rounded transition ${selectedCategory === 'All' ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`}>All Products</button>
                  <button onClick={() => setSelectedCategory('Men')} className={`text-left py-1.5 px-4 rounded transition ml-2 ${selectedCategory === 'Men' ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`}>&bull; Men's Collection</button>
                  <button onClick={() => setSelectedCategory('Women')} className={`text-left py-1.5 px-4 rounded transition ml-2 ${selectedCategory === 'Women' ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`}>&bull; Women's Collection</button>
                  <button onClick={() => setSelectedCategory('Shoes')} className={`text-left py-1.5 px-4 rounded transition ml-2 ${selectedCategory === 'Shoes' ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`}>&bull; Shoes</button>
                  <button onClick={() => setSelectedCategory('Wallets')} className={`text-left py-1.5 px-4 rounded transition ml-2 ${selectedCategory === 'Wallets' ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`}>&bull; Wallets</button>
                  <button onClick={() => setSelectedCategory('Watches')} className={`text-left py-1.5 px-4 rounded transition ml-2 ${selectedCategory === 'Watches' ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`}>&bull; Watches</button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <div key={product.id} className={`group rounded-lg overflow-hidden border flex flex-col ${isDarkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="relative h-64 overflow-hidden bg-gray-900 cursor-pointer" onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}>
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
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
                            onClick={() => addToCart(product, product.colors[0], product.sizes[0], 1)}
                            className="bg-[#D4AF37] text-black text-[11px] font-bold py-2 rounded hover:opacity-90 transition text-center"
                          >
                            Add to Cart
                          </button>
                        </div>
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
