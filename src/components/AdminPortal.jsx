import { auth } from '../firebase';
import { productIdsForLink } from '../data/supplierLink';
import { callStock, outColours, backColours, colourLabel } from '../stockSync';
import React from 'react';
import { askConfirm } from './AlertCenter';
import AdminLogin from './AdminLogin';
import KyvroMark from './KyvroMark';
import AdminManager from './AdminManager';
import ImageField from './ImageField';
import SizeStockEditor from './SizeStockEditor';
import ColorPhotos from './ColorPhotos';
import ColorPicker from './ColorPicker';
import OrdersPanel from './OrdersPanel';
import TeamStats from './TeamStats';
import MyShop from './MyShop';
import { watchAllShops, isPendingShop } from '../shops';
import { MAX_COMMISSION } from '../adminAuth';
import MyProducts from './MyProducts';
import StoreSettings from './StoreSettings';
import PlanSettings from './PlanSettings';
import SellerDashBannerSettings from './SellerDashBannerSettings';
import SellerDashLayout from './SellerDashLayout';
import { AdminDashboard, AdminAnalytics } from './AdminDashboard';
import { LayoutDashboard, BarChart3, ShoppingBag, Package, PlusCircle, Boxes, Users, Store, UserCheck, Gem, ShieldCheck, Settings, Palette, ShoppingBasket } from 'lucide-react';
import ThemePicker from './ThemePicker';
import { watchSiteTheme, saveSiteTheme } from '../themeStore';
import SellersPanel from './SellersPanel';
import PlanMembers from './PlanMembers';
import ShowcasePhotoField, { addAutoShowcase } from './ShowcasePhotoField';
import { COLLECTION_LABELS, SUB_CATEGORIES, allPlaces, hasColorStock, hasSizeStock, hasSubCategories, orderedSizes, stockForSize, subLabel, supplierOutFor, totalStock } from '../data/catalog';

// Owner: the main site's theme (settings/theme), every theme allowed
function SiteThemePage({ isDarkMode, staff }) {
  const [cur, setCur] = React.useState(null);
  React.useEffect(() => watchSiteTheme(setCur), []);
  if (!cur) return <p className="text-sm text-gray-500">Loading...</p>;
  return <ThemePicker title="Store Theme" note="The design of the main kyvro.store website. Shop links keep their own theme (their owners choose it)."
    current={cur} allowAll previewPath="/" onSave={(t, m) => saveSiteTheme(t, m, staff)} isDarkMode={isDarkMode} />;
}

