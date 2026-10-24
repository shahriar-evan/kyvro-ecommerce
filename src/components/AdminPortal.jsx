import React from 'react';
import { Lock } from 'lucide-react';

export default function AdminPortal({ adminPin, adminTab, deleteProduct, editingProductId, exportOrdersCSV, formatPrice, handleAdminLogin, handleAdminLogout, handleGenderChange, handleGoogleSignIn, handleSaveProduct, isAdminLoggedIn, isDarkMode, loggedInUserEmail, newProductForm, orders, products, setAdminPin, setAdminTab, setEditingProductId, setNewProductForm, startEditProduct }) {
  return (
    <>
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          {!isAdminLoggedIn ? (
            <div className={`max-w-md mx-auto p-8 rounded-xl border shadow-2xl space-y-6 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="text-center space-y-2">
                <Lock size={40} className="mx-auto text-[#D4AF37]" />
                <h2 className="text-2xl font-serif font-bold">KYVRO ADMIN PORTAL</h2>
                <p className="text-xs text-gray-500">Sign in using your Security PIN or Google account.</p>
              </div>

              {/* PIN Login Form */}
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Admin Security PIN</label>
                  <input 
                    type="password" 
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Enter Admin PIN"
                    className={`w-full border p-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                  />
                </div>
                <button type="submit" className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded text-xs uppercase tracking-widest hover:opacity-90 transition">
                  Access via PIN
                </button>
              </form>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase">Or</span>
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
              </div>

              {/* Google Sign-In Button */}
              <button 
                onClick={handleGoogleSignIn}
                className="w-full bg-white hover:bg-gray-100 text-black border border-gray-300 font-bold py-3.5 rounded text-xs uppercase tracking-wider flex items-center justify-center gap-3 shadow transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-lg border gap-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div>
                  <h1 className="text-2xl font-serif font-bold">Kyvro Management Dashboard</h1>
                  <p className="text-xs text-gray-500">Logged in as: <strong className="text-[#D4AF37]">{loggedInUserEmail}</strong> | Domain: www.kyvro.store</p>
                </div>
                <button 
                  onClick={handleAdminLogout}
                  className="bg-gray-800 hover:bg-red-900 text-gray-300 px-4 py-2 rounded text-xs font-bold transition"
                >
                  Logout Admin
                </button>
              </div>

              <div className="flex flex-wrap gap-2 border-b pb-4">
                <button 
                  onClick={() => setAdminTab('products')} 
                  className={`px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition ${adminTab === 'products' ? 'bg-[#D4AF37] text-black' : 'bg-gray-200 dark:bg-[#181818] text-gray-700 dark:text-gray-300'}`}
                >
                  Products ({products.length})
                </button>
                <button 
                  onClick={() => { setEditingProductId(null); setAdminTab('add-product'); }} 
                  className={`px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition ${adminTab === 'add-product' ? 'bg-[#D4AF37] text-black' : 'bg-gray-200 dark:bg-[#181818] text-gray-700 dark:text-gray-300'}`}
                >
                  {editingProductId ? 'Edit Product' : '+ Add Product'}
                </button>
                <button 
                  onClick={() => setAdminTab('orders')} 
                  className={`px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition ${adminTab === 'orders' ? 'bg-[#D4AF37] text-black' : 'bg-gray-200 dark:bg-[#181818] text-gray-700 dark:text-gray-300'}`}
                >
                  Orders ({orders.length})
                </button>
              </div>

              {adminTab === 'products' && (
                <div className={`rounded-lg border overflow-x-auto ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`uppercase tracking-wider border-b ${isDarkMode ? 'bg-[#1f1f1f] text-gray-400 border-gray-800' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      <tr>
                        <th className="p-4">Product</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Price</th>
                        <th className="p-4">Stock</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-gray-100 dark:hover:bg-[#1a1a1a]">
                          <td className="p-4 flex items-center gap-3">
                            <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded" />
                            <span className="font-semibold">{p.name}</span>
                          </td>
                          <td className="p-4 text-gray-500">{p.gender} / {p.category}</td>
                          <td className="p-4 text-[#D4AF37] font-bold">{formatPrice(p.price)}</td>
                          <td className="p-4 text-gray-500">{p.stock} units</td>
                          <td className="p-4 text-right space-x-2">
                            <button onClick={() => startEditProduct(p)} className="text-gray-500 hover:text-black dark:hover:text-white px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">Edit</button>
                            <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300 px-2 py-1 bg-red-950/40 rounded">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {adminTab === 'add-product' && (
                <form onSubmit={handleSaveProduct} className={`p-8 rounded-lg border space-y-6 max-w-3xl ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <h3 className="text-lg font-serif font-bold border-b pb-3">
                    {editingProductId ? 'Edit Product Details' : 'Add New Luxury Product'}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Product Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={newProductForm.name}
                        onChange={e => setNewProductForm({...newProductForm, name: e.target.value})}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Main Collection / Gender *</label>
                      <select 
                        value={newProductForm.gender}
                        onChange={e => handleGenderChange(e.target.value)}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                      >
                        <option value="Men">Men's Collection</option>
                        <option value="Women">Women's Collection</option>
                        <option value="Shoes">Shoes</option>
                        <option value="Wallets">Wallets</option>
                        <option value="Watches">Watches</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Selling Price (BDT) *</label>
                      <input 
                        type="number" 
                        required 
                        value={newProductForm.price}
                        onChange={e => setNewProductForm({...newProductForm, price: e.target.value})}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Stock Quantity *</label>
                      <input 
                        type="number" 
                        required 
                        value={newProductForm.stock}
                        onChange={e => setNewProductForm({...newProductForm, stock: e.target.value})}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Product Image URL / Upload *</label>
                      <input 
                        type="url" 
                        value={newProductForm.image}
                        onChange={e => setNewProductForm({...newProductForm, image: e.target.value})}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Description *</label>
                      <textarea 
                        rows="3"
                        required 
                        value={newProductForm.description}
                        onChange={e => setNewProductForm({...newProductForm, description: e.target.value})}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                      ></textarea>
                    </div>
                  </div>

                  <button type="submit" className="bg-[#D4AF37] text-black font-bold px-8 py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 transition">
                    {editingProductId ? 'Update Product' : 'Save Product to Store'}
                  </button>
                </form>
              )}

              {adminTab === 'orders' && (
                <div className="space-y-6">
                  <div className={`flex justify-between items-center p-4 rounded border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <p className="text-xs text-gray-500">Total Orders: <strong className="font-bold">{orders.length}</strong></p>
                    <button onClick={exportOrdersCSV} className="bg-[#D4AF37] text-black text-xs font-bold px-4 py-2 rounded uppercase tracking-wider">
                      Export Orders to CSV
                    </button>
                  </div>
                  {orders.map((ord, idx) => (
                    <div key={idx} className={`p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="flex justify-between border-b pb-3">
                        <span className="text-sm font-bold text-[#D4AF37]">{ord.orderNumber}</span>
                        <span className="text-sm font-bold">{formatPrice(ord.total)}</span>
                      </div>
                      <p className="text-xs text-gray-500">Customer: {ord.customer.fullName} ({ord.customer.phone}) - {ord.customer.address}, {ord.customer.city}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
    </>
  );
}
