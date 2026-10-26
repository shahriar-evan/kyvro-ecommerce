import React from 'react';
import AdminLogin from './AdminLogin';
import AdminManager from './AdminManager';
import ImageField from './ImageField';
import SizeStockEditor from './SizeStockEditor';
import OrdersPanel from './OrdersPanel';
import StoreSettings from './StoreSettings';
import { SUB_CATEGORIES, hasSubCategories, hasSizeStock, totalStock, orderedSizes } from '../data/catalog';

export default function AdminPortal({ adminTab, deleteProduct, editingProductId, formatPrice, handleAdminLogout, handleEmailSignIn, handleGenderChange, handleGoogleSignIn, handleSaveProduct, isAdminLoggedIn, adminName, adminRole, canDeleteProduct, canApproveProduct, handleApproveProduct, pendingCount, isDarkMode, loggedInUserEmail, newProductForm, orders, products, storeSettings, isCloud, migrating, handleMigrateProducts, setAdminTab, setEditingProductId, setNewProductForm, startEditProduct }) {
  const isOwner = adminRole === 'owner';
  const canManageTeam = adminRole === 'owner' || adminRole === 'manager';
  const sizesUsed = Object.keys((newProductForm && newProductForm.sizeStock) || {}).length > 0;
  const sizesTotal = Object.values((newProductForm && newProductForm.sizeStock) || {}).reduce((sum, n) => sum + (parseInt(n, 10) || 0), 0);
  const roleLabel = adminRole ? adminRole.charAt(0).toUpperCase() + adminRole.slice(1) : '';

  return (
    <>
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          {!isAdminLoggedIn ? (
            <AdminLogin isDarkMode={isDarkMode} handleEmailSignIn={handleEmailSignIn} handleGoogleSignIn={handleGoogleSignIn} />
          ) : (
            <div className="space-y-8">
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-lg border gap-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div>
                  <h1 className="text-2xl font-serif font-bold">Kyvro Management Dashboard</h1>
                  <p className="text-xs text-gray-500">Logged in as: <strong className="text-[#D4AF37]">{adminName || loggedInUserEmail}</strong>{adminName && <span> ({loggedInUserEmail})</span>} &middot; {roleLabel} | Domain: www.kyvro.store</p>
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
                  Products ({products.length}){pendingCount > 0 && <span className="ml-2 bg-red-600 text-white rounded-full px-2 py-0.5 text-[10px]">{pendingCount} pending</span>}
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
                  {orders.filter(o => o.status === 'Pending').length > 0 && (
                    <span className="ml-2 bg-red-600 text-white rounded-full px-2 py-0.5 text-[10px]">{orders.filter(o => o.status === 'Pending').length} new</span>
                  )}
                </button>
                {isOwner && (
                  <button
                    onClick={() => setAdminTab('settings')}
                    className={`px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition ${adminTab === 'settings' ? 'bg-[#D4AF37] text-black' : 'bg-gray-200 dark:bg-[#181818] text-gray-700 dark:text-gray-300'}`}
                  >
                    Banner &amp; Discount
                  </button>
                )}
                {canManageTeam && (
                  <button 
                    onClick={() => setAdminTab('admins')} 
                    className={`px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition ${adminTab === 'admins' ? 'bg-[#D4AF37] text-black' : 'bg-gray-200 dark:bg-[#181818] text-gray-700 dark:text-gray-300'}`}
                  >
                    {isOwner ? 'Manage Admins' : 'Add Admin'}
                  </button>
                )}
              </div>

              {adminTab === 'settings' && isOwner && <StoreSettings settings={storeSettings} isDarkMode={isDarkMode} formatPrice={formatPrice} staff={{ email: loggedInUserEmail, name: adminName }} />}

              {adminTab === 'admins' && canManageTeam && <AdminManager isDarkMode={isDarkMode} currentEmail={loggedInUserEmail} currentName={adminName} adminRole={adminRole} />}

              {adminTab === 'products' && isOwner && !isCloud && (
                <div className="mb-4 rounded-lg border border-[#D4AF37] bg-[#D4AF37]/10 p-4 text-xs flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-2xl">Your products are only saved in this browser, so customers cannot see them. Move them to Firestore once so every customer on every device sees the same shop.</p>
                  <button onClick={handleMigrateProducts} disabled={migrating} className="bg-[#D4AF37] text-black font-bold px-5 py-2.5 rounded uppercase tracking-wider disabled:opacity-50">
                    {migrating ? 'Moving...' : 'Move products to Firestore'}
                  </button>
                </div>
              )}

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
                            <div>
                              <span className="font-semibold">{p.name}</span>
                              {p.status === 'pending' && <span className="ml-2 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded">PENDING APPROVAL</span>}
                              {(p.addedByName || p.addedBy) && <p className="text-[10px] text-gray-500 font-normal mt-0.5">Added by {p.addedByName || p.addedBy}</p>}
                            </div>
                          </td>
                          <td className="p-4 text-gray-500">{p.gender === p.category ? p.category : `${p.gender} / ${p.category}`}</td>
                          <td className="p-4 text-[#D4AF37] font-bold">{formatPrice(p.price)}</td>
                          <td className="p-4 text-gray-500">
                            {totalStock(p)} units
                            {hasSizeStock(p) && (
                              <p className="text-[10px] mt-0.5">
                                {orderedSizes(Object.keys(p.sizeStock), p.gender).map(sz => `${sz}: ${p.sizeStock[sz]}`).join(' · ')}
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {canApproveProduct(p) && <button onClick={() => handleApproveProduct(p)} className="px-3 py-1.5 rounded text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition">Approve</button>}
                            <button onClick={() => startEditProduct(p)} className="px-3 py-1.5 rounded text-xs font-semibold border bg-white text-gray-900 border-gray-400 hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:border-gray-500 dark:hover:bg-gray-600 transition">Edit</button>
                            {canDeleteProduct(p) && <button onClick={() => deleteProduct(p.id)} className="px-3 py-1.5 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition">{p.status === 'pending' ? 'Reject' : 'Delete'}</button>}
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

                    {hasSubCategories(newProductForm.gender) && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Sub Category *</label>
                        <select
                          value={newProductForm.category}
                          onChange={e => setNewProductForm({...newProductForm, category: e.target.value})}
                          className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                        >
                          {SUB_CATEGORIES[newProductForm.gender].map(item => item.group ? (
                            <optgroup key={item.group} label={item.group}>
                              {item.items.map(i => <option key={i} value={i}>{i}</option>)}
                            </optgroup>
                          ) : (
                            <option key={item.name} value={item.name}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
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
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{sizesUsed ? 'Total Stock (auto, from sizes)' : 'Stock Quantity *'}</label>
                      <input 
                        type="number" 
                        min="0"
                        required={!sizesUsed}
                        disabled={sizesUsed}
                        value={sizesUsed ? sizesTotal : newProductForm.stock}
                        onChange={e => setNewProductForm({...newProductForm, stock: e.target.value})}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <SizeStockEditor
                        gender={newProductForm.gender}
                        value={newProductForm.sizeStock || {}}
                        onChange={(sizeStock) => setNewProductForm({...newProductForm, sizeStock})}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <ImageField
                        value={newProductForm.image}
                        onChange={(image) => setNewProductForm(prev => ({...prev, image}))}
                        isDarkMode={isDarkMode}
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

              {adminTab === 'orders' && <OrdersPanel orders={orders} isDarkMode={isDarkMode} formatPrice={formatPrice} adminName={adminName} loggedInUserEmail={loggedInUserEmail} canUnblock={adminRole === 'owner' || adminRole === 'manager'} />}
            </div>
          )}
        </div>
    </>
  );
}
