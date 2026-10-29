import React from 'react';
import AdminLogin from './AdminLogin';
import AdminManager from './AdminManager';
import ImageField from './ImageField';
import SizeStockEditor from './SizeStockEditor';
import ColorPhotos from './ColorPhotos';
import ColorPicker from './ColorPicker';
import OrdersPanel from './OrdersPanel';
import StoreSettings from './StoreSettings';
import { SUB_CATEGORIES, hasSubCategories, hasSizeStock, hasColorStock, totalStock, orderedSizes } from '../data/catalog';

export default function AdminPortal({ adminTab, deleteProduct, editingProductId, formatPrice, handleAdminLogout, handleEmailSignIn, handleGenderChange, handleGoogleSignIn, handleSaveProduct, isAdminLoggedIn, adminName, adminRole, canDeleteProduct, canApproveProduct, handleApproveProduct, pendingCount, isDarkMode, loggedInUserEmail, newProductForm, orders, productCosts = {}, products, storeSettings, isCloud, migrating, handleMigrateProducts, setAdminTab, setEditingProductId, setNewProductForm, startEditProduct, clearProductForm, handleDeleteRequest }) {
  const isOwner = adminRole === 'owner';
  const canManageTeam = adminRole === 'owner' || adminRole === 'manager';
  const formColors = ((newProductForm && newProductForm.colors) || '').split(',').map(s => s.trim()).filter(Boolean);
  const perColorOn = !!(newProductForm && newProductForm.trackColors);
  const formSizeNames = Object.keys((newProductForm && newProductForm.sizeStock) || {});
  // stock total of the form: from sizes, or from size x color boxes, or the plain Stock Quantity box
  const sizesUsed = formSizeNames.length > 0 || perColorOn;
  const sizesTotal = perColorOn
    ? Object.entries(newProductForm.colorStock || {}).reduce((sum, [k, n]) => (formSizeNames.length ? formSizeNames : ['']).includes(k.split('|')[0]) ? sum + (parseInt(n, 10) || 0) : sum, 0)
    : Object.values((newProductForm && newProductForm.sizeStock) || {}).reduce((sum, n) => sum + (parseInt(n, 10) || 0), 0);
  // colors that can have their own photo: the typed stock colors, or the Colors field
  const photoColors = perColorOn
    ? [...new Set(Object.keys((newProductForm && newProductForm.colorStock) || {}).filter((k) => (formSizeNames.length ? formSizeNames : ['']).includes(k.split('|')[0])).map((k) => k.split('|').slice(1).join('|').trim()).filter(Boolean))]
    : formColors;
  // tap a color on / off. Switching one off also removes its stock rows and its photo.
  const setFormColors = (list) => setNewProductForm(prev => ({ ...prev, colors: list.join(', ') }));
  const addFormColor = (c) => setFormColors([...formColors, c]);
  const toggleFormColor = (c) => {
    if (!formColors.some(x => x.toLowerCase() === c.toLowerCase())) { addFormColor(c); return; }
    setNewProductForm(prev => {
      const colorStock = {};
      Object.entries(prev.colorStock || {}).forEach(([k, v]) => { if (k.split('|').slice(1).join('|').trim().toLowerCase() !== c.toLowerCase()) colorStock[k] = v; });
      const colorImages = { ...(prev.colorImages || {}) };
      Object.keys(colorImages).forEach(k => { if (k.toLowerCase() === c.toLowerCase()) delete colorImages[k]; });
      const left = (prev.colors || '').split(',').map(x => x.trim()).filter(x => x && x.toLowerCase() !== c.toLowerCase());
      return { ...prev, colors: left.join(', '), colorStock, colorImages };
    });
  };
  // supplier shop names used before (for the suggestion list in the form)
  const supplierNames = [...new Set(['SelfShop', ...Object.values(productCosts).map((c) => (c && c.supplierName) || '').filter(Boolean)])];
  const formCostNum = parseFloat(newProductForm && newProductForm.supplierCost);
  const formPriceNum = parseFloat(newProductForm && newProductForm.price);
  const formProfit = !Number.isNaN(formCostNum) && !Number.isNaN(formPriceNum) ? formPriceNum - formCostNum : null;
  const firstPhotoColor = photoColors.find((c) => (newProductForm.colorImages || {})[c]);
  const hasColorPhotos = !!firstPhotoColor;
  const inputCls = `w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;
  const linkPerColor = !!(newProductForm && newProductForm.linkPerColor);
  const colorLinks = (newProductForm && newProductForm.colorLinks) || {};
  const setColorLink = (c, v) => setNewProductForm(prev => ({ ...prev, colorLinks: { ...(prev.colorLinks || {}), [c]: v } }));
  const supplierPanel = (
    <div className="rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/5 p-4 space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">Supplier details (dropshipping) · private</p>
        <p className="text-[11px] text-gray-500 mt-0.5">Only the Owner, Managers and Admins can see this. Customers never see it. Leave it empty for products you keep in your own stock.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Shop name (where you buy it)</label>
          <input type="text" list="kyvro-supplier-names" placeholder="e.g. SelfShop" maxLength={80}
            value={newProductForm.supplierName || ''}
            onChange={e => setNewProductForm(prev => ({ ...prev, supplierName: e.target.value }))}
            className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Supplier cost (BDT, per piece)</label>
          <input type="number" placeholder="e.g. 440"
            value={newProductForm.supplierCost ?? ''}
            onChange={e => setNewProductForm(prev => ({ ...prev, supplierCost: e.target.value }))}
            className={inputCls} />
        </div>
      </div>
      {formProfit !== null && (
        <p className={`text-xs font-semibold ${formProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          Selling price {formatPrice(formPriceNum)} − supplier cost {formatPrice(formCostNum)} = {formProfit >= 0 ? 'profit' : 'LOSS'} {formatPrice(Math.abs(formProfit))} per piece
        </p>
      )}
      {!linkPerColor && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Supplier product link (optional){photoColors.length > 1 ? ' · same for all colors' : ''}</label>
          <input type="text" placeholder="https://selfshop.com.bd/product/..." maxLength={500}
            value={newProductForm.supplierLink || ''}
            onChange={e => setNewProductForm(prev => ({ ...prev, supplierLink: e.target.value }))}
            className={inputCls} />
        </div>
      )}
      {photoColors.length > 0 && (
        <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
          <input type="checkbox" className="mt-0.5 accent-[#D4AF37]" checked={linkPerColor}
            onChange={e => setNewProductForm(prev => ({ ...prev, linkPerColor: e.target.checked }))} />
          <span><strong>Each color has its own link</strong><br /><span className="text-[11px] text-gray-500">Tick this if the supplier has a separate product page for each color (for example White and Red). Leave it unticked when one link is enough.</span></span>
        </label>
      )}
      {linkPerColor && photoColors.length > 0 && (
        <div className="space-y-2">
          {photoColors.map((c) => (
            <div key={c}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{c} · supplier link</label>
              <input type="text" placeholder="https://..." maxLength={500}
                value={colorLinks[c] || ''}
                onChange={e => setColorLink(c, e.target.value)}
                className={inputCls} />
            </div>
          ))}
        </div>
      )}
      {linkPerColor && photoColors.length === 0 && <p className="text-[11px] text-amber-600">Add the product colors first, then a link box will appear for each color.</p>}
    </div>
  );
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

              {adminTab === 'products' && adminRole === 'owner' && products.some((p) => p.deleteRequested) && (
                <div className="mb-4 p-4 rounded-lg border border-red-500/40 bg-red-500/10 text-xs text-red-600 dark:text-red-400 font-semibold">
                  {products.filter((p) => p.deleteRequested).length} delete request(s) waiting for your decision. Use Delete or Keep on the highlighted rows below.
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
                        <tr key={p.id} className={`hover:bg-gray-100 dark:hover:bg-[#1a1a1a] ${p.deleteRequested ? 'bg-red-500/10' : ''}`}>
                          <td className="p-4 flex items-center gap-3">
                            <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded" />
                            <div>
                              <span className="font-semibold">{p.name}</span>
                              {p.status === 'pending' && <span className="ml-2 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded">PENDING APPROVAL</span>}
                              {p.deleteRequested && <span className="ml-2 bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded">DELETE REQUESTED{(p.deleteRequestedByName || p.deleteRequestedBy) ? ` BY ${String(p.deleteRequestedByName || p.deleteRequestedBy).toUpperCase()}` : ''}</span>}
                              {(p.addedByName || p.addedBy) && <p className="text-[10px] text-gray-500 font-normal mt-0.5">Added by {p.addedByName || p.addedBy}</p>}
                            </div>
                          </td>
                          <td className="p-4 text-gray-500">{p.gender === p.category ? p.category : `${p.gender} / ${p.category}`}</td>
                          <td className="p-4 text-[#D4AF37] font-bold">
                            {formatPrice(p.price)}
                            {productCosts[String(p.id)] && productCosts[String(p.id)].supplierCost !== undefined && (
                              <p className="text-[10px] font-normal text-gray-500 mt-0.5">
                                Cost {formatPrice(productCosts[String(p.id)].supplierCost)} · <span className={p.price - productCosts[String(p.id)].supplierCost >= 0 ? 'text-green-600' : 'text-red-500'}>Profit {formatPrice(p.price - productCosts[String(p.id)].supplierCost)}</span>
                                {productCosts[String(p.id)].supplierName ? ` · ${productCosts[String(p.id)].supplierName}` : ''}
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-gray-500">
                            {totalStock(p)} units
                            {hasSizeStock(p) && (
                              <p className="text-[10px] mt-0.5">
                                {orderedSizes(Object.keys(p.sizeStock), p.gender).map(sz => `${sz}: ${p.sizeStock[sz]}`).join(' · ')}
                              </p>
                            )}
                            {hasColorStock(p) && (
                              <p className="text-[10px] mt-0.5 leading-relaxed">
                                {Object.entries(p.colorStock).map(([k, n]) => { const [sz, col] = k.split('|'); return `${sz ? sz + ' ' : ''}${col}: ${n}`; }).join(' · ')}
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {canApproveProduct(p) && <button onClick={() => handleApproveProduct(p)} className="px-3 py-1.5 rounded text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition">Approve</button>}
                            <button onClick={() => startEditProduct(p)} className="px-3 py-1.5 rounded text-xs font-semibold border bg-white text-gray-900 border-gray-400 hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:border-gray-500 dark:hover:bg-gray-600 transition">Edit</button>
                            {p.deleteRequested && adminRole === 'owner' && (
                              <>
                                <button onClick={() => handleDeleteRequest(p, false)} className="px-3 py-1.5 rounded text-xs font-semibold border border-gray-400 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#222] transition">Keep product</button>
                                <button onClick={() => handleDeleteRequest(p, true)} className="px-3 py-1.5 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition">Confirm delete</button>
                              </>
                            )}
                            {p.deleteRequested && adminRole !== 'owner' && <span className="text-[10px] font-bold text-red-500">Waiting for Owner</span>}
                            {!p.deleteRequested && canDeleteProduct(p) && <button onClick={() => deleteProduct(p.id)} className="px-3 py-1.5 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition">{p.status === 'pending' ? 'Reject' : (adminRole === 'owner' ? 'Delete' : 'Request delete')}</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {adminTab === 'add-product' && (
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <datalist id="kyvro-supplier-names">{supplierNames.map(n => <option key={n} value={n} />)}</datalist>
                <form onSubmit={handleSaveProduct} className={`p-8 rounded-lg border space-y-6 w-full lg:flex-1 min-w-0 max-w-3xl ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <h3 className="text-lg font-serif font-bold">
                      {editingProductId ? 'Edit Product Details' : 'Add New Luxury Product'}
                    </h3>
                    <div className="flex gap-2">
                      {editingProductId && (
                        <button type="button" onClick={() => { const saved = products.find((p) => p.id === editingProductId); if (saved && confirm('Undo all your changes and go back to the saved product?')) startEditProduct(saved); }}
                          className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded border border-gray-400 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#222]">Reset changes</button>
                      )}
                      <button type="button" onClick={() => { if (confirm(editingProductId ? 'Clear the whole form? You will leave edit mode (the saved product stays unchanged).' : 'Clear the whole form?')) clearProductForm(); }}
                        className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded border border-red-400 text-red-500 hover:bg-red-500/10">Clear form</button>
                    </div>
                  </div>

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
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Old Price — crossed out (BDT, optional)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 899 (shown struck-through)"
                        value={newProductForm.originalPrice ?? ''}
                        onChange={e => setNewProductForm({...newProductForm, originalPrice: e.target.value})}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                      />
                      {(() => {
                        const o = parseFloat(newProductForm.originalPrice), pr = parseFloat(newProductForm.price);
                        if (!o) return <p className="text-[11px] text-gray-400 mt-1">Leave empty for no discount badge.</p>;
                        if (!pr || o <= pr) return <p className="text-[11px] text-red-500 mt-1">Old price must be higher than the selling price.</p>;
                        return <p className="text-[11px] text-green-600 font-semibold mt-1">Customers will see -{Math.round((1 - pr / o) * 100)}% OFF (save {formatPrice(o - pr)})</p>;
                      })()}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{sizesUsed ? 'Total Stock (auto)' : 'Stock Quantity *'}</label>
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
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Stock text shown to customers (optional)</label>
                      <input
                        type="text"
                        maxLength={40}
                        placeholder="e.g. In Stock · Only 7 left · Selling fast"
                        value={newProductForm.stockText || ''}
                        onChange={e => setNewProductForm({...newProductForm, stockText: e.target.value})}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Empty = automatic: "In Stock", and "Only N left!" when 10 or fewer. Shown only while the product is in stock; "Out of Stock" always appears when the real stock is 0.</p>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="mb-4">
                        <ColorPicker colors={formColors} onToggle={toggleFormColor} onAdd={addFormColor} isDarkMode={isDarkMode} />
                      </div>
                      <SizeStockEditor
                        gender={newProductForm.gender}
                        value={newProductForm.sizeStock || {}}
                        onChange={(sizeStock) => setNewProductForm({...newProductForm, sizeStock})}
                        perColor={!!newProductForm.trackColors}
                        onPerColorChange={(trackColors) => setNewProductForm({...newProductForm, trackColors})}
                        colorValue={newProductForm.colorStock || {}}
                        onColorChange={(colorStock) => setNewProductForm({...newProductForm, colorStock})}
                        colors={formColors}
                        isDarkMode={isDarkMode}
                      />
                      <div className="mt-3">
                        <ColorPhotos colors={photoColors} value={newProductForm.colorImages || {}} onChange={(colorImages) => setNewProductForm({...newProductForm, colorImages})} isDarkMode={isDarkMode} />
                      </div>
                    </div>
                    {hasColorPhotos ? (
                      <div className="sm:col-span-2 rounded border border-dashed border-gray-400/60 p-3 text-[11px] text-gray-500">
                        <strong className="text-gray-700 dark:text-gray-300">Main product photo: automatic.</strong> The photo of the first color ({firstPhotoColor}) is used as the main photo, so you do not need to upload it again.
                      </div>
                    ) : (
                      <div className="sm:col-span-2">
                        <ImageField
                          value={newProductForm.image}
                          onChange={(image) => setNewProductForm(prev => ({...prev, image}))}
                          isDarkMode={isDarkMode}
                        />
                        {photoColors.length > 0 && <p className="text-[11px] text-gray-500 mt-1">Tip: upload a photo for each color above instead, and the first color photo becomes the main photo automatically.</p>}
                      </div>
                    )}
                    {/* on phones / small screens the supplier box sits here; on large screens it is in the empty space on the right */}
                    <div className="sm:col-span-2 lg:hidden">{supplierPanel}</div>
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
                <aside className="hidden lg:block w-80 xl:w-96 shrink-0 lg:sticky lg:top-24">{supplierPanel}</aside>
                </div>
              )}

              {adminTab === 'orders' && <OrdersPanel orders={orders} productCosts={productCosts} isDarkMode={isDarkMode} formatPrice={formatPrice} adminName={adminName} loggedInUserEmail={loggedInUserEmail} canUnblock={adminRole === 'owner' || adminRole === 'manager'} isOwner={adminRole === 'owner'} />}
            </div>
          )}
        </div>
    </>
  );
}