export default function AdminPortal({ adminCanCreateShop = false, adminTab, deleteProduct, editingProductId, formatPrice, handleAdminLogout, handleEmailSignIn, handleGenderChange, handleGoogleSignIn, handleSaveProduct, isAdminLoggedIn, adminName, adminRole, canDeleteProduct, canEditProduct, canAddProduct = true, shopOwners = {}, productCommissions = {}, canApproveProduct, handleApproveProduct, pendingCount, isDarkMode, loggedInUserEmail, newProductForm, orders, productCosts = {}, products, storeSettings, isCloud, migrating, handleMigrateProducts, setAdminTab, setEditingProductId, setNewProductForm, startEditProduct, clearProductForm, handleDeleteRequest }) {
  // a transparent PNG / WebP uploaded as the main or a colour photo also becomes the home page photo (or a 'more' angle)
  const autoShowcase = (url) => setNewProductForm((f) => ({ ...f, showcaseEdit: addAutoShowcase(f.showcaseEdit, url) }));
  const [productSearch, setProductSearch] = React.useState('');
  const psq = productSearch.trim().toLowerCase();
  const [catFilter, setCatFilter] = React.useState('All');
  const [openId, setOpenId] = React.useState(null);
  const catLabel = (p) => (p.gender === p.category ? p.category : `${p.gender} / ${p.category}`);
  const catList = [...products.reduce((m, p) => m.set(catLabel(p), (m.get(catLabel(p)) || 0) + 1), new Map())].sort((a, b) => a[0].localeCompare(b[0]));
  // Owner / Manager can also paste a supplier link (ShopBase, SelfShop...) to find the product it belongs to
  const linkIds = (adminRole === 'owner' || adminRole === 'manager') ? productIdsForLink(productSearch, productCosts) : null;
  // supplier stock sync: filter chips, the Owner / Manager "Check supplier stock" button, Hide and Approve per product
  const [stockFilter, setStockFilter] = React.useState('');
  const [stockBusy, setStockBusy] = React.useState('');
  const [stockMsg, setStockMsg] = React.useState('');
  const outCount = products.filter((p) => outColours(p).length && !backColours(p).length).length;
  const backCount = products.filter((p) => backColours(p).length).length;
  const stockOp = async (op, p) => {
    if (op === 'hide' && !(await askConfirm(`Take "${p.name}" off the website? It comes back when someone approves it.`))) return;
    setStockBusy(`${op}:${p.id}`);
    try { await callStock(op, p.id); } catch (err) { alert(err.message); }
    setStockBusy('');
  };
  const runStockCheck = async () => {
    setStockBusy('check'); setStockMsg('Checking the suppliers…');
    try {
      let total = { checked: 0, changes: 0 }, r;
      do {
        r = await callStock('check');
        total = { checked: total.checked + r.checked, changes: total.changes + (r.changes || []).length };
        setStockMsg(`Checked ${total.checked} of ${r.total} products…`);
      } while (!r.done);
      setStockMsg(`Done: ${total.checked} products checked, ${total.changes} change(s).${r.shopbase === 'ok' ? '' : r.shopbase === 'not set' ? ' ShopBase skipped: its login is not set in Vercel.' : ' ShopBase login failed: check its phone and password in Vercel.'}`);
    } catch (err) { setStockMsg(err.message); }
    setStockBusy('');
  };
  const stockMatched = stockFilter === 'out' ? products.filter((p) => outColours(p).length && !backColours(p).length)
    : stockFilter === 'back' ? products.filter((p) => backColours(p).length) : null;
  const searched = stockMatched ? stockMatched : linkIds ? products.filter((p) => linkIds.has(String(p.id)))
    : psq ? products.filter((p) => [p.name, p.category, p.gender, p.brand, p.id, p.supplierName].some((v) => String(v || '').toLowerCase().includes(psq))) : products;
  const shownProducts = catFilter === 'All' ? searched : searched.filter((p) => catLabel(p) === catFilter);
  const isOwner = adminRole === 'owner';
  // My Shop with unsaved ticks / prices: ask before switching to another tab
  const shopDirty = React.useRef(false);
  const goTab = async (tab, before) => {
    if ((adminTab === 'my-shop' || adminTab === 'own-shop') && tab !== adminTab && shopDirty.current
      && !(await askConfirm('You have unsaved changes in your shop. Leave without saving?', { danger: true, confirmText: 'Leave' }))) return;
    if (before) before();
    setAdminTab(tab);
  };
  // Owner: Admins' shop requests that wait for Accept / Reject (red badge on the Team Shops tab)
  const [pendingShops, setPendingShops] = React.useState(0);
  // and sellers' applications (red badge on the Sellers tab)
  const [pendingSellers, setPendingSellers] = React.useState(0);
  React.useEffect(() => (isOwner ? watchAllShops((list) => {
    setPendingShops(list.filter((x) => isPendingShop(x) && x.kind !== 'seller').length);
    setPendingSellers(list.filter((x) => isPendingShop(x) && x.kind === 'seller').length);
  }, () => {}) : undefined), [isOwner]);
  const canManageTeam = adminRole === 'owner' || adminRole === 'manager';
  // Supplier name, price, link and profit are private to the Owner and Managers. Admins never see them.
  const canSeeSupplier = adminRole === 'owner' || adminRole === 'manager';
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
      const colorGallery = { ...(prev.colorGallery || {}) };
      Object.keys(colorGallery).forEach(k => { if (k.toLowerCase() === c.toLowerCase()) delete colorGallery[k]; });
      const left = (prev.colors || '').split(',').map(x => x.trim()).filter(x => x && x.toLowerCase() !== c.toLowerCase());
      return { ...prev, colors: left.join(', '), colorStock, colorImages, colorGallery };
    });
  };
  // rename a color everywhere it is used (colors list, stock rows, photo, supplier link) instead of removing + re-adding it
  const renameFormColor = (oldName, rawNew) => {
    const nn = String(rawNew || '').trim();
    if (!nn || nn.toLowerCase() === oldName.toLowerCase()) return;
    if (formColors.some(x => x.toLowerCase() === nn.toLowerCase())) { alert(`"${nn}" is already in the colors list.`); return; }
    setNewProductForm(prev => {
      const same = (x) => String(x).trim().toLowerCase() === oldName.toLowerCase();
      const colors = (prev.colors || '').split(',').map(x => x.trim()).filter(Boolean).map(x => (same(x) ? nn : x));
      const colorStock = {};
      Object.entries(prev.colorStock || {}).forEach(([k, v]) => {
        const [size, ...rest] = k.split('|');
        colorStock[rest.length && same(rest.join('|')) ? `${size}|${nn}` : k] = v;
      });
      const colorImages = {};
      Object.entries(prev.colorImages || {}).forEach(([k, v]) => { colorImages[same(k) ? nn : k] = v; });
      const colorLinks = {};
      Object.entries(prev.colorLinks || {}).forEach(([k, v]) => { colorLinks[same(k) ? nn : k] = v; });
      const colorGallery = {};
      Object.entries(prev.colorGallery || {}).forEach(([k, v]) => { colorGallery[same(k) ? nn : k] = v; });
      const colorCosts = {};
      Object.entries(prev.colorCosts || {}).forEach(([k, v]) => { colorCosts[same(k) ? nn : k] = v; });
      const colorAltLinks = {};
      Object.entries(prev.colorAltLinks || {}).forEach(([k, v]) => { colorAltLinks[same(k) ? nn : k] = v; });
      return { ...prev, colors: colors.join(', '), colorStock, colorImages, colorLinks, colorGallery, colorCosts, colorAltLinks };
    });
  };
  const stockNow = sizesUsed ? sizesTotal : (parseInt(newProductForm && newProductForm.stock, 10) || 0);
  const autoStockText = stockNow > 0 && stockNow <= 10 ? `Only ${stockNow} left!` : stockNow > 0 ? `In Stock · ${stockNow} available` : 'In Stock';
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
  const colorCostsForm = (newProductForm && newProductForm.colorCosts) || {};
  const setColorCost = (c, v) => setNewProductForm(prev => ({ ...prev, colorCosts: { ...(prev.colorCosts || {}), [c]: v } }));
  const altLinks = (newProductForm && newProductForm.colorAltLinks) || {};
  const setAlt = (c, fn) => setNewProductForm(prev => ({ ...prev, colorAltLinks: { ...(prev.colorAltLinks || {}), [c]: fn((prev.colorAltLinks || {})[c] || []) } }));
  const setColorLink = (c, v) => setNewProductForm(prev => ({ ...prev, colorLinks: { ...(prev.colorLinks || {}), [c]: v } }));
  const extraSup = (newProductForm && newProductForm.extraSuppliers) || [];
  const setExtraSup = (i, patch) => setNewProductForm(prev => ({ ...prev, extraSuppliers: (prev.extraSuppliers || []).map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  const addExtraSup = () => setNewProductForm(prev => ((prev.extraSuppliers || []).length >= 5 ? prev : { ...prev, extraSuppliers: [...(prev.extraSuppliers || []), { name: '', cost: '', link: '' }] }));
  const removeExtraSup = (i) => setNewProductForm(prev => ({ ...prev, extraSuppliers: (prev.extraSuppliers || []).filter((_, k) => k !== i) }));
  const supplierPanel = (
    <div className="rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/5 p-4 space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">Supplier details (dropshipping) · private</p>
        <p className="text-[11px] text-gray-500 mt-0.5">Only the Owner and Managers can see this later. Customers and Admins never see it. Leave it empty for products you keep in your own stock.</p>
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
      {formProfit !== null && !(linkPerColor && photoColors.some((c) => String(colorCostsForm[c] ?? '').trim() !== '')) && (
        <p className={`text-xs font-semibold ${formProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          Selling price {formatPrice(formPriceNum)} − supplier cost {formatPrice(formCostNum)} = {formProfit >= 0 ? 'profit' : 'LOSS'} {formatPrice(Math.abs(formProfit))} per piece
          {formCostNum > 0 && formPriceNum > 0 && (
            <span className="block font-normal">
              {formProfit >= 0 ? '+' : '−'}{(Math.abs(formProfit) / formCostNum * 100).toFixed(1)}% on the supplier cost · {(formProfit / formPriceNum * 100).toFixed(1)}% of the selling price
            </span>
          )}
        </p>
      )}
      {adminRole === 'owner' && (
        <div className="rounded border border-green-600/40 bg-green-600/5 p-3 space-y-1">
          <label className="block text-xs font-semibold text-gray-500">Team commission % (of the profit) · only you see this field</label>
          <input type="number" min="0" max={MAX_COMMISSION} step="0.5" placeholder={`0 - ${MAX_COMMISSION}`}
            value={newProductForm.commission ?? ''}
            onChange={e => setNewProductForm(prev => ({ ...prev, commission: e.target.value }))}
            className={inputCls} />
          {parseFloat(newProductForm.commission) > MAX_COMMISSION && (
            <p className="text-xs font-bold text-red-500">The highest commission is {MAX_COMMISSION}%. Lower it to {MAX_COMMISSION} or less, then press Update.</p>
          )}
          <p className="text-[11px] text-gray-500">The Admin or Manager who confirms an order with this product earns this % of the profit when the order is delivered. Team members see it on the product list. Customers never see it.{formProfit !== null && parseFloat(newProductForm.commission) > 0 ? ` Now: ${formatPrice(Math.round(formProfit * parseFloat(newProductForm.commission)) / 100)} per piece.` : ''}</p>
          {formProfit !== null && formProfit > 0 && parseFloat(newProductForm.commission) > 0 && (() => {
            const comm = Math.round(formProfit * Math.min(MAX_COMMISSION, parseFloat(newProductForm.commission))) / 100;
            const keep = formProfit - comm;
            return (
              <p className="text-xs font-semibold text-green-600">
                After {Math.min(MAX_COMMISSION, parseFloat(newProductForm.commission))}% commission ({formatPrice(comm)}) you keep {formatPrice(keep)} per piece
                {formCostNum > 0 ? ` · +${(keep / formCostNum * 100).toFixed(1)}% on the supplier cost` : ''}
                {formPriceNum > 0 ? ` · ${(keep / formPriceNum * 100).toFixed(1)}% of the selling price` : ''}
              </p>
            );
          })()}
        </div>
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
          <span><strong>Each color has its own link</strong><br /><span className="text-[11px] text-gray-500">Tick this if the supplier has a separate product page for each color (for example White and Red), and/or a different price for each color. Leave it unticked when one link and one price are enough.</span></span>
        </label>
      )}
      {linkPerColor && photoColors.length > 0 && (
        <div className="space-y-2">
          {photoColors.map((c) => (
            <div key={c}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{c} · supplier link &amp; price</label>
              <div className="grid grid-cols-[1fr_104px] gap-2">
                <input type="text" placeholder="https://..." maxLength={500}
                  value={colorLinks[c] || ''}
                  onChange={e => setColorLink(c, e.target.value)}
                  className={inputCls} />
                <input type="number" min="0" placeholder={newProductForm.supplierCost ? `৳ ${newProductForm.supplierCost}` : '৳ price'}
                  value={colorCostsForm[c] ?? ''}
                  onChange={e => setColorCost(c, e.target.value)}
                  title="Supplier price for this color. Leave empty to use the supplier cost above."
                  className={inputCls} />
              </div>
              {(altLinks[c] || []).map((a, i) => (
                <div key={i} className="grid grid-cols-[1fr_104px_auto] gap-2 mt-2 items-center">
                  <input type="text" placeholder={`Another ${c} link (optional)`} maxLength={500} value={a.link || ''}
                    onChange={e => setAlt(c, arr => arr.map((x, k) => (k === i ? { ...x, link: e.target.value } : x)))} className={inputCls} />
                  <input type="number" min="0" placeholder="৳ price" value={a.cost ?? ''}
                    onChange={e => setAlt(c, arr => arr.map((x, k) => (k === i ? { ...x, cost: e.target.value } : x)))} className={inputCls} />
                  <button type="button" onClick={() => setAlt(c, arr => arr.filter((_, k) => k !== i))} className="text-red-500 text-lg font-bold px-1" title="Remove this link">&times;</button>
                </div>
              ))}
              {(altLinks[c] || []).length < 3 && (
                <button type="button" onClick={() => setAlt(c, arr => [...arr, { link: '', cost: '' }])}
                  className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] hover:underline">+ Add another {c} link</button>
              )}
              {(() => {
                const raw = String(colorCostsForm[c] ?? '').trim();
                const cost = raw !== '' ? parseFloat(raw) : formCostNum;
                if (Number.isNaN(cost) || Number.isNaN(formPriceNum)) return null;
                const pr = formPriceNum - cost;
                return <p className={`text-[11px] font-semibold mt-1 ${pr >= 0 ? 'text-green-600' : 'text-red-500'}`}>{pr >= 0 ? 'Profit' : 'LOSS'} {formatPrice(Math.abs(pr))} per piece{raw === '' ? ' (using the cost above)' : ''}</p>;
              })()}
            </div>
          ))}
        </div>
      )}
      {linkPerColor && photoColors.length === 0 && <p className="text-[11px] text-amber-600">Add the product colors first, then a link box will appear for each color.</p>}
      {extraSup.map((x, i) => {
        const cx = parseFloat(x.cost);
        const pr = !Number.isNaN(cx) && !Number.isNaN(formPriceNum) ? formPriceNum - cx : null;
        return (
          <div key={i} className="rounded-lg border border-[#D4AF37]/40 p-3 space-y-2 bg-white/40 dark:bg-black/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">Supplier {i + 2}</p>
              <button type="button" onClick={() => removeExtraSup(i)} className="text-[11px] font-bold text-red-500">&times; Remove</button>
            </div>
            <input type="text" list="kyvro-supplier-names" placeholder="Shop name, e.g. ShopBaseBD" maxLength={80}
              value={x.name || ''} onChange={e => setExtraSup(i, { name: e.target.value })} className={inputCls} />
            <div className="grid grid-cols-[104px_1fr] gap-2">
              <input type="number" min="0" placeholder="৳ cost" value={x.cost ?? ''} onChange={e => setExtraSup(i, { cost: e.target.value })} className={inputCls} />
              <input type="text" placeholder="Product link (optional) https://..." maxLength={500} value={x.link || ''} onChange={e => setExtraSup(i, { link: e.target.value })} className={inputCls} />
            </div>
            {pr !== null && <p className={`text-[11px] font-semibold ${pr >= 0 ? 'text-green-600' : 'text-red-500'}`}>If bought here: {pr >= 0 ? 'profit' : 'LOSS'} {formatPrice(Math.abs(pr))} per piece</p>}
          </div>
        );
      })}
      {extraSup.length < 5 && (
        <button type="button" onClick={addExtraSup}
          className="w-full py-2.5 rounded-lg border border-dashed border-[#D4AF37] text-[#B8921F] text-xs font-bold uppercase tracking-wider hover:bg-[#D4AF37]/10 transition">
          + More supplier
        </button>
      )}
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
                <div className="flex items-center gap-4 min-w-0">
                <KyvroMark dark={isDarkMode} title="Kyvro logo" className="h-11 w-auto shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-2xl font-serif font-bold">Kyvro Management Dashboard</h1>
                  <p className="text-xs text-gray-500">Logged in as: <strong className="text-[#D4AF37]">{adminName || loggedInUserEmail}</strong>{adminName && <span> ({loggedInUserEmail})</span>} &middot; {roleLabel} | Domain: www.kyvro.store</p>
                </div>
                </div>
                <button 
                  onClick={handleAdminLogout}
                  className="bg-gray-800 hover:bg-red-900 text-gray-300 px-4 py-2 rounded text-xs font-bold transition"
                >
                  Logout Admin
                </button>
              </div>

              {/* menu on the left (phone: a drop-down menu), the chosen page on the right */}
              <SellerDashLayout label="Admin menu" isDarkMode={isDarkMode} active={adminTab} onSelect={(k) => (k === 'add-product' ? goTab(k, () => setEditingProductId(null)) : goTab(k))} nav={[
                { title: '', items: [
                  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
                  { key: 'orders', label: `Orders (${orders.length})`, icon: ShoppingBag, count: orders.filter((o) => o.status === 'Pending').length + (isOwner ? orders.filter((o) => o.cancelRequest && o.cancelRequest.status === 'pending' && o.status !== 'Cancelled').length : 0) },
                  { key: 'products', label: `Products (${products.length})`, icon: Package, count: pendingCount },
                  ...((canAddProduct || editingProductId) ? [{ key: 'add-product', label: editingProductId ? 'Edit Product' : 'Add Product', icon: PlusCircle }] : []),
                  { key: 'my-products', label: `My Products (${products.filter((p) => p.addedBy && String(p.addedBy).toLowerCase() === String(loggedInUserEmail || '').toLowerCase()).length})`, icon: Boxes },
                ] },
                { title: 'Team & Shops', items: [
                  { key: 'stats', label: isOwner ? 'Team Stats' : 'My Stats', icon: Users },
                  // the Owner's own shop on its own page (Team Shops shows it first too, then everyone's shops)
                  ...(isOwner ? [{ key: 'own-shop', label: 'My Shop', icon: ShoppingBasket }] : []),
                  { key: 'my-shop', label: isOwner ? 'Team Shops' : adminRole === 'manager' || adminCanCreateShop ? 'My Shop' : 'Shops', icon: Store, count: isOwner ? pendingShops : 0 },
                  ...(isOwner ? [{ key: 'sellers', label: 'Sellers', icon: UserCheck, count: pendingSellers }] : []),
                  // the Owner has every shop under Team Shops; a Manager keeps Plan Members
                  ...(canManageTeam && !isOwner ? [{ key: 'plan-members', label: 'Plan Members', icon: Gem }] : []),
                  ...(canManageTeam ? [{ key: 'admins', label: isOwner ? 'Manage Admins' : 'Add Admin', icon: ShieldCheck }] : []),
                ] },
                ...(isOwner ? [{ title: 'Settings', items: [{ key: 'settings', label: 'Banner & Discount', icon: Settings }, { key: 'theme', label: 'Store Theme', icon: Palette }] }] : []),
              ]}>
              {adminTab === 'dashboard' && <AdminDashboard orders={orders} products={products} adminRole={adminRole} adminName={adminName} formatPrice={formatPrice} isDarkMode={isDarkMode} goTab={goTab} canSeeProfit={canSeeSupplier} />}
              {adminTab === 'theme' && isOwner && <SiteThemePage isDarkMode={isDarkMode} staff={{ email: loggedInUserEmail, name: adminName }} />}
              {adminTab === 'analytics' && <AdminAnalytics orders={orders} formatPrice={formatPrice} isDarkMode={isDarkMode} />}
              {adminTab === 'plan-members' && canManageTeam && <PlanMembers isOwner={isOwner} isDarkMode={isDarkMode} />}
              {adminTab === 'sellers' && isOwner && <SellersPanel orders={orders} products={products} isDarkMode={isDarkMode} formatPrice={formatPrice} loggedInUserEmail={loggedInUserEmail} adminName={adminName} />}
              {adminTab === 'settings' && isOwner && <StoreSettings products={products} settings={storeSettings} isDarkMode={isDarkMode} formatPrice={formatPrice} staff={{ email: loggedInUserEmail, name: adminName }} />}
              {adminTab === 'settings' && isOwner && <div className="mt-5"><PlanSettings isDarkMode={isDarkMode} formatPrice={formatPrice} staff={{ email: loggedInUserEmail, name: adminName }} /></div>}
              {adminTab === 'settings' && isOwner && <div className="mt-5"><SellerDashBannerSettings isDarkMode={isDarkMode} staff={{ email: loggedInUserEmail, name: adminName }} /></div>}

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
              {adminTab === 'products' && catList.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {[['All', products.length], ...catList].map(([name, n]) => (
                    <button key={name} type="button" onClick={() => setCatFilter(name)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${catFilter === name ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : isDarkMode ? 'border-gray-700 text-gray-300 hover:border-[#D4AF37]' : 'border-gray-300 text-gray-700 hover:border-[#D4AF37]'}`}>
                      {name} <span className="opacity-70">({n})</span>
                    </button>
                  ))}
                </div>
              )}
              {adminTab === 'products' && (
                <div className="mb-3 flex items-center gap-3">
                  <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products by name, category, brand..." className={`flex-1 border px-4 py-2.5 text-sm rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#181818] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`} />
                  {psq && <button type="button" onClick={() => setProductSearch('')} className="text-xs font-bold text-[#D4AF37] whitespace-nowrap">Clear ({shownProducts.length} found)</button>}
                  {!psq && catFilter !== 'All' && <span className="text-xs text-gray-500 whitespace-nowrap">{shownProducts.length} product(s)</span>}
                </div>
              )}
              {adminTab === 'products' && (outCount > 0 || backCount > 0 || canSeeSupplier) && (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  {[['', 'All'], ['out', `Stock out at supplier (${outCount})`], ['back', `Back in stock (${backCount})`]].map(([k, label]) => (
                    <button key={k || 'all'} type="button" onClick={() => setStockFilter(k)}
                      className={`px-3 py-1.5 rounded-full border font-semibold ${stockFilter === k ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-300 text-gray-700'} ${k === 'back' && backCount ? 'ring-2 ring-green-500/50' : ''}`}>{label}</button>
                  ))}
                  {canSeeSupplier && (
                    <button type="button" disabled={!!stockBusy} onClick={runStockCheck}
                      className="ml-auto px-3 py-1.5 rounded border border-[#D4AF37] text-[#9A7A1A] dark:text-[#D4AF37] font-bold disabled:opacity-50">{stockBusy === 'check' ? 'Checking…' : 'Check supplier stock'}</button>
                  )}
                  {stockMsg && <p className="w-full text-gray-500">{stockMsg}</p>}
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
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {shownProducts.map(p => (
                        <React.Fragment key={p.id}>
                        <tr className={`hover:bg-gray-100 dark:hover:bg-[#1a1a1a] ${p.deleteRequested ? 'bg-red-500/10' : ''}`}>
                          <td className="p-4 flex items-center gap-3">
                            <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded" />
                            <div>
                              <span className="font-semibold">{p.name}</span>
                              {p.status === 'pending' && <span className="ml-2 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded inline-block whitespace-nowrap">PENDING</span>}
                              {p.status === 'hidden' && <span className="ml-2 bg-gray-500/20 text-gray-700 dark:text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded inline-block whitespace-nowrap">HIDDEN</span>}
                              {outColours(p).length > 0 && (
                                <p className="mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                                  Stock out at supplier: {outColours(p).filter((c) => !backColours(p).includes(c)).map(colourLabel).join(', ') || '–'}
                                </p>
                              )}
                              {backColours(p).length > 0 && (
                                <p className="mt-1 text-[11px] font-semibold text-green-700 dark:text-green-400">
                                  Back in stock: {backColours(p).map(colourLabel).join(', ')}
                                  {canApproveProduct({ ...p, status: 'pending' }) && (
                                    <button type="button" disabled={!!stockBusy} onClick={() => stockOp('approve', p)} className="ml-2 underline font-bold disabled:opacity-50">{stockBusy === `approve:${p.id}` ? 'Approving…' : p.status === 'hidden' ? 'Approve (show on website)' : 'Approve (sell again)'}</button>
                                  )}
                                </p>
                              )}
                              {p.deleteRequested && <span className="ml-2 bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded">DELETE REQUESTED{(p.deleteRequestedByName || p.deleteRequestedBy) ? ` BY ${String(p.deleteRequestedByName || p.deleteRequestedBy).toUpperCase()}` : ''}</span>}
                              {(p.addedByName || p.addedBy) && <p className="text-[10px] text-gray-500 font-normal mt-0.5">Added by {p.addedByName || p.addedBy}</p>}
                            </div>
                          </td>
                          <td className="p-4 text-gray-500">{p.gender === p.category ? p.category : `${p.gender} / ${p.category}`}</td>
                          <td className="p-4 text-[#D4AF37] font-bold">
                            {formatPrice(p.price)}
                            {canSeeSupplier && productCosts[String(p.id)] && productCosts[String(p.id)].supplierCost !== undefined && (
                              <p className="text-[10px] font-normal text-gray-500 mt-0.5">
                                Cost {formatPrice(productCosts[String(p.id)].supplierCost)} · <span className={p.price - productCosts[String(p.id)].supplierCost >= 0 ? 'text-green-600' : 'text-red-500'}>Profit {formatPrice(p.price - productCosts[String(p.id)].supplierCost)}{p.price > 0 ? ` (${Math.round(((p.price - productCosts[String(p.id)].supplierCost) / p.price) * 100)}%)` : ''}</span>
                                {productCosts[String(p.id)].supplierName ? ` · ${productCosts[String(p.id)].supplierName}` : ''}
                                {p.price > 0 && (p.price - productCosts[String(p.id)].supplierCost) / p.price < 0.2 && <span className="ml-1 font-bold text-red-500">LOW MARGIN</span>}
                                {productCosts[String(p.id)].supplierLink && <> · <a href={productCosts[String(p.id)].supplierLink} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline font-semibold">Open supplier</a></>}
                              </p>
                            )}
                            {productCommissions[String(p.id)] && productCommissions[String(p.id)].pct > 0 && (
                              <p className="text-[10px] font-bold text-green-600 mt-0.5">
                                Commission {productCommissions[String(p.id)].pct}%{canSeeSupplier && productCosts[String(p.id)] && productCosts[String(p.id)].supplierCost !== undefined && p.price - productCosts[String(p.id)].supplierCost > 0 ? ` (≈ ${formatPrice(Math.round((p.price - productCosts[String(p.id)].supplierCost) * productCommissions[String(p.id)].pct) / 100)} per piece)` : ''}
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-gray-500">
                            <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                            {totalStock(p)} units
                            {hasSizeStock(p) && (
                              <p className="text-[10px] mt-0.5">
                                {orderedSizes(Object.keys(p.sizeStock), p.gender).map(sz => `${sz}: ${stockForSize(p, sz)}`).join(' · ')}
                              </p>
                            )}
                            {hasColorStock(p) && (
                              <p className="text-[10px] mt-0.5 leading-relaxed">
                                {/* colours out of stock at the supplier count as 0 (stock sync) */}
                                {Object.entries(p.colorStock).map(([k, n]) => { const [sz, col] = k.split('|'); return `${sz ? sz + ' ' : ''}${col}: ${supplierOutFor(p, col) ? 0 : n}`; }).join(' · ')}
                              </p>
                            )}
                            </div>
                            <button type="button" onClick={() => setOpenId(openId === p.id ? null : p.id)}
                              aria-label={openId === p.id ? 'Hide details' : 'Show details'} title={openId === p.id ? 'Hide details' : 'Show details'}
                              className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm leading-none border transition ${openId === p.id ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'border-[#D4AF37] text-[#B8921F] hover:bg-[#D4AF37]/10'}`}>
                              {openId === p.id ? '▴' : '▾'}
                            </button>
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            {/* stock sync: any team member can take a product that is out of stock at the supplier off the website */}
                            {outColours(p).length > 0 && p.status === 'approved' && !backColours(p).length && (
                              <div className="mb-2 flex justify-center">
                                <button type="button" disabled={!!stockBusy} onClick={() => stockOp('hide', p)}
                                  className="px-3 py-1.5 rounded text-xs font-semibold border border-red-500 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition whitespace-nowrap disabled:opacity-50">{stockBusy === `hide:${p.id}` ? 'Hiding…' : 'Hide from website'}</button>
                              </div>
                            )}
                            <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap">
                            {canApproveProduct(p) && <button onClick={() => handleApproveProduct(p)} className="px-3 py-1.5 rounded text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition">Approve</button>}
                            {canEditProduct(p)
                              ? <button onClick={() => startEditProduct(p)} className="px-3 py-1.5 rounded text-xs font-semibold border bg-white text-gray-900 border-gray-400 hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:border-gray-500 dark:hover:bg-gray-600 transition">Edit</button>
                              : <span className="text-[10px] text-gray-500 font-semibold" title="Only the Owner or the person who added it can edit">View only</span>}
                            {p.deleteRequested && adminRole === 'owner' && (
                              <>
                                <button onClick={() => handleDeleteRequest(p, false)} className="px-3 py-1.5 rounded text-xs font-semibold border border-gray-400 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#222] transition">Keep product</button>
                                <button onClick={() => handleDeleteRequest(p, true)} className="px-3 py-1.5 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition">Confirm delete</button>
                              </>
                            )}
                            {p.deleteRequested && adminRole !== 'owner' && <span className="text-[10px] font-bold text-red-500">Waiting for Owner</span>}
                            {!p.deleteRequested && canDeleteProduct(p) && <button onClick={() => deleteProduct(p.id)} className="px-3 py-1.5 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition">{p.status === 'pending' ? 'Reject' : (adminRole === 'owner' ? 'Delete' : 'Request delete')}</button>}
                            </div>
                          </td>
                        </tr>
                        {openId === p.id && (() => {
                          const sup = productCosts[String(p.id)] || {};
                          const gal = [...new Set([p.image, ...(Array.isArray(p.images) ? p.images : []), ...Object.values(p.colorImages || {}), ...Object.values(p.colorGallery || {}).flat()].filter(Boolean))];
                          const row = (k, v) => (v === undefined || v === null || v === '' ? null : <div className="flex gap-2"><span className="w-32 shrink-0 text-gray-500">{k}</span><span className="font-medium break-words min-w-0">{v}</span></div>);
                          const disc = p.originalPrice && Number(p.originalPrice) > Number(p.price) ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
                          return (
                            <tr className={isDarkMode ? 'bg-[#121212]' : 'bg-[#D4AF37]/5'}>
                              <td colSpan={5} className="p-5">
                                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr] gap-6">
                                  <div className="flex flex-wrap lg:flex-col gap-2 lg:max-w-[96px]">
                                    {gal.slice(0, 8).map((u, i) => <img key={i} src={u} alt="" className="w-20 h-20 object-cover rounded border border-black/10" />)}
                                  </div>
                                  <div className="space-y-1.5 text-xs">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] mb-1">Product</p>
                                    {row('Name', p.name)}
                                    {row('Collection', catLabel(p))}
                                    {row('Also shown in', Array.isArray(p.alsoShowIn) && p.alsoShowIn.length ? p.alsoShowIn.map(k => { const pl = allPlaces().find(x => x.key === k); return pl ? pl.label : (k === 'Men' ? "Men's Jacket" : "Women's Ladies Jacket"); }).join(', ') : '')}
                                    {row('Selling price', formatPrice(p.price))}
                                    {row('Old price', p.originalPrice ? `${formatPrice(p.originalPrice)}${disc ? ` (-${disc}%)` : ''}` : '')}
                                    {row('Stock text', p.stockText)}
                                    {row('Total stock', `${totalStock(p)} units`)}
                                    {row('Sold so far', p.sold ? `${p.sold} pcs` : '')}
                                    {row('Colors', Array.isArray(p.colors) && p.colors.length ? p.colors.join(', ') : '')}
                                    {row('Sizes', hasSizeStock(p) ? orderedSizes(Object.keys(p.sizeStock), p.gender).map(sz => `${sz}: ${p.sizeStock[sz]}`).join(' · ') : '')}
                                    {row('Size + color', hasColorStock(p) ? Object.entries(p.colorStock).map(([k, n]) => { const [sz, col] = k.split('|'); return `${sz ? sz + ' ' : ''}${col}: ${n}`; }).join(' · ') : '')}
                                    {row('Labels', [p.isNew && 'New', p.isFeatured && 'Featured', p.isBestSeller && 'Best seller'].filter(Boolean).join(', '))}
                                    {row('Status', p.status === 'pending' ? 'Pending approval' : 'Live')}
                                    {row('Added by', p.addedByName || p.addedBy)}
                                    {p.description && <div className="pt-1"><span className="text-gray-500">Description</span><p className="mt-0.5 leading-relaxed whitespace-pre-line">{p.description}</p></div>}
                                  </div>
                                  <div className="space-y-1.5 text-xs">
                                    {canSeeSupplier && <p className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] mb-1">Supplier · private</p>}
                                    {!canSeeSupplier ? null : sup.supplierName || sup.supplierCost !== undefined ? (
                                      <>
                                        {row('Shop', sup.supplierName)}
                                        {row('Cost per piece', sup.supplierCost !== undefined ? formatPrice(sup.supplierCost) : '')}
                                        {sup.supplierCost !== undefined && row('Profit per piece', <span className={p.price - sup.supplierCost >= 0 ? 'text-green-600' : 'text-red-500'}>{formatPrice(p.price - sup.supplierCost)}</span>)}
                                        {sup.supplierLink && row('Link', <a href={sup.supplierLink} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline break-all">open product</a>)}
                                        {Object.entries(sup.colorCosts || {}).map(([c, n]) => <div key={'cc' + c}>{row(`${c} cost`, `${formatPrice(n)}${p.price - n >= 0 ? ` · profit ${formatPrice(p.price - n)}` : ` · LOSS ${formatPrice(n - p.price)}`}`)}</div>)}
                                        {Object.entries(sup.colorLinks || {}).map(([c, u]) => <div key={'cl' + c}>{row(`${c} link`, <a href={u} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline">open</a>)}</div>)}
                                        {Object.entries(sup.colorAltLinks || {}).flatMap(([c, arr]) => (arr || []).map((x, i) => <div key={'ca' + c + i}>{row(`${c} link ${i + 2}`, <span>{x.cost ? `${formatPrice(x.cost)} · ` : ''}{x.link && <a href={x.link} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline">open</a>}</span>)}</div>))}
                                        {(sup.extraSuppliers || []).map((x, i) => (
                                          <div key={'x' + i} className="pt-1 mt-1 border-t border-black/10">
                                            {row(`Supplier ${i + 2}`, x.name)}
                                            {row('Cost', formatPrice(x.cost))}
                                            {x.link && row('Link', <a href={x.link} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline">open product</a>)}
                                          </div>
                                        ))}
                                      </>
                                    ) : <p className="text-gray-500">No supplier saved (own stock).</p>}
                                    <div className="pt-3">
                                      {canEditProduct(p) && <button type="button" onClick={() => startEditProduct(p)} className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider border border-gray-400 hover:bg-gray-100 dark:hover:bg-[#222] transition">Edit this product</button>}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })()}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {adminTab === 'add-product' && !canAddProduct && !editingProductId && (
                <p className="text-sm text-gray-500 py-8 text-center">The Owner has not given you permission to add new products.</p>
              )}

              {adminTab === 'add-product' && (canAddProduct || editingProductId) && (
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <datalist id="kyvro-supplier-names">{supplierNames.map(n => <option key={n} value={n} />)}</datalist>
                <form onSubmit={handleSaveProduct} className={`p-8 rounded-lg border space-y-6 w-full lg:flex-1 min-w-0 max-w-3xl ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <h3 className="text-lg font-serif font-bold">
                      {editingProductId ? 'Edit Product Details' : 'Add New Luxury Product'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button"
                        onClick={() => { if (editingProductId) clearProductForm(); setAdminTab('products'); }}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg border transition active:scale-[.97] ${isDarkMode ? 'border-gray-600 text-gray-200 hover:bg-[#222]' : 'border-gray-300 text-gray-800 bg-white hover:bg-gray-100 shadow-sm'}`}>
                        <span aria-hidden="true" className="text-sm leading-none">&larr;</span> Back
                      </button>
                      {editingProductId && (
                        <button type="button" onClick={async () => { const saved = products.find((p) => p.id === editingProductId); if (saved && (await askConfirm('Undo all your changes and go back to the saved product?'))) startEditProduct(saved); }}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg border transition active:scale-[.97] ${isDarkMode ? 'border-[#D4AF37]/60 text-[#D4AF37] hover:bg-[#D4AF37]/10' : 'border-[#D4AF37] text-[#8A6A12] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20'}`}>
                          <span aria-hidden="true" className="text-sm leading-none">&#8635;</span> Reset changes
                        </button>
                      )}
                      <button type="button" onClick={async () => { if ((await askConfirm(editingProductId ? 'Clear the whole form? You will leave edit mode (the saved product stays unchanged).' : 'Clear the whole form?'))) clearProductForm(); }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-red-400 text-red-500 hover:bg-red-500/10 transition active:scale-[.97]">
                        <span aria-hidden="true" className="text-sm leading-none">&times;</span> Clear form
                      </button>
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
                        <option value="Women">Women's & Girls' Fashion</option>
                        <option value="Winter">Winter Collection</option>
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
                              {item.items.map(i => <option key={i} value={i}>{subLabel(i)}</option>)}
                            </optgroup>
                          ) : (
                            <option key={item.name} value={item.name}>{subLabel(item.name)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {hasSubCategories(newProductForm.gender) && (() => {
                      const also = newProductForm.alsoShowIn || [];
                      const own = `${newProductForm.gender}:${newProductForm.category}`;
                      const toggle = (k) => setNewProductForm(prev => ({ ...prev, alsoShowIn: (prev.alsoShowIn || []).includes(k) ? (prev.alsoShowIn || []).filter(x => x !== k) : [...(prev.alsoShowIn || []), k] }));
                      const places = allPlaces().filter(pl => pl.key !== own);
                      return (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 mb-2">Also show in (optional) — tick every place this product should appear</label>
                          <div className={`border rounded p-3 space-y-3 ${isDarkMode ? 'border-gray-700 bg-[#121212]' : 'border-gray-300 bg-gray-50'}`}>
                            {Object.keys(SUB_CATEGORIES).map(col => {
                              const list = places.filter(pl => pl.collection === col);
                              if (!list.length) return null;
                              return (
                                <div key={col}>
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] mb-1.5">{COLLECTION_LABELS[col]}</p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                    {list.map(pl => (
                                      <label key={pl.key} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                        <input type="checkbox" checked={also.includes(pl.key)} onChange={() => toggle(pl.key)} className="w-4 h-4 accent-[#D4AF37]" />
                                        {subLabel(pl.name)}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1">Same product and same stock, also shown in every ticked place. Leave all unticked to show it only in its own category.</p>
                        </div>
                      );
                    })()}
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
                        onFocus={() => { if (!newProductForm.stockText) setNewProductForm(prev => ({ ...prev, stockText: autoStockText })); }}
                        onChange={e => setNewProductForm({...newProductForm, stockText: e.target.value})}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                      />
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {[autoStockText, stockNow > 0 ? `Only ${stockNow} left!` : '', 'In Stock', 'Selling fast', 'Limited stock'].filter(Boolean).filter((t, i, a) => a.indexOf(t) === i).map(t => (
                          <button key={t} type="button" onClick={() => setNewProductForm(prev => ({ ...prev, stockText: t }))} className="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-600 hover:border-[#D4AF37]">{t}</button>
                        ))}
                        {newProductForm.stockText && <button type="button" onClick={() => setNewProductForm(prev => ({ ...prev, stockText: '' }))} className="text-[11px] px-2 py-1 rounded border border-red-300 text-red-500">Clear (automatic)</button>}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Click the box to fill the automatic text, then edit it if you like. Empty = automatic: "In Stock", and "Only N left!" when 10 or fewer. Shown only while the product is in stock; "Out of Stock" always appears when the real stock is 0.</p>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="mb-4">
                        <ColorPicker colors={formColors} onToggle={toggleFormColor} onAdd={addFormColor} onRename={renameFormColor} isDarkMode={isDarkMode} />
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
                        <ColorPhotos colors={photoColors} onTransparent={isCloud ? autoShowcase : undefined} value={newProductForm.colorImages || {}} onChange={(colorImages) => setNewProductForm({...newProductForm, colorImages})} gallery={newProductForm.colorGallery || {}} onGalleryChange={(colorGallery) => setNewProductForm(prev => ({...prev, colorGallery}))} isDarkMode={isDarkMode} />
                      </div>
                    </div>
                    {hasColorPhotos ? (
                      <div className="sm:col-span-2 rounded border border-dashed border-gray-400/60 p-3 text-[11px] text-gray-500">
                        <strong className="text-gray-700 dark:text-gray-300">Main product photo: automatic.</strong> The photo of the first color ({firstPhotoColor}) is used as the main photo, so you do not need to upload it again.
                      </div>
                    ) : (
                      <div className="sm:col-span-2">
                        <ImageField
                          onTransparent={isCloud ? autoShowcase : undefined}
                          value={newProductForm.image}
                          onChange={(image) => setNewProductForm(prev => ({...prev, image}))}
                          isDarkMode={isDarkMode}
                        />
                        {photoColors.length > 0 && <p className="text-[11px] text-gray-500 mt-1">Tip: upload a photo for each color above instead, and the first color photo becomes the main photo automatically.</p>}
                      </div>
                    )}
                    {/* on phones / small screens the supplier box sits here; on large screens it is in the empty space on the right */}
                    <div className="sm:col-span-2 lg:hidden">{(canSeeSupplier || !editingProductId) && supplierPanel}</div>
                    {isCloud && (
                      <div className="sm:col-span-2">
                        <ShowcasePhotoField productId={editingProductId} value={newProductForm.showcaseEdit || null} isDarkMode={isDarkMode}
                          kind={newProductForm.gender === 'Shoes' || newProductForm.category === 'Shoes' ? 'shoe' : 'garment'}
                          sourceNames={Object.fromEntries([
                            ...Object.entries(newProductForm.colorImages || {}).map(([c, u]) => [u, c]),
                            ...Object.entries(newProductForm.colorGallery || {}).flatMap(([c, list]) => (list || []).map((u) => [u, c])),
                          ].filter(([u]) => typeof u === 'string' && u))}
                          sources={[...new Set([newProductForm.image, ...Object.values(newProductForm.colorImages || {}), ...(newProductForm.extraImages || []),
                            ...Object.values(newProductForm.colorGallery || {}).flat()].filter((u) => typeof u === 'string' && u))]}
                          onChange={(v) => setNewProductForm((f) => ({ ...f, showcaseEdit: v }))} />
                      </div>
                    )}
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

                  <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" className="bg-[#D4AF37] text-black font-bold px-8 py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 transition">
                      {editingProductId ? 'Update Product' : 'Save Product to Store'}
                    </button>
                    {/* Remove this product (same rules as the Products list: Owner deletes, others send a delete request for a live product) */}
                    {(() => {
                      const ep = editingProductId && products.find((p) => p.id === editingProductId);
                      if (!ep || !canDeleteProduct(ep)) return null;
                      if (ep.deleteRequested) return <span className="text-xs font-semibold text-red-500">Delete requested · waiting for the Owner</span>;
                      const label = ep.status === 'pending' ? 'Reject product' : (adminRole === 'owner' ? 'Delete product' : 'Request delete');
                      return (
                        <button type="button" onClick={async () => { if (await deleteProduct(ep.id)) { clearProductForm(); setAdminTab('products'); } }}
                          className="border border-red-600 text-red-600 font-bold px-6 py-3 rounded text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition">
                          {label}
                        </button>
                      );
                    })()}
                  </div>
                </form>
                <aside className="hidden lg:block w-80 xl:w-96 shrink-0 lg:sticky lg:top-24">{(canSeeSupplier || !editingProductId) && supplierPanel}</aside>
                </div>
              )}

              {adminTab === 'own-shop' && isOwner && <MyShop part="own" onDirtyChange={(d) => { shopDirty.current = d; }} canCreateShop={adminCanCreateShop} adminRole={adminRole} products={products} isOwner={isOwner} isDarkMode={isDarkMode} formatPrice={formatPrice} adminName={adminName} loggedInUserEmail={loggedInUserEmail} />}
              {adminTab === 'my-shop' && isOwner && (
                <div className="space-y-5">
                  <MyShop part="requests" adminRole={adminRole} products={products} isOwner={isOwner} isDarkMode={isDarkMode} formatPrice={formatPrice} adminName={adminName} loggedInUserEmail={loggedInUserEmail} />
                  <PlanMembers isOwner isDarkMode={isDarkMode} title="Team Shops" hideUid={auth.currentUser ? auth.currentUser.uid : ''} />
                </div>
              )}
              {adminTab === 'my-shop' && !isOwner && <MyShop onDirtyChange={(d) => { shopDirty.current = d; }} canCreateShop={adminCanCreateShop} adminRole={adminRole} products={products} isOwner={isOwner} isDarkMode={isDarkMode} formatPrice={formatPrice} adminName={adminName} loggedInUserEmail={loggedInUserEmail} />}

              {adminTab === 'my-products' && <MyProducts products={products} loggedInUserEmail={loggedInUserEmail} isDarkMode={isDarkMode} formatPrice={formatPrice} startEditProduct={startEditProduct} canEditProduct={canEditProduct} />}

              {adminTab === 'stats' && <TeamStats adminRole={adminRole} shopOwners={shopOwners} showProfit={canSeeSupplier} productCosts={productCosts} productCommissions={productCommissions} products={products} startEditProduct={startEditProduct} canEditProduct={canEditProduct} orders={orders} isDarkMode={isDarkMode} formatPrice={formatPrice} isOwner={isOwner} loggedInUserEmail={loggedInUserEmail} adminName={adminName} />}

              {adminTab === 'orders' && <OrdersPanel orders={orders} products={products} productCosts={productCosts} isDarkMode={isDarkMode} formatPrice={formatPrice} adminName={adminName} loggedInUserEmail={loggedInUserEmail} canUnblock={adminRole === 'owner' || adminRole === 'manager'} isOwner={adminRole === 'owner'} canDeliver={adminRole === 'owner' || adminRole === 'manager'} showSupplier={canSeeSupplier} />}
              </SellerDashLayout>
            </div>
          )}
        </div>
    </>
  );
}
