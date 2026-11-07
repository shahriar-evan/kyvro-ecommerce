import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { askConfirm, showMaintenance } from './components/AlertCenter';
import { waOrderText, waCartLines, setWaShop } from './whatsappOrder';
import { onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, googleProvider } from './firebase';
import { isOwnerEmail } from './adminEmails';
import { getAdminStatus, watchAdminAccess, MAX_COMMISSION } from './adminAuth';
import { watchShop, watchMyShop, watchShopOwners, SLUG_RE, resolveShopKey, shopLinkKey, turnShopOn, setMyShopLive } from './shops';
import { touchSellerSeen, watchMySeller, sellerStatus } from './sellers';
import { isReservedLink, ROOT_LINK_RE } from './data/reservedLinks';
import { shopPriceClamp, productInCollection, WHATSAPP_NUMBER } from './data/shopConfig';
import { placeOrder, watchOrders, cancelMyOrder } from './orders';
import { watchProfile, saveProfile, watchMyOrders, saveCartSummary } from './customerData';
import { ensureSubscribed } from './subscribers';
import PushPrompt from './components/PushPrompt';
import { watchProducts, watchProductCosts, watchProductCommissions, setProductCommission, saveProductCost, removeProductCost, saveProduct, removeProduct, requestProductDelete, rejectProductDelete, approveProduct, migrateProducts } from './productsStore';
import { watchStoreSettings, watchPlans } from './storeSettings';
import { visibleShopIds, normalizePlans, effectiveTier, shopIsPaid, basicDue, couponActive, couponAmountFor, cleanCouponCode } from './data/priceCheck';
import { themePreviewFromUrl, cleanTheme, cleanMode } from './data/themes';
import { watchSiteTheme } from './themeStore';
import { shopExtrasOf, brandHex, SOCIALS, httpsLinkOk, contactOk, contactHref, contactLabel, effectiveFeatures, FEATURES, shopDisplayName } from './data/shopBrand';
import { cleanPhone, ONLINE_PAY_ON, DELIVERY_AREAS, deliveryFee, paymentStatusFor, DEFAULT_STORE_SETTINGS, bestDiscount, nextReward, describeRule } from './data/shopConfig';
import { INITIAL_PRODUCTS } from './data/products';
import { CURRENCIES } from './data/currencies';
import { hasSubCategories, defaultCategoryFor, matchesCollectionPage, hasSizeStock, stockForSize, orderedSizes, hasColorStock, stockFor, variantKey, needsChoice, imageFor } from './data/catalog';
import QuickAdd from './components/QuickAdd';
import FeaturedShops from './components/FeaturedShops';
import heroBannerImg from './assets/hero-banner.webp';
import coverPhoto1Img from './assets/cover_photo1.webp';
import men_womenImg from './assets/men_women.webp';
import women_bannerImg from './assets/women_banner.webp';
import styleImg from './assets/style.webp';
import punjabi_shirtImg from './assets/punjabi_shirt.webp';
import shirtImg from './assets/shirts.webp';
import punjabiImg from './assets/punjabi.webp';
import sneakersImg from './assets/Snekers.webp';
import AnnouncementBar from './components/AnnouncementBar';
import BackButton from './components/BackButton';
import Header from './components/Header';
import MobileMenu from './components/MobileMenu';
import CartDrawer from './components/CartDrawer';
import HomeView from './components/HomeView';
import ShopView from './components/ShopView';
import Footer from './components/Footer';
import AlertCenter from './components/AlertCenter';
import ProductDetail from './components/ProductDetail';
import { getPaymentUrl } from './payment';
import { initAnalytics, trackPageView, trackViewContent, trackAddToCart, trackInitiateCheckout, trackPurchase } from './analytics';
// Pages most visitors never open are loaded only when needed (smaller first download on phones)
const AdminPortal = lazy(() => import('./components/AdminPortal'));
const CheckoutView = lazy(() => import('./components/CheckoutView'));
const PolicyPages = lazy(() => import('./components/PolicyPages'));
const OrderSuccess = lazy(() => import('./components/OrderSuccess'));
const AccountView = lazy(() => import('./components/AccountView'));
const SellPricing = lazy(() => import('./components/SellPricing'));
const OrderTracking = lazy(() => import('./components/OrderTracking'));
const PaymentResult = lazy(() => import('./components/PaymentResult'));
const PageLoading = () => <div className="flex-1 min-h-[50vh] flex items-center justify-center text-sm text-gray-500">Loading...</div>;

const EMPTY_CHECKOUT = {
  fullName: '', phone: '', address: '', notes: '',
  district: '', upazila: '', area: '', deliveryArea: '', paymentMethod: 'Cash on Delivery', agree: false
};

const LAST_SHOP_KEY = 'kyvro_last_supplier_shop';
const lastShop = () => { try { return localStorage.getItem(LAST_SHOP_KEY) || ''; } catch { return ''; } };
const freshProductForm = () => ({ ...EMPTY_PRODUCT_FORM, supplierName: lastShop() });
const EMPTY_PRODUCT_FORM = {
  name: '', gender: 'Men', category: 'Shirt', price: '', originalPrice: '', stockText: '', image: '', description: '',
  colors: '', sizeStock: {}, colorStock: {}, colorImages: {}, colorGallery: {}, extraImages: [], trackColors: false, stock: '10', isNew: true, isFeatured: false, isBestSeller: false,
  supplierName: '', supplierCost: '', commission: '', supplierLink: '', linkPerColor: false, colorLinks: {}, colorCosts: {}, extraSuppliers: [], colorAltLinks: {}, alsoShowIn: []
};

export default function App() {
  // Products: Firestore ("cloud") once the Owner has moved them there, until then this browser's saved list
  const [localProducts, setLocalProducts] = useState(() => {
    // an old copy can point at pictures from an older build (/assets/<name>-<hash>.png) that are gone now: use the
    // starter list instead (the real products come from Firestore a moment later anyway)
    try {
      const saved = JSON.parse(localStorage.getItem('kyvro_products') || 'null');
      const stale = Array.isArray(saved) && saved.some((p) => /^\/assets\/[^/]+\.png$/.test(String((p && p.image) || '')));
      return Array.isArray(saved) && !stale ? saved : INITIAL_PRODUCTS;
    } catch (e) { return INITIAL_PRODUCTS; }
  });
  const [cloudProducts, setCloudProducts] = useState(null); // null = not in Firestore yet
  const isCloud = cloudProducts !== null;
  const products = isCloud ? cloudProducts : localProducts;
  // Customers only see approved products (an Admin's new product waits for Owner / Manager approval)
  const isApproved = (p) => (p.status || 'approved') === 'approved';
  const shopProducts = products.filter(isApproved);
  const pendingCount = products.filter(p => !isApproved(p)).length;

  // ---- Admin shop link: kyvro.store/?shop=name shows only that shop's products, at that shop's prices ----
  // kyvro.store/<key> (or the old kyvro.store/?shop=<key>): the shop's link name, an old alias or its id; shopSlug below
  // is the shop id it points to. A path that is one of the site's own routes (RESERVED_LINKS) is never a shop.
  const [pathShop] = useState(() => {
    try {
      const seg = decodeURIComponent(window.location.pathname.replace(/^\/+|\/+$/g, ''));
      return ROOT_LINK_RE.test(seg) && !isReservedLink(seg) ? seg : '';
    } catch (e) { return ''; }
  });
  const [shopKey] = useState(() => {
    try {
      // the theme picker's preview frame shares this tab's session: it never remembers a shop, and a main-site preview
      // never picks up the shop remembered by the page around it
      if (/[?&]themePreview=/.test(window.location.search)) return pathShop;
      if (pathShop) { sessionStorage.setItem('kyvro_shop', pathShop); return pathShop; }
      const q = String(new URLSearchParams(window.location.search).get('shop') || '').toLowerCase();
      if (SLUG_RE.test(q)) { sessionStorage.setItem('kyvro_shop', q); return q; }
      const saved = sessionStorage.getItem('kyvro_shop') || '';
      return SLUG_RE.test(saved) ? saved : '';
    } catch (e) { return ''; }
  });
  const [shopSlug, setShopSlug] = useState('');
  useEffect(() => {
    if (!shopKey) return undefined;
    let live = true;
    resolveShopKey(shopKey).then((id) => { if (live) setShopSlug(id); });
    return () => { live = false; };
  }, [shopKey]);
  const [plans, setPlans] = useState(() => normalizePlans(null));
  useEffect(() => (shopSlug ? watchPlans(setPlans) : undefined), [shopSlug]);
  // a seller's extra shop (2nd / 3rd) is hidden while the account's paid plan has ended (not deleted; shows again after
  // renewing); a seller's store that must pay Basic and has not is hidden too (basicDue)
  const shopVisibleToAll = (d) => !!d && d.active !== false && d.status !== 'pending' && !(d.extra && !(shopIsPaid(d))) && !basicDue(d, plans);
  const [shopRaw, setShopRaw] = useState(undefined); // undefined = loading, null = not found
  useEffect(() => {
    if (!shopSlug) return undefined;
    return watchShop(shopSlug, (d) => setShopRaw(d || null), () => setShopRaw(null));
  }, [shopSlug]);
  // a shop that is not live (waiting for approval, switched off, hidden): customers get "not found", but the team and the
  // shop's own owner see a preview with a notice on top (set below, once the login is known)
  const [shopPreviewOk, setShopPreviewOk] = useState(false);
  const shopDoc = shopRaw === undefined ? undefined : shopVisibleToAll(shopRaw) || (shopRaw && shopPreviewOk) ? shopRaw : null;
  const shopPreview = !!shopRaw && !shopVisibleToAll(shopRaw) && shopPreviewOk;
  const shopCtx = shopSlug && shopDoc ? shopDoc : null; // the active shop (null = the main store)
  const shopLoading = !!shopKey && (!shopSlug || shopDoc === undefined);
  // the old ?shop=<key> form, an old link name (alias) or the shop id: move the address bar to kyvro.store/<current link>
  useEffect(() => {
    if (!shopCtx) return;
    try {
      const key = shopLinkKey(shopCtx);
      const viaQuery = !!new URLSearchParams(window.location.search).get('shop');
      if (key && (viaQuery || (pathShop && pathShop !== key))) {
        window.history.replaceState(window.history.state, '', `/${key}`);
        sessionStorage.setItem('kyvro_shop', key);
      }
    } catch (e) { /* ignore */ }
  }, [shopCtx && shopLinkKey(shopCtx)]); // eslint-disable-line react-hooks/exhaustive-deps
  // kyvro.store/<something> that is no shop (or a shop that is off): a "not found" page, and the main store afterwards
  const pathNotFound = !!pathShop && !!shopSlug && shopDoc === null;
  useEffect(() => { if (pathNotFound) { try { sessionStorage.removeItem('kyvro_shop'); } catch (e) { /* ignore */ } } }, [pathNotFound]);
  // shop plans: a shop whose paid plan ran out shows only its best sellers (the rest are hidden, not deleted)
  const shopVisible = shopCtx ? visibleShopIds(shopCtx, Object.fromEntries(products.map((p) => [String(p.id), p])), plans) : null;
  // the shop's plan right now (the Owner's own shop has every extra) and the header brand (Premium: wordmark)
  const shopTier = shopCtx ? (shopCtx.planExempt ? 'premium' : effectiveTier(shopCtx)) : 'free';
  // what the shop may show right now: tier defaults, or the Owner's / a Manager's ON / OFF for this shop
  const shopFeat = shopCtx ? (shopCtx.planExempt ? Object.fromEntries(FEATURES.map((f) => [f.key, true])) : effectiveFeatures(shopCtx, shopTier, plans.tierFeatures)) : {};
  // WhatsApp order messages name the shop and link its products (null on the main store)
  setWaShop(shopCtx ? { name: shopDisplayName(shopCtx), url: `${window.location.origin}/${shopLinkKey(shopCtx)}` } : null);
  useEffect(() => { if (shopCtx) { try { document.title = `${shopDisplayName(shopCtx)} · Kyvro`; } catch (e) { /* ignore */ } } }, [shopCtx && shopDisplayName(shopCtx)]); // eslint-disable-line react-hooks/exhaustive-deps
  // storefront theme (src/data/themes.js): a preview (?themePreview=) > the shop's own theme (non-Classic needs the
  // "themes" feature, else Classic) > the main site's theme (settings/theme)
  const [siteTheme, setSiteTheme] = useState({ theme: 'classic', mode: 'auto' });
  useEffect(() => watchSiteTheme(setSiteTheme), []);
  const [themePreview] = useState(themePreviewFromUrl);
  const shopThemeKey = shopCtx ? cleanTheme(shopCtx.theme) : 'classic';
  const activeTheme = themePreview || (shopCtx
    ? { theme: shopThemeKey === 'classic' || shopFeat.themes ? shopThemeKey : 'classic', mode: cleanMode(shopCtx.themeMode) }
    : siteTheme);
  const shopBrand = shopCtx ? { name: shopDisplayName(shopCtx, shopFeat), wordmark: shopTier === 'premium', color: shopFeat.brandColor ? brandHex(shopCtx.brandColor) : '#D4AF37', logo: shopFeat.logo && shopCtx.logo ? shopCtx.logo : '' } : null;
  const storefrontProducts = shopLoading ? [] : shopCtx
    ? shopProducts.filter((p) => shopCtx.items && shopCtx.items[String(p.id)] !== undefined && (!shopVisible || shopVisible.has(String(p.id)))).map((p) => {
        const price = shopPriceClamp(p.price, shopCtx.items[String(p.id)]);
        return { ...p, price, basePrice: p.price, originalPrice: p.originalPrice > price ? p.originalPrice : 0 };
      })
    : shopProducts;
  // does the shop have any product in this collection (menu entries with nothing in them are hidden in a shop)
  const navHas = (name) => !shopCtx || storefrontProducts.some((p) => productInCollection(p, name));
  // the product as this visitor buys it (shop price in a shop, store price otherwise); null = not sold in this shop
  const retail = (p) => {
    const live = products.find((x) => x.id === p.id) || p;
    if (!shopCtx) return live;
    const sp = storefrontProducts.find((x) => x.id === live.id);
    return sp ? { ...live, price: sp.price, originalPrice: sp.originalPrice, basePrice: live.price } : null;
  };

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('kyvro_cart');
    return saved ? JSON.parse(saved) : [];
  });
  // A cart made in one shop (or the main store) is emptied when the visitor moves to another one, so prices never get mixed
  useEffect(() => {
    if (shopLoading) return;
    try {
      const cur = shopCtx ? shopSlug : '';
      const tag = localStorage.getItem('kyvro_cart_shop') || '';
      if (tag !== cur) { setCart([]); localStorage.setItem('kyvro_cart_shop', cur); }
    } catch (e) { /* ignore */ }
  }, [shopLoading, shopCtx, shopSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const [orders, setOrders] = useState([]); // live from Firestore (team members only)
  const [shopOwners, setShopOwners] = useState({}); // shop slug -> { email, name }: whose shop is whose (Owner sees all, others only their own)
  const [productCommissions, setProductCommissions] = useState({}); // team commission % per product id (Owner sets it, team can read)
  const [productCosts, setProductCosts] = useState({}); // private supplier details per product id (team members only)

  // Customer account (Google sign-in). Team members who sign in this way are also recognised as team below.
  const [customerUser, setCustomerUser] = useState(null);
  const [authReady, setAuthReady] = useState(false); // true once Firebase has told us whether someone is signed in
  const [accessChecked, setAccessChecked] = useState(false); // true once we also know whether the signed-in person is a team member
  const [profile, setProfile] = useState({});
  const [profileReady, setProfileReady] = useState(false); // true once the signed-in customer's profile has arrived
  // Favourites of a visitor who is not signed in: kept on this device (and moved into the account after sign-in)
  const [guestSaved, setGuestSaved] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem('kyvro_saved') || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string' || typeof x === 'number').slice(0, 300) : []; } catch (e) { return []; }
  });
  const [myOrders, setMyOrders] = useState([]);
  const [accountTab, setAccountTab] = useState('orders');
  const displayName = profile.name || (customerUser && customerUser.displayName) || '';
  const photoURL = profile.photoURL !== undefined && profile.photoURL !== '' ? profile.photoURL : ((customerUser && customerUser.photoURL) || '');
  const savedIds = customerUser ? (Array.isArray(profile.saved) ? profile.saved : []) : guestSaved;

  // Banner text + discount rules: edited by the Owner in the admin panel (Firestore settings/store)
  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETTINGS);
  const announcementText = storeSettings.announcementText;
  const [currencyKey, setCurrencyKey] = useState("BDT");
  const curr = CURRENCIES[currencyKey];


  // coming back from the SSLCommerz payment page: /?pay=ok|fail|cancel|check&order=KV...
  const [payResult] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const st = q.get('pay');
      if (['ok', 'fail', 'cancel', 'check', 'due'].includes(st)) return { status: st, order: (q.get('order') || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40), kind: q.get('kind') === 'advance' ? 'advance' : 'full', amount: parseInt(q.get('amt'), 10) || 0 };
    } catch (e) { /* ignore */ }
    return null;
  });
  // kyvro.store/Admin (any case) opens the team login / admin panel; the site itself has no Admin link
  const isAdminPath = /^\/admin\/?$/i.test(window.location.pathname);
  const [currentView, setCurrentView] = useState(payResult ? 'payment-result' : isAdminPath ? 'admin' : 'home');
  // Payment done (or being checked): now the cart can be emptied. Cancelled / failed payments keep the cart.
  useEffect(() => {
    if (payResult && (payResult.status === 'ok' || payResult.status === 'check')) { setCart([]); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (payResult) { try { window.history.replaceState(window.history.state, '', window.location.pathname); } catch (e) { /* ignore */ } }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // coming back from a shop plan payment: /?plan=ok|fail|cancel|check
  useEffect(() => {
    try {
      const st = new URLSearchParams(window.location.search).get('plan');
      if (!st) return;
      window.history.replaceState(window.history.state, '', window.location.pathname);
      const text = {
        ok: 'Payment received. Your shop plan is extended: all your shop products show again. (Admin Portal -> My Shop)',
        check: 'We could not confirm the payment yet. If money was taken, your plan is extended within a few minutes.',
        cancel: 'The plan payment was cancelled. Nothing was charged.',
        fail: 'The plan payment did not go through. Please try again from Admin Portal -> My Shop.',
      }[st];
      if (text) setTimeout(() => alert(text), 300);
    } catch (e) { /* ignore */ }
  }, []);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState(null); // null = default view of the collection
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Visitor tracking (Facebook Pixel + Google Analytics). Off until the IDs are filled in src/analyticsConfig.js.
  useEffect(() => { initAnalytics(); }, []);
  useEffect(() => {
    if (currentView === 'admin') return; // never track the admin panel
    trackPageView(currentView);
    if (currentView === 'product-detail' && selectedProduct) trackViewContent(selectedProduct);
  }, [currentView, selectedProduct]);
  
  // Choosing a collection always starts at its default view
  const selectCategory = (category) => {
    setSelectedCategory(category);
    setSelectedSubCategory(null);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [priceFilter, setPriceFilter] = useState(15000);

  const [isCartOpen, setIsCartOpen] = useState(false);
  // Offer link (?product=ID from an email or notification): open that product as soon as the products are loaded
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (deepLinkDone.current) return;
    let id = '';
    try { id = new URLSearchParams(window.location.search).get('product') || ''; } catch (e) { /* ignore */ }
    if (!id) { deepLinkDone.current = true; return; }
    const found = storefrontProducts.find((x) => String(x.id) === id);
    if (!found) return; // not loaded yet (or removed): try again when the product list changes
    deepLinkDone.current = true;
    setSelectedProduct(found); setCurrentView('product-detail');
    try { window.history.replaceState(window.history.state, '', window.location.pathname); } catch (e) { /* ignore */ }
    // on a shop link (kyvro.store/<shop>?product=ID, e.g. from a WhatsApp order) the list is empty until the shop loads
  }, [products, shopLoading, storefrontProducts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Page history: every page the customer opens (home, a collection + sub-category, a product ...) is also a browser
  // history entry, so the phone's Back button / swipe-back and the floating Back button go to the PREVIOUS page of the
  // website instead of leaving it.
  const nav = useRef({ snaps: [], idx: -1 });
  useEffect(() => {
    const n = nav.current;
    const snap = { view: currentView, cat: selectedCategory, sub: selectedSubCategory, prod: selectedProduct };
    const cur = n.snaps[n.idx];
    if (cur && cur.view === snap.view && cur.cat === snap.cat && cur.sub === snap.sub && (cur.prod && cur.prod.id) === (snap.prod && snap.prod.id)) return;
    try {
      if (n.idx < 0) {
        n.snaps = [snap]; n.idx = 0;
        window.history.replaceState({ kv: 0 }, '', window.location.href);
        return;
      }
      n.snaps = n.snaps.slice(0, n.idx + 1);
      n.snaps.push(snap);
      n.idx = n.snaps.length - 1;
      // the admin panel lives at /Admin; every other page at the normal address
      window.history.pushState({ kv: n.idx }, '', currentView === 'admin' ? '/Admin' : (/^\/admin\/?$/i.test(window.location.pathname) ? '/' : window.location.pathname));
    } catch (e) { /* ignore */ }
  }, [currentView, selectedCategory, selectedSubCategory, selectedProduct]);
  useEffect(() => {
    const onPop = (e) => {
      const n = nav.current;
      let k = e.state && typeof e.state.kv === 'number' ? e.state.kv : 0;
      if (!n.snaps[k]) k = 0;
      const snap = n.snaps[k];
      if (!snap) return;
      n.idx = k;
      setIsCartOpen(false);
      setIsMobileMenuOpen(false);
      setCurrentView(snap.view);
      setSelectedCategory(snap.cat);
      setSelectedSubCategory(snap.sub);
      setSelectedProduct(snap.prod);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const goBack = () => {
    if (nav.current.idx > 0) window.history.back();
    else { setCurrentView('home'); setSelectedCategory('All'); setSelectedSubCategory(null); }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  // the theme's mode: Light / Dark open the page in that mode (the visitor can still switch); "Visitor chooses" leaves it
  useEffect(() => { if (activeTheme.mode === 'light' || activeTheme.mode === 'dark') setIsDarkMode(activeTheme.mode === 'dark'); }, [activeTheme.theme, activeTheme.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const banners = [coverPhoto1Img, men_womenImg, women_bannerImg, styleImg, punjabi_shirtImg, shirtImg, punjabiImg, sneakersImg];
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Every slide stays exactly 10 seconds. The timer restarts after each change (also after a click on a dot)
  // and only runs while the home page is open, so the first photo is never cut short.
  const BANNER_SECONDS = 10;
  useEffect(() => {
    if (currentView !== 'home') return undefined;
    const timer = setTimeout(() => {
      setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, BANNER_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [currentBannerIndex, currentView, banners.length]);

  // Coming back to the home page always starts with the first (cover) photo
  useEffect(() => {
    if (currentView === 'home') setCurrentBannerIndex(0);
  }, [currentView]);

  // Load all banner photos in the background so a slide never appears late
  useEffect(() => {
    banners.forEach((src) => { const im = new Image(); im.src = src; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Admin & Firebase Auth States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  // a not-live shop: the team (Owner / Manager / Admin) and the shop's own owner may preview it
  useEffect(() => {
    setShopPreviewOk(!!shopRaw && (isAdminLoggedIn || (!!customerUser && customerUser.uid === shopRaw.ownerUid)));
  }, [shopRaw, isAdminLoggedIn, customerUser]);
  // a seller who signs in counts as active (unused shops are removed after 30 days without a visit)
  useEffect(() => { if (customerUser && customerUser.uid) touchSellerSeen(customerUser.uid); }, [customerUser && customerUser.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  // a signed-in seller with a shop (live or waiting) sees "My Shop" in the account menu / footer instead of "Start your own business"
  const [hasSellerShop, setHasSellerShop] = useState(false);
  useEffect(() => watchMySeller(customerUser && customerUser.uid, (s) => setHasSellerShop(!!s && sellerStatus(s) !== 'rejected')), [customerUser && customerUser.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  // Maintenance mode: visitors can browse everything, but ordering is locked (team members can still test-order)
  const visitorLocked = storeSettings.maintenanceMode === true && !isAdminLoggedIn;
  const lockText = ((storeSettings.maintenanceMessage || '').trim()) || "ওয়েবসাইটে কাজ চলছে, অর্ডার সাময়িক বন্ধ, কিন্তু added to cart করে রাখতে পারবেন। পরবর্তীতে ওয়েবসাইট পুনরায় চালু হলে পেমেন্ট করতে পারবেন অথবা ম্যানুয়ালি অর্ডার করতে WhatsApp এ যোগাযোগ করুন।\n\nMaintenance mode is ON. Ordering is paused for a little while, but you can keep items in your cart and pay when the website opens again, or contact us on WhatsApp to order manually.";
  // WhatsApp message with everything in the customer's cart (used by the maintenance popup)
  const cartRef = useRef([]);
  const cartWhatsAppText = () => ((cartRef.current || []).length ? waOrderText(waCartLines(cartRef.current)) : waOrderText(['Hello Kyvro, I want to place an order manually.']));
  useEffect(() => {
    if (visitorLocked && currentView === 'checkout') { setCurrentView('home'); showMaintenance(lockText, cartWhatsAppText); }
  }, [visitorLocked, currentView]); // eslint-disable-line react-hooks/exhaustive-deps
  const [loggedInUserEmail, setLoggedInUserEmail] = useState('');
  const [adminRole, setAdminRole] = useState(null); // 'owner' | 'manager' | 'admin' | null
  const [adminAddProducts, setAdminAddProducts] = useState(false); // the Owner allowed this person to add new products
  const [adminCanApprove, setAdminCanApprove] = useState(false); // the Owner allowed this person to approve pending products
  const [adminCanCreateShop, setAdminCanCreateShop] = useState(false); // the Owner allowed this Admin to create their own shop
  const [adminEditAll, setAdminEditAll] = useState(false); // the Owner allowed this person to edit every product
  const [adminName, setAdminName] = useState('');
  const [adminTab, setAdminTab] = useState('dashboard');

  // Checks whether an email has access (role + access ON/OFF)
  const checkAccess = async (email) => {
    const { role, active, name } = await getAdminStatus(email);
    if (!role) return { ok: false, message: 'Access denied: ' + email + ' is not authorized for the Admin Portal.' };
    if (!active) return { ok: false, message: 'Your access is currently turned OFF. Please contact the Owner.' };
    return { ok: true, role, name };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthReady(true);
      if (!user) {
        setCustomerUser(null);
        setProfile({});
        setMyOrders([]);
        setAccessChecked(true);
        return;
      }
      // Everyone who signs in is a customer; team members are recognised on top of that
      setCustomerUser({ uid: user.uid, email: user.email || '', displayName: user.displayName || '', photoURL: user.photoURL || '' });
      // offer emails: a signed-in customer joins the list once (they can switch it off in Account -> Settings)
      if (user.email && user.emailVerified) ensureSubscribed(user).catch(() => {});
      let access = { ok: false };
      try { access = await checkAccess(user.email); } catch (e) { console.error(e); }
      if (access.ok) {
        setAdminRole(access.role);
        setAdminName(access.name || user.displayName || '');
        setIsAdminLoggedIn(true);
        setLoggedInUserEmail(user.email);
      } else {
        setAdminRole(null);
        setAdminName('');
        setIsAdminLoggedIn(false);
        setLoggedInUserEmail('');
      }
      setAccessChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // While logged in, access OFF / removal / role changes by the Owner apply immediately
  useEffect(() => {
    if (!isAdminLoggedIn || !loggedInUserEmail || isOwnerEmail(loggedInUserEmail)) return;
    const unsubscribe = watchAdminAccess(loggedInUserEmail, ({ role, active, name, editAll, addProducts, canApprove, canCreateShop, commission }) => {
      if (!role || !active) {
        setIsAdminLoggedIn(false);
        setLoggedInUserEmail('');
        setAdminRole(null);
        setAdminName('');
        setCurrentView('home');
        alert(!role ? 'Your admin access has been removed.' : 'Your admin access has been turned OFF.');
      } else {
        setAdminRole(role);
        setAdminEditAll(!!editAll);
        setAdminAddProducts(!!addProducts);
        setAdminCanApprove(!!canApprove);
        setAdminCanCreateShop(!!canCreateShop);
        if (name) setAdminName(name);
      }
    });
    return () => unsubscribe();
  }, [isAdminLoggedIn, loggedInUserEmail]);

  const [newProductForm, setNewProductForm] = useState(freshProductForm);
  const [editingProductId, setEditingProductId] = useState(null);

  const [checkoutForm, setCheckoutForm] = useState(EMPTY_CHECKOUT);
  const [checkoutError, setCheckoutError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderCompleteData, setOrderCompleteData] = useState(null);
  const [payNotice, setPayNotice] = useState('');
  // Back button from the payment page can restore this page exactly as it was (overlay on): switch it off
  useEffect(() => {
    const onShow = (e) => { if (e.persisted) setPlacingOrder(false); };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  useEffect(() => {
    if (isCloud) return;
    try {
      localStorage.setItem('kyvro_products', JSON.stringify(localProducts));
    } catch (err) {
      console.error('Could not save products:', err);
      alert('Browser storage is full, so the latest product changes could not be saved. Use smaller photos or image links instead of uploaded photos.');
    }
  }, [localProducts, isCloud]);

  useEffect(() => {
    localStorage.setItem('kyvro_cart', JSON.stringify(cart));
    cartRef.current = cart;
  }, [cart]);
  // signed-in customer: keep a short cart summary on users/{uid} (only when the cart really changed), so a cart left
  // behind gets a phone reminder on day 1 / 3 / 7 (daily job). An empty cart (ordered or cleared) stops the reminders.
  const cartUid = customerUser && customerUser.uid;
  useEffect(() => {
    if (!cartUid || shopLoading) return undefined;
    const items = cart || [];
    const sig = items.map((i) => `${i.id}:${i.selectedSize || ''}:${i.selectedColor || ''}:${i.quantity}`).join('|');
    const key = `kyvro_cart_sig_${cartUid}`;
    let last = null;
    try { last = localStorage.getItem(key); } catch (e) { /* ignore */ }
    if (last === sig) return undefined;
    const t = setTimeout(() => {
      const n = Math.min(100, items.reduce((a, i) => a + (parseInt(i.quantity, 10) || 0), 0));
      const summary = n > 0
        ? { n, name: String(items[0].name || '').replace(/[<>]/g, '').slice(0, 80), at: new Date().toISOString(), shop: shopCtx ? String(shopLinkKey(shopCtx) || '') : '' }
        : { n: 0, name: '', at: '', shop: '' };
      saveCartSummary(cartUid, summary).then(() => { try { localStorage.setItem(key, sig); } catch (e) { /* ignore */ } }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [cart, cartUid, shopLoading]); // eslint-disable-line react-hooks/exhaustive-deps
  // a cart reminder opens the site with ?cart=open: show the cart
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('cart') === 'open') {
        setIsCartOpen(true);
        q.delete('cart');
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${q.toString() ? `?${q}` : ''}`);
      }
    } catch (e) { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Team members see new customer orders live
  useEffect(() => {
    if (!isAdminLoggedIn) { setOrders([]); return; }
    const unsubscribe = watchOrders(setOrders, (err) => console.error('Could not load orders:', err));
    return () => unsubscribe();
  }, [isAdminLoggedIn]);

  // Private supplier details (cost, shop name) are loaded only for team members; customers never get them
  useEffect(() => {
    // Supplier details are private to the Owner and Managers (Admins never get them)
    if (!isAdminLoggedIn || (adminRole !== 'owner' && adminRole !== 'manager')) { setProductCosts({}); return; }
    const unsubscribe = watchProductCosts(setProductCosts, (err) => console.error('Could not load supplier details:', err));
    return () => unsubscribe();
  }, [isAdminLoggedIn, adminRole]);

  useEffect(() => {
    if (!isAdminLoggedIn) { setShopOwners({}); return undefined; }
    // the Owner and Managers see every shop's owner (Managers see the Admins' shop earnings in Team Stats)
    if (adminRole === 'owner' || adminRole === 'manager') return watchShopOwners(setShopOwners, () => {});
    const uid = auth.currentUser ? auth.currentUser.uid : '';
    if (!uid) return undefined;
    return watchMyShop(uid, (sh) => setShopOwners(sh ? { [sh.slug]: { email: String(loggedInUserEmail || '').toLowerCase(), name: adminName } } : {}), () => {});
  }, [isAdminLoggedIn, adminRole, loggedInUserEmail, adminName]);
  useEffect(() => {
    if (!isAdminLoggedIn) { setProductCommissions({}); return; }
    const unsubscribe = watchProductCommissions(setProductCommissions, (err) => console.error('Could not load commissions:', err));
    return () => unsubscribe();
  }, [isAdminLoggedIn]);

  // The signed-in customer's profile (name, photo, saved items) and own orders
  const customerUid = customerUser ? customerUser.uid : null;
  useEffect(() => {
    if (!customerUid) { setProfileReady(false); return; }
    setProfileReady(false);
    const stopProfile = watchProfile(customerUid, (p) => { setProfile(p); setProfileReady(true); });
    const stopOrders = watchMyOrders(customerUid, setMyOrders, (err) => console.error('Could not load your orders:', err));
    return () => { stopProfile(); stopOrders(); };
  }, [customerUid]);

  // Keep a visitor's favourites on this device
  useEffect(() => { try { localStorage.setItem('kyvro_saved', JSON.stringify(guestSaved)); } catch (e) {} }, [guestSaved]);

  // After sign-in: favourites saved on this device join the account's saved items (nothing is lost)
  useEffect(() => {
    if (!customerUid || !profileReady || guestSaved.length === 0) return;
    const cloud = Array.isArray(profile.saved) ? profile.saved : [];
    const merged = [...cloud, ...guestSaved.filter(id => !cloud.includes(id))].slice(0, 300);
    saveProfile(customerUid, { saved: merged }).then(() => setGuestSaved([])).catch(() => {});
  }, [customerUid, profileReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Make checkout easier: pre-fill the name of a signed-in customer
  useEffect(() => {
    if (displayName) setCheckoutForm(f => (f.fullName ? f : { ...f, fullName: displayName }));
  }, [displayName]);

  // Live products from Firestore (everyone sees the same shop)
  useEffect(() => {
    try {
      const unsubscribe = watchProducts((list, isEmpty) => {
        let moved = false;
        try { moved = localStorage.getItem('kyvro_cloud') === '1'; } catch (e) {}
        if (!isEmpty) {
          try { localStorage.setItem('kyvro_cloud', '1'); } catch (e) {}
          setCloudProducts(list);
        } else {
          // Nothing in Firestore yet: keep the old list. If it was emptied on purpose, stay empty.
          setCloudProducts(moved ? [] : null);
        }
      }, (err) => console.error('Could not load products:', err), { all: isAdminLoggedIn });
      return () => unsubscribe();
    } catch (err) {
      console.error('Could not load products:', err);
    }
  }, [isAdminLoggedIn]);

  // Live store settings (banner + discount rules) for every visitor
  useEffect(() => {
    try {
      const unsubscribe = watchStoreSettings(setStoreSettings);
      return () => unsubscribe();
    } catch (err) {
      console.error('Could not load store settings:', err);
    }
  }, []);

  // Tailwind "dark:" styles follow the Light/Dark button of the site
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Every page change starts at the top
  useEffect(() => { window.scrollTo(0, 0); }, [currentView]);

  const formatPrice = (amountInBDT) => {
    const converted = amountInBDT * curr.rate;
    return `${curr.symbol} ${converted.toFixed(2)}`;
  };

  const calculateDiscountPercent = (price, originalPrice) => {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  const addToCart = (product, selectedColor, selectedSize, quantity = 1, goCheckout = false) => {
    const live = retail(product);
    if (!live) { alert('This product is not available in this shop.'); return; }
    const size = selectedSize || (live.sizes && live.sizes[0]);
    const color = selectedColor || (live.colors && live.colors[0]);
    const cartItemId = `${product.id}-${color || 'default'}-${size || 'default'}`;

    // Never allow more than what is in stock (for that size, and that color when colors have their own stock)
    const byColor = hasColorStock(live);
    const available = stockFor(live, size, color);
    const inCart = cart.filter(i => i.id === product.id && i.selectedSize === size && (!byColor || i.selectedColor === color)).reduce((sum, i) => sum + i.quantity, 0);
    const canAdd = Math.max(0, available - inCart);
    const sizeText = `${hasSizeStock(live) && size ? ` in size ${size}` : ''}${byColor && color ? `, ${color}` : ''}`;
    if (canAdd <= 0) {
      alert(`Sorry, no more units are available${sizeText}.`);
      return;
    }
    const qty = Math.min(quantity, canAdd);
    if (qty < quantity) alert(`Only ${available} unit(s) available${sizeText}. We added ${qty} to your cart.`);

    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + qty } : item);
      }
      const { colorImages, colorGallery, images, ...rest } = live; // extra photos stay out of the cart (keeps it small)
      return [...prev, { ...rest, image: imageFor(live, color), cartItemId, selectedColor: color, selectedSize: size, quantity: qty }];
    });
    trackAddToCart({ ...live, selectedColor: color }, qty);
    if (visitorLocked) {
      // Maintenance mode: the item stays in the cart (it is saved on this device), but checkout is closed
      setIsCartOpen(true);
      showMaintenance(lockText, cartWhatsAppText);
      return;
    }
    if (goCheckout) {
      // Buy Now: skip the cart drawer and go straight to checkout
      setIsCartOpen(false);
      setCheckoutError('');
      setCurrentView('checkout');
    } else {
      setIsCartOpen(true);
    }
  };

  const updateCartQty = (cartItemId, delta) => {
    if (delta > 0) {
      const target = cart.find(i => i.cartItemId === cartItemId);
      if (target) {
        const live = products.find(p => p.id === target.id) || target;
        const byColor = hasColorStock(live);
        const available = stockFor(live, target.selectedSize, target.selectedColor);
        const sameSizeInCart = cart.filter(i => i.id === target.id && i.selectedSize === target.selectedSize && (!byColor || i.selectedColor === target.selectedColor)).reduce((sum, i) => sum + i.quantity, 0);
        if (sameSizeInCart + delta > available) {
          alert(`Only ${available} unit(s) available${hasSizeStock(live) ? ` in size ${target.selectedSize}` : ''}${byColor && target.selectedColor ? `, ${target.selectedColor}` : ''}.`);
          return;
        }
      }
    }
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  // Add to Cart / Buy Now on the product cards: ask for size / color first when the product has them
  const [quickAdd, setQuickAdd] = useState(null); // { product, goCheckout }
  const requestAdd = (product, goCheckout = false) => {
    const live = retail(product);
    if (!live) return;
    if (needsChoice(live)) setQuickAdd({ product: live, goCheckout });
    else addToCart(live, undefined, undefined, 1, goCheckout);
  };
  const confirmQuickAdd = (product, color, size, qty, goCheckout) => {
    setQuickAdd(null);
    addToCart(product, color, size, qty, goCheckout);
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  // Automatic discount (rules are set by the Owner), taken off the product total, not the delivery charge
  const discountInfo = bestDiscount(subtotal, storeSettings);
  const discount = discountInfo.amount;
  // Flat delivery charge; free above the Owner's minimum (see data/shopConfig.js and Admin > Store Settings)
  const deliveryCharge = deliveryFee(checkoutForm.deliveryArea, checkoutForm.paymentMethod, subtotal - discount, storeSettings, cart.reduce((n, i) => n + (parseInt(i.quantity, 10) || 0), 0));
  const discountLabel = discountInfo.rule ? describeRule(discountInfo.rule) : '';
  const reward = nextReward(subtotal, storeSettings);
  // a shop's promo code (Premium "coupons"): only on that shop's link; comes out of the shop's markup, never Kyvro's price
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState(null);
  const couponsOn = !!shopCtx && !!shopFeat.coupons && !!shopCtx.coupons && Object.keys(shopCtx.coupons).length > 0;
  const appliedCoupon = couponsOn && couponCode ? couponActive(shopCtx, couponCode) : null;
  const couponAmount = appliedCoupon ? couponAmountFor(cart, appliedCoupon, subtotal - discount) : 0;
  const applyCoupon = (raw) => {
    const code = cleanCouponCode(raw);
    if (!code) { setCouponCode(''); setCouponMsg(null); return; }
    const c = couponActive(shopCtx, code);
    if (!c) { setCouponCode(''); setCouponMsg({ type: 'err', text: 'This promo code is not valid. · প্রোমো কোডটি সঠিক নয়।' }); return; }
    if (subtotal - discount < c.minOrder) { setCouponCode(''); setCouponMsg({ type: 'err', text: `This code needs an order of at least ${formatPrice(c.minOrder)}.` }); return; }
    setCouponCode(code);
    setCouponMsg({ type: 'ok', text: `${code} applied: ${c.percent}% off.` });
  };
  useEffect(() => { setCouponCode(''); setCouponMsg(null); }, [shopCtx && shopCtx.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const grandTotal = subtotal - discount - couponAmount + deliveryCharge;
  useEffect(() => { if (currentView === 'checkout' && cart.length) trackInitiateCheckout(cart, subtotal - discount); }, [currentView]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (placingOrder || cart.length === 0) return;
    setCheckoutError('');
    // which Pay button was pressed: 'bkash' | 'card' (empty = normal Place Order)
    const payVia = (e.nativeEvent && e.nativeEvent.submitter && e.nativeEvent.submitter.value) || 'any';

    const name = checkoutForm.fullName.trim();
    const phone = cleanPhone(checkoutForm.phone.trim());
    const street = checkoutForm.address.trim();
    if (name.length < 2) return setCheckoutError('Please enter your name. (আপনার নাম লিখুন)');
    if (!/^[+]?[0-9]{7,15}$/.test(phone)) return setCheckoutError('Please enter a valid phone number. (সঠিক ফোন নম্বর দিন)');
    if (!checkoutForm.district) return setCheckoutError('Please select your city / district. (জেলা নির্বাচন করুন)');
    if (!checkoutForm.upazila) return setCheckoutError('Please select your zone / thana. (থানা বা উপজেলা নির্বাচন করুন)');
    if (street.length < 5) return setCheckoutError('Please enter your house / road / village. (বাড়ি, রাস্তা বা গ্রামের নাম লিখুন)');
    if (!DELIVERY_AREAS.includes(checkoutForm.deliveryArea)) return setCheckoutError('Please select your city / district again.');
    // address saved on separate labelled lines: house/road, area, zone (thana/upazila), city (district)
    const address = [
      `House/Road: ${street}`,
      checkoutForm.area ? `Area: ${checkoutForm.area}` : '',
      `Zone: ${checkoutForm.upazila}`,
      `City: ${checkoutForm.district}`
    ].filter(Boolean).join('\n');
    if (!ONLINE_PAY_ON && checkoutForm.paymentMethod === 'Online Payment') return setCheckoutError('Online payment is not available right now. Please choose another payment method.');
    if (!checkoutForm.agree) return setCheckoutError('Please accept the Terms & Conditions, Privacy Policy and Return & Refund Policy to continue.');

    // Make sure everything in the cart is still in stock
    for (const item of cart) {
      const live = products.find(p => p.id === item.id) || item;
      const byColor = hasColorStock(live);
      const inCart = cart.filter(i => i.id === item.id && i.selectedSize === item.selectedSize && (!byColor || i.selectedColor === item.selectedColor)).reduce((n, i) => n + i.quantity, 0);
      const left = stockFor(live, item.selectedSize, item.selectedColor);
      if (inCart > left) {
        const which = `${hasSizeStock(live) ? ` in size ${item.selectedSize}` : ''}${byColor && item.selectedColor ? `, ${item.selectedColor}` : ''}`;
        return setCheckoutError(left <= 0
          ? `Sorry, "${item.name}"${which} is sold out. Please remove it from your cart.`
          : `Sorry, only ${left} unit(s) of "${item.name}"${which} are left. Please reduce the quantity.`);
      }
    }

    // A price may have changed since the item was added: update the cart and let the customer look again
    // (the payment page refuses an order whose prices do not match the store)
    const repriced = cart.map((item) => {
      const live = retail(item);
      return live ? { ...item, price: live.price, basePrice: live.basePrice !== undefined ? live.basePrice : live.price } : null;
    });
    if (repriced.some((it, i) => !it || it.price !== cart[i].price || (cart[i].basePrice !== undefined && it.basePrice !== cart[i].basePrice))) {
      setCart(repriced.filter(Boolean));
      return setCheckoutError('Some prices in your cart changed (or an item is no longer sold here). Your cart was updated, please check the total and place the order again.');
    }

    const order = {
      customer: { name, phone, address, notes: checkoutForm.notes.trim() },
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category || '',
        price: item.price,
        basePrice: item.basePrice !== undefined ? item.basePrice : item.price, // the store price (a shop's markup = price - basePrice)
        quantity: item.quantity,
        size: item.selectedSize || '',
        color: item.selectedColor || '',
        image: typeof item.image === 'string' && /^https?:\/\//.test(item.image) && item.image.length < 400 ? item.image : ''
      })),
      subtotal,
      discount,
      discountLabel,
      ...(couponAmount > 0 ? { coupon: { code: appliedCoupon.code, percent: appliedCoupon.percent, amount: couponAmount } } : {}),
      deliveryArea: checkoutForm.deliveryArea,
      shipping: deliveryCharge,
      total: grandTotal,
      paymentMethod: checkoutForm.paymentMethod,
      paymentStatus: paymentStatusFor(checkoutForm.paymentMethod),
      status: 'Pending',
      ...(shopCtx ? { shop: shopSlug } : {}),
      // an Admin who places the order while selling: the commission goes to this person
      ...(isAdminLoggedIn && adminRole === 'admin' && customerUser && customerUser.email && String(customerUser.email).toLowerCase() === String(loggedInUserEmail || '').toLowerCase() ? { soldBy: String(loggedInUserEmail).toLowerCase() } : {}),
      ...(customerUser ? { uid: customerUser.uid } : {}),
      ...(customerUser && customerUser.email ? { email: customerUser.email.toLowerCase() } : {})
    };

    setPlacingOrder(true);
    try {
      const { orderNumber } = await placeOrder(order);
      // an order from a shop link: email its owner (Premium "Order email notification"; the server checks the plan,
      // sends once and never includes the customer's details). Best effort, never blocks the order.
      if (order.shop) { try { fetch('/api/shop-request-notify?action=order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNumber }) }).catch(() => {}); } catch (e) { /* ignore */ } }
      setOrderCompleteData({ ...order, orderNumber, date: new Date().toISOString() });
      trackPurchase({ ...order, orderNumber });
      const goesOnline = ONLINE_PAY_ON && (order.paymentMethod === 'Online Payment' || (Number(order.shipping) || 0) > 0);
      // Going to the payment page: keep the cart until the payment is done, so a cancelled payment can be tried again
      if (!goesOnline) { setCart([]); setCheckoutForm(EMPTY_CHECKOUT); }
      // Online Payment: the whole total is paid now. Cash on Delivery: the delivery charge is paid now, the rest at delivery.
      // Either way the customer goes straight to the bKash / card payment page.
      // If the payment page cannot be opened, the order is still saved and the thank-you page lets them pay again.
      setPayNotice('');
      if (ONLINE_PAY_ON && (order.paymentMethod === 'Online Payment' || (Number(order.shipping) || 0) > 0)) {
        try {
          const url = await getPaymentUrl(orderNumber, payVia);
          window.location.href = url;
          return;
        } catch (payErr) { console.warn('Payment page not opened:', payErr.message); setPayNotice(payErr.message); }
      }
      setCart([]); setCheckoutForm(EMPTY_CHECKOUT);
      setCurrentView('order-success');
    } catch (err) {
      console.error('Order failed:', err);
      setCheckoutError(err && err.code === 'permission-denied'
        ? 'Sorry, we could not accept this order. Please contact us on WhatsApp or at kyvrofashion@gmail.com.'
        : 'Sorry, we could not place your order. Please check your internet connection and try again, or contact us.');
    }
    setPlacingOrder(false);
  };

  // Google Sign-In Handler (only owners and team members with access ON can log in)
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const access = await checkAccess(result.user.email);
      if (!access.ok) {
        // Signed in as a normal customer, but not a team member
        alert(access.message);
        return;
      }
      setAdminRole(access.role);
      setAdminName(access.name || result.user.displayName || '');
      setIsAdminLoggedIn(true);
      setLoggedInUserEmail(result.user.email);
    } catch (error) {
      alert('Google Sign-In Error: ' + error.message);
    }
  };

  // Email + Password Sign-In Handler
  const handleEmailSignIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const access = await checkAccess(result.user.email);
      if (!access.ok) {
        await signOut(auth);
        alert(access.message);
        return;
      }
      setAdminRole(access.role);
      setAdminName(access.name || result.user.displayName || '');
      setIsAdminLoggedIn(true);
      setLoggedInUserEmail(result.user.email);
    } catch (error) {
      const wrong = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'];
      alert(wrong.includes(error.code) ? 'Incorrect email or password. If this team member signs in with Google, use "Continue with Google" instead (or ask the Owner to press "Reset password" for you).' : 'Sign-In Error: ' + error.message);
    }
  };

  // Customer sign-in / sign-out (header user menu)
  const handleCustomerSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        alert('Sign-In Error: ' + error.message);
      }
    }
  };

  const handleCancelMyOrder = (orderId) => cancelMyOrder(orderId, { email: customerUser ? customerUser.email : '' });

  const handleCustomerSignOut = async () => {
    try { await signOut(auth); } catch (err) {}
    setIsAdminLoggedIn(false);
    setLoggedInUserEmail('');
    setAdminRole(null);
    setAdminName('');
    setCurrentView('home');
  };

  const goAccount = (tab) => { setAccountTab(tab); setCurrentView('account'); };
  // "Start selling" / "Start your own business": first the public pricing page (no login needed). Choosing Free / Pro /
  // Premium asks for Google sign-in, then opens Sell on Kyvro with that plan (application form; Pro / Premium pay after approval).
  const [sellPlan, setSellPlan] = useState('');
  const [pricingBusy, setPricingBusy] = useState('');
  const startSelling = () => { setCurrentView('pricing'); window.scrollTo(0, 0); };
  // a team member (Owner / Manager / Admin) with their own team shop: "My Shop" opens Admin Panel -> My Shop / Team Shops
  const [hasTeamShop, setHasTeamShop] = useState(false);
  useEffect(() => {
    const uid = isAdminLoggedIn && auth.currentUser ? auth.currentUser.uid : '';
    if (!uid) { setHasTeamShop(false); return undefined; }
    return watchMyShop(uid, (sh) => setHasTeamShop(!!sh && sh.kind !== 'seller'), () => setHasTeamShop(false));
  }, [isAdminLoggedIn, loggedInUserEmail]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasMyShop = hasSellerShop || hasTeamShop;
  const openMyShop = () => {
    if (hasTeamShop && !hasSellerShop) { setAdminTab(adminRole === 'owner' ? 'own-shop' : 'my-shop'); setCurrentView('admin'); window.scrollTo(0, 0); return; }
    setSellPlan(''); goAccount('sell'); window.scrollTo(0, 0);
  };
  const sellAction = hasMyShop ? openMyShop : startSelling;
  const sellLabel = hasMyShop ? 'My Shop' : 'Start your own business';
  const choosePlan = async (tier) => {
    if (!auth.currentUser) {
      setPricingBusy(tier);
      try { await signInWithPopup(auth, googleProvider); }
      catch (error) {
        setPricingBusy('');
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') alert('Sign-In Error: ' + error.message);
        return;
      }
      setPricingBusy('');
    }
    setSellPlan(tier);
    goAccount('sell');
    window.scrollTo(0, 0);
  };

  const handleSaveProfile = (patch) => saveProfile(customerUser.uid, patch);

  // Heart button: saved items are kept in the customer's profile when signed in, otherwise on this device
  const toggleSaved = async (productId) => {
    if (!customerUser) {
      // no sign-in needed: kept on this device
      setGuestSaved(prev => (prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]));
      return;
    }
    const next = savedIds.includes(productId) ? savedIds.filter(id => id !== productId) : [...savedIds, productId];
    try {
      await saveProfile(customerUser.uid, { saved: next });
    } catch (err) {
      alert('Could not save this item. Please try again.');
    }
  };

  const savedProducts = savedIds.map(id => storefrontProducts.find(p => p.id === id)).filter(Boolean);

  // Owner: move the products from this browser into Firestore (one time)
  const [migrating, setMigrating] = useState(false);
  const handleMigrateProducts = async () => {
    if (migrating || isCloud) return;
    if (!(await askConfirm('Move all products to Firestore? After this, every customer on every device will see the same products.'))) return;
    setMigrating(true);
    try {
      const byId = {};
      INITIAL_PRODUCTS.forEach(p => { byId[p.id] = p; });
      const { count, missingPhotos } = await migrateProducts(localProducts, byId);
      alert(`Done. ${count} product(s) moved to Firestore.` + (missingPhotos ? `\n${missingPhotos} product(s) have no usable photo. Please edit them and add a photo again.` : ''));
    } catch (err) {
      console.error(err);
      alert('Could not move the products: ' + (err.code === 'permission-denied' ? 'please publish the new Firestore rules first.' : err.message));
    }
    setMigrating(false);
  };

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {}
    setIsAdminLoggedIn(false);
    setLoggedInUserEmail('');
    setAdminRole(null);
    setAdminName('');
    setCurrentView('home');
  };

  // Gender/Collection change handler (was missing in the original code and crashed the admin form)
  // Changing the collection resets the sub-category and sizes (they differ per collection)
  const handleGenderChange = (gender) => {
    setNewProductForm(prev => ({ ...prev, gender, category: defaultCategoryFor(gender), sizeStock: {}, colorStock: {} }));
  };


  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const existingProduct = editingProductId ? products.find(p => p.id === editingProductId) : null;
    if (!existingProduct && isCloud && !canAddProduct) { alert('The Owner has not given you permission to add new products.'); return; }

    // Sizes with their own quantity, e.g. { M: 20, L: 15, XL: 10 }
    const formSizes = newProductForm.sizeStock || {};
    let colorList = newProductForm.colors.split(',').map(s => s.trim()).filter(Boolean);
    // Stock per size AND color (e.g. M + White = 5): sizeStock and stock become the totals.
    // The admin types the color names himself, right beside each size.
    const perColor = !!newProductForm.trackColors;
    const sizeStock = {};
    for (const size of orderedSizes(Object.keys(formSizes), newProductForm.gender)) {
      if (perColor) { sizeStock[size] = 0; continue; } // worked out from the colors below
      const n = parseInt(formSizes[size], 10);
      if (Number.isNaN(n) || n < 0) {
        alert(`Please enter how many are available for size ${size} (0 or more).`);
        return;
      }
      sizeStock[size] = n;
    }
    const sizeNames = Object.keys(sizeStock);
    const hasSizes = sizeNames.length > 0;
    let colorStock = {};
    let stock;
    if (perColor) {
      const formColor = newProductForm.colorStock || {};
      const rows = hasSizes ? sizeNames : [''];
      const names = [];
      for (const size of rows) {
        let sizeTotal = 0;
        for (const key of Object.keys(formColor)) {
          const [ks, ...rest] = key.split('|');
          const color = rest.join('|').trim();
          if (ks !== size || !color) continue;
          const raw = formColor[key];
          const n = raw === undefined || raw === '' ? 0 : parseInt(raw, 10);
          if (Number.isNaN(n) || n < 0) {
            alert(`Please enter a valid number for ${size ? `size ${size}, ` : ''}${color} (0 or more).`);
            return;
          }
          colorStock[variantKey(size, color)] = n;
          sizeTotal += n;
          if (!names.includes(color)) names.push(color);
        }
        if (hasSizes) sizeStock[size] = sizeTotal;
      }
      if (!names.length) {
        alert('Add at least one color with its quantity, or untick "Track stock for each color separately".');
        return;
      }
      colorList = names;
      stock = Object.values(colorStock).reduce((sum, n) => sum + n, 0);
    } else {
      stock = hasSizes
        ? sizeNames.reduce((sum, s) => sum + sizeStock[s], 0)
        : Math.max(0, parseInt(newProductForm.stock, 10) || 0);
    }

    // Main photo: when the colors have their own photos, the first color photo IS the main photo (no second upload needed,
    // and no double photo in the gallery). Otherwise the separate Product Image field is used.
    const colorPhotoMap = {};
    for (const c of colorList) { const u = (newProductForm.colorImages || {})[c]; if (u) colorPhotoMap[c] = u; }
    const mainImage = Object.values(colorPhotoMap)[0] || newProductForm.image;
    if (!mainImage) {
      alert(colorList.length ? 'Please upload a photo for at least one color (or add a main product image).' : 'Please add a product image: paste an image link or upload a photo.');
      return;
    }

    // Extra photos: product level (up to 5) and per color (up to 3). All photos together must fit in one Firestore document (1 MB).
    const extraList = (newProductForm.extraImages || []).filter((u) => u && u !== mainImage).slice(0, 5);
    const colorGalleryOut = {};
    for (const c of colorList) { const g = ((newProductForm.colorGallery || {})[c] || []).filter(Boolean).slice(0, 5); if (g.length) colorGalleryOut[c] = g; }
    const photoBytes = JSON.stringify([mainImage, extraList, colorPhotoMap, colorGalleryOut]).length;
    if (photoBytes > 850000) {
      alert(`All photos together are too big (${Math.round(photoBytes / 1000)} KB, the limit is about 850 KB). Remove a few photos, or paste image links instead of uploading.`);
      return;
    }

    // Private supplier details (dropshipping). Cost is optional; if it is typed, the shop name is needed too.
    const costRaw = String(newProductForm.supplierCost ?? '').trim();
    const supplierName = String(newProductForm.supplierName || '').trim();
    const supplierLink = String(newProductForm.supplierLink || '').trim();
    const perColorLinks = !!newProductForm.linkPerColor;
    // links per color: only for colors the product really has
    const colorLinks = {};
    if (perColorLinks) {
      for (const c of colorList) {
        const u = String((newProductForm.colorLinks || {})[c] || '').trim();
        if (u) colorLinks[c] = u;
      }
    }
    // price per color (only when the supplier's price differs between colors)
    const colorCosts = {};
    if (perColorLinks) {
      for (const c of colorList) {
        const raw = String((newProductForm.colorCosts || {})[c] ?? '').trim();
        const n = parseFloat(raw);
        if (raw !== '' && !Number.isNaN(n) && n >= 0) colorCosts[c] = n;
      }
    }
    // extra links for the same color (optional): { Red: [{ link, cost }] }
    const colorAltLinks = {};
    if (perColorLinks) {
      for (const c of colorList) {
        const arr = ((newProductForm.colorAltLinks || {})[c] || [])
          .map((x) => ({ link: String((x && x.link) || '').trim(), cost: String((x && x.cost) ?? '').trim() }))
          .filter((x) => x.link || x.cost !== '')
          .slice(0, 3)
          .map((x) => ({ link: x.link, cost: Number.isNaN(parseFloat(x.cost)) ? 0 : Math.max(0, parseFloat(x.cost)) }));
        if (arr.length) colorAltLinks[c] = arr;
      }
    }
    // more suppliers (other shops that sell the same product)
    const extraSuppliers = [];
    for (const x of (newProductForm.extraSuppliers || [])) {
      const name = String((x && x.name) || '').trim();
      const link = String((x && x.link) || '').trim();
      const costX = String((x && x.cost) ?? '').trim();
      if (!name && !link && costX === '') continue; // empty row
      if (!name) { alert('More suppliers: write the shop name for every extra supplier (or remove the empty one).'); return; }
      if (costX === '' || Number.isNaN(parseFloat(costX)) || parseFloat(costX) < 0) { alert(`More suppliers: write the price of "${name}" (what it charges you per piece).`); return; }
      if (link && !/^https?:\/\//i.test(link)) { alert(`More suppliers: the link of "${name}" must start with http:// or https://`); return; }
      extraSuppliers.push({ name, cost: parseFloat(costX), link });
    }
    const allColorsPriced = colorList.length > 0 && colorList.every((c) => colorCosts[c] !== undefined);
    const supplierLinkUsed = perColorLinks ? '' : supplierLink;
    const hasSupplier = extraSuppliers.length > 0 || Object.keys(colorAltLinks).length > 0 || costRaw !== '' || supplierName !== '' || supplierLinkUsed !== '' || Object.keys(colorLinks).length > 0 || Object.keys(colorCosts).length > 0;
    const supplierCost = costRaw === '' ? (allColorsPriced ? Math.min(...Object.values(colorCosts)) : 0) : parseFloat(costRaw);
    if (hasSupplier) {
      if ((costRaw === '' && !allColorsPriced) || Number.isNaN(supplierCost) || supplierCost < 0) {
        alert('Supplier details: please enter the original price (what the supplier charges you per piece), or clear the supplier fields.');
        return;
      }
      if (!supplierName) {
        alert('Supplier details: please write the name of the shop you buy this product from (for example SelfShop).');
        return;
      }
      const badLink = [supplierLinkUsed, ...Object.values(colorLinks), ...Object.values(colorAltLinks).flat().map((x) => x.link)].find((u) => u && !/^https?:\/\//i.test(u));
      if (badLink) {
        alert('Supplier details: every product link must start with http:// or https://');
        return;
      }
      const worstCost = Math.max(supplierCost, ...Object.values(colorCosts));
      if (worstCost > (parseFloat(newProductForm.price) || 0) && !(await askConfirm(`Your selling price (${newProductForm.price}) is LOWER than the supplier price (${worstCost}). You will lose money on every sale. Save anyway?`))) return;
    }

    const productData = {
      id: editingProductId || Date.now(),
      name: newProductForm.name,
      category: newProductForm.category,
      gender: newProductForm.gender,
      alsoShowIn: hasSubCategories(newProductForm.gender) ? (newProductForm.alsoShowIn || []).filter((k) => String(k).includes(':') && k !== `${newProductForm.gender}:${newProductForm.category}`) : [],
      price: parseFloat(newProductForm.price) || 0,
      originalPrice: parseFloat(newProductForm.originalPrice) || 0,
      stockText: String(newProductForm.stockText || '').trim().slice(0, 40),
      image: mainImage,
      images: [mainImage, ...extraList],
      description: newProductForm.description,
      colors: colorList,
      sizes: hasSizes ? sizeNames : ["Standard"],
      ...(hasSizes ? { sizeStock } : {}),
      ...(perColor ? { colorStock } : {}),
      ...(() => {
        const ci = {};
        for (const c of colorList) { const u = (newProductForm.colorImages || {})[c]; if (u) ci[c] = u; }
        return Object.keys(ci).length ? { colorImages: ci } : {};
      })(),
      ...(Object.keys(colorGalleryOut).length ? { colorGallery: colorGalleryOut } : {}),
      stock,
      isNew: newProductForm.isNew,
      isFeatured: newProductForm.isFeatured,
      isBestSeller: newProductForm.isBestSeller,
      // Who added this product (stays the same when edited)
      addedBy: existingProduct ? existingProduct.addedBy : String(loggedInUserEmail || '').toLowerCase(), // the rules check it is your own email
      addedByName: existingProduct ? existingProduct.addedByName : (adminName || loggedInUserEmail),
      addedByRole: existingProduct ? existingProduct.addedByRole : adminRole,
      // New products from an Admin or Manager wait for the Owner's approval; Owner products go live at once.
      // Editing keeps the current status.
      status: existingProduct ? (existingProduct.status || 'approved') : (isCloud && adminRole !== 'owner' ? 'pending' : 'approved'),
      // pieces sold so far must survive an edit
      ...(existingProduct && existingProduct.sold ? { sold: existingProduct.sold } : {}),
      // a waiting delete request must survive an edit
      ...(existingProduct && existingProduct.deleteRequested ? {
        deleteRequested: true,
        deleteRequestedBy: existingProduct.deleteRequestedBy || '',
        deleteRequestedByName: existingProduct.deleteRequestedByName || '',
        deleteRequestedAt: existingProduct.deleteRequestedAt || ''
      } : {})
    };

    try {
      if (isCloud) {
        await saveProduct(productData);
      } else if (editingProductId) {
        setLocalProducts(localProducts.map(p => p.id === editingProductId ? productData : p));
      } else {
        setLocalProducts([productData, ...localProducts]);
      }
    } catch (err) {
      console.error(err);
      alert('Could not save the product: ' + (err.code === 'permission-denied' ? 'you do not have permission (check the Firestore rules).' : err.message));
      return;
    }
    // Save (or clear) the private supplier details in their own admin-only collection
    try {
      if (hasSupplier) await saveProductCost(productData.id, { supplierName, supplierCost, supplierLink: supplierLinkUsed, colorLinks, colorCosts, colorAltLinks, extraSuppliers }, { email: loggedInUserEmail });
      else if (editingProductId && productCosts[String(editingProductId)]) await removeProductCost(productData.id);
    } catch (err) {
      console.error(err);
      alert('The product was saved, but the supplier details could NOT be saved: ' + (err.code === 'permission-denied' ? 'publish the latest Firestore rules (productCosts), then edit the product and save again.' : err.message));
    }
    // Team commission % for this product: only the Owner can set or change it.
    // The profit per piece is saved with it (Owner or Manager) so an Admin can see what they earn without seeing the supplier price.
    if (adminRole === 'owner' || adminRole === 'manager') {
      try {
        const existing = productCommissions[String(productData.id)];
        const pct = adminRole === 'owner' ? Math.min(MAX_COMMISSION, Math.max(0, parseFloat(newProductForm.commission) || 0)) : (existing ? Number(existing.pct) : 0);
        if (pct > 0 || existing) {
          const colorProfit = {};
          Object.entries(colorCosts).forEach(([c, n]) => { colorProfit[c] = productData.price - Number(n); });
          await setProductCommission(productData.id, pct, hasSupplier ? { profit: productData.price - supplierCost, colorProfit } : {});
        }
      } catch (err) { console.error(err); alert('The product was saved, but the commission could NOT be saved: ' + (err.code === 'permission-denied' ? 'publish the latest Firestore rules (productCommission), then edit the product and save again.' : err.message)); }
    }
    if (editingProductId) setEditingProductId(null);
    const wentPending = productData.status === 'pending';

    if (supplierName) { try { localStorage.setItem(LAST_SHOP_KEY, supplierName); } catch { /* ignore */ } }
    setNewProductForm(freshProductForm());
    alert(wentPending ? 'Product saved. It is waiting for approval by the Owner or a Manager, then customers will see it.' : 'Product saved successfully!');
  };

  const startEditProduct = (prod) => {
    if (!canEditProduct(prod)) { alert('Only the Owner or the person who added this product can edit it.'); return; }
    // Older products without per-size stock: share the stock evenly so the admin can adjust it
    let sizeStock = {};
    if (hasSizeStock(prod)) {
      Object.entries(prod.sizeStock).forEach(([size, qty]) => { sizeStock[size] = String(qty); });
    } else {
      const real = (Array.isArray(prod.sizes) ? prod.sizes : []).filter(sz => !['Standard', 'One Size'].includes(sz));
      if (real.length > 0) {
        const total = parseInt(prod.stock, 10) || 0;
        const each = Math.floor(total / real.length);
        real.forEach((sz, i) => { sizeStock[sz] = String(i === 0 ? total - each * (real.length - 1) : each); });
      }
    }
    const colorStock = {};
    if (hasColorStock(prod)) Object.entries(prod.colorStock).forEach(([k, n]) => { colorStock[k] = String(n); });
    const sup = productCosts[String(prod.id)] || {};
    setEditingProductId(prod.id);
    setNewProductForm({
      name: prod.name,
      gender: prod.gender || 'Men',
      category: (prod.gender === 'Women' && prod.category === 'Jacket') ? 'Ladies Jacket' : prod.category,
      price: prod.price,
      originalPrice: prod.originalPrice || '',
      stockText: prod.stockText || '',
      image: prod.image,
      description: prod.description,
      colors: (prod.colors || []).join(', '),
      sizeStock,
      colorStock,
      colorImages: { ...(prod.colorImages || {}) },
      colorGallery: { ...(prod.colorGallery || {}) },
      extraImages: (Array.isArray(prod.images) ? prod.images : []).filter((u) => u && u !== prod.image && !Object.values(prod.colorImages || {}).includes(u)),
      trackColors: hasColorStock(prod),
      stock: prod.stock,
      isNew: prod.isNew,
      isFeatured: prod.isFeatured,
      isBestSeller: prod.isBestSeller,
      supplierName: sup.supplierName || '',
      supplierCost: sup.supplierCost === undefined ? '' : String(sup.supplierCost),
      commission: productCommissions[String(prod.id)] ? String(productCommissions[String(prod.id)].pct) : '',
      supplierLink: sup.supplierLink || '',
      linkPerColor: !!(sup.colorLinks && Object.keys(sup.colorLinks).length),
      colorLinks: { ...(sup.colorLinks || {}) },
      colorCosts: Object.fromEntries(Object.entries(sup.colorCosts || {}).map(([c, n]) => [c, String(n)])),
      alsoShowIn: Array.isArray(prod.alsoShowIn) ? prod.alsoShowIn.map((k) => (k === 'Men' ? 'Men:Jacket' : k === 'Women' ? 'Women:Ladies Jacket' : k)) : [],
      colorAltLinks: Object.fromEntries(Object.entries(sup.colorAltLinks || {}).map(([c, arr]) => [c, (Array.isArray(arr) ? arr : []).map((x) => ({ link: x.link || '', cost: x.cost === undefined || x.cost === null ? '' : String(x.cost) }))])),
      extraSuppliers: (Array.isArray(sup.extraSuppliers) ? sup.extraSuppliers : []).map((x) => ({ name: x.name || '', cost: x.cost === undefined ? '' : String(x.cost), link: x.link || '' }))
    });
    setAdminTab('add-product');
  };

  // Only the Owner, the person who added the product, or someone the Owner gave "edit all products" can edit it
  const canEditProduct = (p) => adminRole === 'owner' || adminEditAll || (!!p.addedBy && p.addedBy.toLowerCase() === (loggedInUserEmail || '').toLowerCase());

  // Owner can delete everything, Manager only products they added, Admin none
  const canDeleteProduct = (p) => {
    if (adminRole === 'owner') return true;
    const mine = !!p.addedBy && p.addedBy.toLowerCase() === (loggedInUserEmail || '').toLowerCase();
    // Manager: own products, or a pending product from an Admin (rejecting it). Admin: own products only.
    if (adminRole === 'manager' || adminCanApprove) return mine || !isApproved(p);
    if (adminRole === 'admin') return mine;
    return false;
  };
  const canAddProduct = adminRole === 'owner' || adminAddProducts;
  const canApproveProduct = (p) => isCloud && !isApproved(p) && (adminRole === 'owner' || adminCanApprove);
  const handleApproveProduct = async (p) => {
    try {
      await approveProduct(p, { email: loggedInUserEmail, name: adminName });
    } catch (err) {
      alert('Could not approve: ' + (err.code === 'permission-denied' ? 'you do not have permission (check the Firestore rules).' : err.message));
    }
  };
  const deleteProduct = async (id) => {
    const target = products.find(p => p.id === id);
    if (!target || !canDeleteProduct(target)) {
      alert('You do not have permission to delete this product.');
      return;
    }
    // Manager / Admin: a live product is not deleted at once, the Owner has to confirm first
    if (isCloud && adminRole !== 'owner' && isApproved(target)) {
      if (target.deleteRequested) return;
      if ((await askConfirm('This product is live on the shop. A delete request will be sent to the Owner, and it stays on the shop until the Owner confirms. Send the request?'))) {
        try {
          await requestProductDelete(id, { email: loggedInUserEmail, name: adminName });
          alert('Delete request sent to the Owner.');
        } catch (err) {
          alert('Could not send the request: ' + (err.code === 'permission-denied' ? 'you do not have permission (check the Firestore rules).' : err.message));
        }
      }
      return;
    }
    if ((await askConfirm('Are you sure you want to delete this product?'))) {
      try {
        if (isCloud) await removeProduct(id);
        else setLocalProducts(localProducts.filter(p => p.id !== id));
      } catch (err) {
        alert('Could not delete the product: ' + (err.code === 'permission-denied' ? 'you do not have permission.' : err.message));
      }
    }
  };

  // Owner answers a delete request
  const handleDeleteRequest = async (p, approve) => {
    if (adminRole !== 'owner') return;
    const who = p.deleteRequestedByName || p.deleteRequestedBy || 'a team member';
    if (!(await askConfirm(approve ? `Delete "${p.name}" permanently? (requested by ${who})` : `Keep "${p.name}" and reject the request from ${who}?`))) return;
    try {
      if (approve) await removeProduct(p.id); else await rejectProductDelete(p.id);
    } catch (err) {
      alert('Could not do that: ' + (err.code === 'permission-denied' ? 'you do not have permission (check the Firestore rules).' : err.message));
    }
  };

  const filteredProducts = storefrontProducts.filter(p => {
    let matchesCategory = true;
    if (hasSubCategories(selectedCategory)) {
      // Men: Shirt & Punjabi by default, Women: Sharee by default, or the chosen sub-category
      matchesCategory = matchesCollectionPage(p, selectedCategory, selectedSubCategory);
    } else if (selectedCategory === 'Shoes') {
      matchesCategory = p.category === 'Shoes' || p.gender === 'Shoes';
    } else if (selectedCategory === 'Wallets') {
      matchesCategory = p.category === 'Wallets' || p.gender === 'Wallets';
    } else if (selectedCategory === 'Watches') {
      matchesCategory = p.category === 'Watches' || p.gender === 'Watches';
    } else if (selectedCategory !== 'All') {
      matchesCategory = p.category.toLowerCase() === selectedCategory.toLowerCase();
    }
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = p.price <= priceFilter;
    return matchesCategory && matchesSearch && matchesPrice;
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'newest') return b.id - a.id;
    // default: best selling first, then the newest product
    return ((parseInt(b.sold, 10) || 0) - (parseInt(a.sold, 10) || 0)) || ((Number(b.id) || 0) - (Number(a.id) || 0));
  });


  // Maintenance mode (Owner switch in Admin > Store Settings): visitors see the whole website but cannot order.
  const maintenanceOn = storeSettings.maintenanceMode === true;

  return (
    <div data-theme={activeTheme.theme} className={`min-h-screen flex flex-col font-sans relative transition-colors duration-300 overflow-x-clip ${isDarkMode ? 'bg-[#0f0f0f] text-gray-100' : activeTheme.theme === 'boutique' ? 'bg-[#FBF7F0] text-gray-900' : 'bg-white text-gray-900'}`}>

      {maintenanceOn && (
        <div className="bg-amber-500 text-black text-center text-xs sm:text-sm font-semibold py-2.5 px-3">
          {isAdminLoggedIn
            ? 'Maintenance mode is ON: visitors can browse and add to cart, but checkout is locked (they can still order on WhatsApp). You can still test-order as a team member.'
            : "Maintenance mode ON - ordering is paused for a little while. You can add items to your cart and pay when we are back, or order on WhatsApp. (ওয়েবসাইটে কাজ চলছে, অর্ডার সাময়িক বন্ধ।)"}
        </div>
      )}

      {/* 1. ANNOUNCEMENT BAR */}
      <AnnouncementBar announcementText={announcementText} speed={storeSettings.bannerSpeed} isDarkMode={isDarkMode} />

      {currentView !== 'home' && <BackButton onClick={goBack} />}

      {/* 2. HEADER */}
      <Header shopBrand={shopBrand} winterNav={!!shopCtx && navHas('Winter')} onStartSelling={sellAction} sellLabel={sellLabel} onAdminPanel={isAdminLoggedIn ? () => setCurrentView('admin') : null} cart={cart} curr={curr} currencyKey={currencyKey} currentView={currentView} isDarkMode={isDarkMode} setCurrencyKey={setCurrencyKey} setCurrentView={setCurrentView} setIsCartOpen={setIsCartOpen} setIsDarkMode={setIsDarkMode} setIsMobileMenuOpen={setIsMobileMenuOpen} setSelectedCategory={selectCategory} navHas={navHas} customerUser={customerUser} displayName={displayName} photoURL={photoURL} goAccount={goAccount} onSignIn={handleCustomerSignIn} onSignOut={handleCustomerSignOut} />
      {/* a shop link: who sells it (a public seller is not Kyvro itself), Verified for Premium, the Pro / Premium page
          extras (tagline, contact, about, social links) and the Premium ones (announcement, brand color, top picks) */}
      {shopPreview && currentView !== 'admin' && (
        <div className="px-4 py-2.5 text-center text-xs font-semibold bg-amber-500 text-black" role="status">
          Preview: this shop is not live yet{shopRaw.status === 'pending' ? ' (waiting for Kyvro\'s approval)' : shopRaw.killed ? ' (switched off by Kyvro)' : shopRaw.inactiveHold ? ' (hidden: the seller was inactive)' : shopRaw.active === false ? ' (switched off)' : basicDue(shopRaw, plans) ? ' (the Basic plan is not paid yet: pay it in your seller dashboard to open the store)' : ' (hidden: the paid plan has ended)'}. Only you can see it; customers get "page not found".
          {/* what to do next: the team switches it on / reviews it; the shop's owner pays, renews or asks Kyvro */}
          {(() => {
            const btn = 'ml-2 mt-1.5 sm:mt-0 inline-flex items-center px-3 py-1 rounded-full bg-black text-[#D4AF37] font-bold hover:opacity-90';
            const off = shopRaw.killed || shopRaw.inactiveHold || shopRaw.active === false;
            const pending = shopRaw.status === 'pending';
            const goAdmin = (tab) => { setAdminTab(tab); setCurrentView('admin'); window.scrollTo(0, 0); };
            if (isAdminLoggedIn) {
              if (pending) return <button type="button" onClick={() => goAdmin(shopRaw.kind === 'seller' ? 'sellers' : 'my-shop')} className={btn}>Review it</button>;
              if (off && adminRole === 'owner') {
                return <button type="button" onClick={async () => { if (!(await askConfirm(`Switch "${shopRaw.name || shopRaw.slug}" on? Customers can open it again.`, { confirmText: 'Switch on' }))) return; try { await turnShopOn(shopRaw.slug); } catch (e) { alert(e.message); } }} className={btn}>Switch shop on</button>;
              }
              if (off) return <button type="button" onClick={() => goAdmin(adminRole === 'manager' ? 'plan-members' : 'my-shop')} className={btn}>Open shop settings</button>;
              return null;
            }
            // the shop's own owner (a seller): switched off or hidden for inactivity -> they switch it on themselves (then
            // Basic must be paid if it is charged; an ended Pro / Premium runs as Basic). Killed (Page off): ask Kyvro.
            if (off && !shopRaw.killed && !pending) {
              return <button type="button" onClick={async () => { try { await setMyShopLive(shopRaw.slug, true); } catch (e) { alert(e.code === 'permission-denied' ? 'Could not switch it on. Please contact Kyvro.' : e.message); } }} className={btn}>Switch my shop on</button>;
            }
            if (basicDue(shopRaw, plans) || (!off && !pending)) return <button type="button" onClick={() => { setSellPlan(''); goAccount('sell'); window.scrollTo(0, 0); }} className={btn}>{basicDue(shopRaw, plans) ? 'Pay Basic' : 'Renew plan'}</button>;
            if (pending) return <button type="button" onClick={() => { setSellPlan(''); goAccount('sell'); window.scrollTo(0, 0); }} className={btn}>Open my dashboard</button>;
            const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Kyvro, my shop ${shopRaw.name || ''} (${window.location.origin}/${shopLinkKey(shopRaw)}) is switched off. Please switch it on. / আমার শপটি বন্ধ আছে, দয়া করে চালু করে দিন।`)}`;
            return <a href={wa} target="_blank" rel="noopener noreferrer" className={btn}>Ask Kyvro to switch it on</a>;
          })()}
        </div>
      )}
      {/* the team and the shop's own owner can leave the shop link and go back to the main store (customers stay in the shop,
          so the seller keeps the sale) */}
      {shopCtx && currentView !== 'admin' && (isAdminLoggedIn || (!!customerUser && customerUser.uid === shopCtx.ownerUid)) && (
        <div className={`px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs ${isDarkMode ? 'bg-[#1a1a1a] text-gray-300' : 'bg-gray-900 text-gray-200'}`}>
          <span>You are on the shop link of <strong className="text-white">{shopDisplayName(shopCtx, shopFeat)}</strong>.</span>
          <button type="button" onClick={() => { try { sessionStorage.removeItem('kyvro_shop'); } catch (e) { /* ignore */ } window.location.href = '/'; }}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#D4AF37] text-[#D4AF37] font-bold hover:bg-[#D4AF37] hover:text-black transition">
            ← Kyvro main site
          </button>
        </div>
      )}
      {shopCtx && currentView !== 'admin' && (() => {
        const ex = shopExtrasOf(shopCtx);
        const f = shopFeat;
        const accent = f.brandColor ? brandHex(ex.brandColor) : '#D4AF37';
        const seller = shopCtx.kind === 'seller';
        const socials = f.social ? SOCIALS.filter((x) => httpsLinkOk(ex.socialLinks[x.key]) && ex.socialLinks[x.key]) : [];
        const showContact = f.tagline && ex.contactUrl && contactOk(ex.contactUrl);
        const picks = f.pinned ? ex.pinnedItems.map((id) => storefrontProducts.find((x) => String(x.id) === id)).filter(Boolean) : [];
        const showTagline = f.tagline && ex.tagline;
        const showAbout = f.about && ex.about;
        const showAnn = f.announcement && ex.announcement;
        const showBanner = f.banner && shopCtx.banner;
        // seller shops: no "Sold by" line (the shop name is in the header); only a Verified (Premium) shop shows its name + badge
        const verified = seller && f.verified && !shopCtx.planExempt;
        const showName = !seller || verified;
        const showInfo = showName || showTagline || showAbout || showContact || socials.length > 0 || picks.length > 0;
        if (!showInfo && !showAnn && !showBanner) return null;
        return (
          <>
            {showBanner && <img src={shopCtx.banner} alt={`${shopDisplayName(shopCtx, f)} banner`} className="w-full max-h-56 sm:max-h-72 object-cover" />}
            {showAnn && <div className="px-4 py-2 text-center text-xs font-semibold text-white" style={{ background: accent }}>{ex.announcement}</div>}
            {showInfo && <div className={`border-b px-4 py-3 text-center text-xs space-y-1.5 ${isDarkMode ? 'bg-[#121212] border-gray-800 text-gray-300' : 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-gray-700'}`}>
              {showName && (
                <p>
                  <strong style={{ color: accent }}>{shopDisplayName(shopCtx, f)}</strong>
                  {verified && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold align-middle" style={{ background: accent }}>✓ Verified</span>}
                </p>
              )}
              {showTagline && <p className="italic">{ex.tagline}</p>}
              {showAbout && <p className="max-w-2xl mx-auto text-gray-500">{ex.about}</p>}
              {(showContact || socials.length > 0) && (
                <p className="flex flex-wrap items-center justify-center gap-2">
                  {showContact && <a href={contactHref(ex.contactUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 rounded-full text-white font-semibold" style={{ background: accent }}>{contactLabel(ex.contactUrl)}</a>}
                  {socials.map((x) => <a key={x.key} href={ex.socialLinks[x.key]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 rounded-full border font-semibold" style={{ borderColor: accent, color: accent }}>{x.label}</a>)}
                </p>
              )}
              {picks.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Top picks</p>
                  <div className="mt-1.5 flex justify-center gap-3 overflow-x-auto">
                    {picks.map((p) => (
                      <button key={p.id} type="button" onClick={() => { setSelectedProduct(p); setCurrentView('product-detail'); window.scrollTo(0, 0); }} className="w-24 shrink-0 text-left">
                        {p.image && <img src={p.image} alt="" className="w-24 h-24 object-cover rounded border" style={{ borderColor: accent }} />}
                        <span className="block mt-1 text-[11px] font-semibold truncate">{p.name}</span>
                        <span className="block text-[11px]" style={{ color: accent }}>{formatPrice(p.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>}
          </>
        );
      })()}

      {/* MOBILE MENU DRAWER */}
      {isMobileMenuOpen && <MobileMenu navHas={navHas} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} setCurrentView={setCurrentView} setIsMobileMenuOpen={setIsMobileMenuOpen} setSelectedCategory={selectCategory} />}

      {/* CART SLIDE-OVER DRAWER */}
      {quickAdd && <QuickAdd product={quickAdd.product} goCheckout={quickAdd.goCheckout} onConfirm={confirmQuickAdd} onClose={() => setQuickAdd(null)} formatPrice={formatPrice} isDarkMode={isDarkMode} />}
      {isCartOpen && <CartDrawer storeSettings={storeSettings} cart={cart} formatPrice={formatPrice} isDarkMode={isDarkMode} removeFromCart={removeFromCart} setCurrentView={setCurrentView} setIsCartOpen={setIsCartOpen} subtotal={subtotal} discount={discount} discountLabel={discountLabel} reward={reward} updateCartQty={updateCartQty} />}

      <Suspense fallback={<PageLoading />}>
      {/* HOME VIEW */}
      {currentView === 'home' && pathNotFound && (
        <div className="w-full max-w-xl mx-auto px-4 py-24 text-center">
          <p className="text-6xl font-extrabold text-[#D4AF37]">404</p>
          <h1 className="mt-3 text-xl font-bold">This page was not found</h1>
          <p className="mt-2 text-sm text-gray-500">There is no shop at kyvro.store/{pathShop}, or the shop is switched off right now.</p>
          <a href="/" className="mt-6 inline-flex px-6 py-3 rounded-full bg-gradient-to-b from-[#E9CB6B] via-[#D4AF37] to-[#B8921F] text-black text-xs font-bold uppercase tracking-widest">Go to Kyvro</a>
        </div>
      )}
      {currentView === 'home' && !pathNotFound && <HomeView theme={activeTheme.theme} brandName={shopBrand ? shopBrand.name : 'Kyvro'} requestAdd={requestAdd} addToCart={addToCart} banners={banners} calculateDiscountPercent={calculateDiscountPercent} currentBannerIndex={currentBannerIndex} formatPrice={formatPrice} isDarkMode={isDarkMode} products={storefrontProducts} hideEmptyCategories={!!shopCtx} setCurrentBannerIndex={setCurrentBannerIndex} setCurrentView={setCurrentView} setSelectedCategory={selectCategory} setSelectedProduct={setSelectedProduct} savedIds={savedIds} toggleSaved={toggleSaved} />}

      {/* SHOP CATALOG VIEW */}
      {currentView === 'shop' && <ShopView selectedSubCategory={selectedSubCategory} setSelectedSubCategory={setSelectedSubCategory} requestAdd={requestAdd} addToCart={addToCart} filteredProducts={filteredProducts} formatPrice={formatPrice} isDarkMode={isDarkMode} products={storefrontProducts} searchQuery={searchQuery} selectedCategory={selectedCategory} setCurrentView={setCurrentView} setSearchQuery={setSearchQuery} setSelectedCategory={selectCategory} setSelectedProduct={setSelectedProduct} setSortBy={setSortBy} sortBy={sortBy} savedIds={savedIds} toggleSaved={toggleSaved} />}

      {currentView === 'product-detail' && selectedProduct && <ProductDetail key={selectedProduct.id} product={selectedProduct} products={storefrontProducts} setSelectedProduct={setSelectedProduct} storeSettings={storeSettings} cartSubtotal={subtotal} cartUnits={cart.reduce((n, i) => n + (parseInt(i.quantity, 10) || 0), 0)} addToCart={addToCart} calculateDiscountPercent={calculateDiscountPercent} formatPrice={formatPrice} isDarkMode={isDarkMode} setCurrentView={setCurrentView} savedIds={savedIds} toggleSaved={toggleSaved} teamShop={isAdminLoggedIn && shopCtx ? shopDisplayName(shopCtx) : ''} />}

      {currentView === 'tracking' && <OrderTracking customerUser={customerUser} onSignIn={handleCustomerSignIn} formatPrice={formatPrice} isDarkMode={isDarkMode} setCurrentView={setCurrentView} />}
      {currentView === 'pricing' && (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <SellPricing formatPrice={formatPrice} isDarkMode={isDarkMode} onChoose={choosePlan} busy={pricingBusy} />
          <p className="mt-8 text-center text-xs text-gray-500">{customerUser ? `Signed in as ${customerUser.email}.` : 'Choose a plan, then sign in with Google to apply.'}</p>
        </div>
      )}
      {currentView === 'account' && <AccountView sellPlan={sellPlan} products={products} isStaff={isAdminLoggedIn} customerUser={customerUser} displayName={displayName} photoURL={photoURL} activeTab={accountTab} setActiveTab={setAccountTab} onSignIn={handleCustomerSignIn} onSignOut={handleCustomerSignOut} onSaveProfile={handleSaveProfile} onCancelOrder={handleCancelMyOrder} myOrders={myOrders} savedProducts={savedProducts} toggleSaved={toggleSaved} formatPrice={formatPrice} isDarkMode={isDarkMode} setCurrentView={setCurrentView} setSelectedProduct={setSelectedProduct} />}

      {/* CHECKOUT (guest checkout, no login needed) */}
      {currentView === 'checkout' && <CheckoutView storeSettings={storeSettings} cart={cart} checkoutForm={checkoutForm} setCheckoutForm={setCheckoutForm} checkoutError={checkoutError} deliveryCharge={deliveryCharge} grandTotal={grandTotal} formatPrice={formatPrice} handleCheckoutSubmit={handleCheckoutSubmit} isDarkMode={isDarkMode} placingOrder={placingOrder} removeFromCart={removeFromCart} updateCartQty={updateCartQty} setCurrentView={setCurrentView} subtotal={subtotal} discount={discount} discountLabel={discountLabel} reward={reward} customerUser={customerUser} authReady={authReady} onSignIn={handleCustomerSignIn} couponsOn={couponsOn} couponCode={couponCode} couponAmount={couponAmount} couponPercent={appliedCoupon ? appliedCoupon.percent : 0} couponMsg={couponMsg} onApplyCoupon={applyCoupon} />}

      {/* ORDER CONFIRMATION */}
      {['privacy', 'terms', 'refund'].includes(currentView) && <PolicyPages page={currentView} isDarkMode={isDarkMode} setCurrentView={setCurrentView} />}
      {currentView === 'payment-result' && payResult && <PaymentResult result={payResult} isDarkMode={isDarkMode} setCurrentView={setCurrentView} />}
      {currentView === 'order-success' && <OrderSuccess payNotice={payNotice} order={orderCompleteData} formatPrice={formatPrice} isDarkMode={isDarkMode} setCurrentView={setCurrentView} />}

      {/* ADMIN PORTAL VIEW (GOOGLE SIGN-IN, WHITELISTED EMAILS ONLY) */}
      {currentView === 'admin' && <AdminPortal adminCanCreateShop={adminCanCreateShop} adminTab={adminTab} deleteProduct={deleteProduct} editingProductId={editingProductId} formatPrice={formatPrice} handleAdminLogout={handleAdminLogout} handleEmailSignIn={handleEmailSignIn} handleGenderChange={handleGenderChange} handleGoogleSignIn={handleGoogleSignIn} handleSaveProduct={handleSaveProduct} isAdminLoggedIn={isAdminLoggedIn} isDarkMode={isDarkMode} adminRole={adminRole} adminName={adminName} canDeleteProduct={canDeleteProduct} canEditProduct={canEditProduct} canAddProduct={canAddProduct} shopOwners={shopOwners} productCommissions={productCommissions} canApproveProduct={canApproveProduct} handleApproveProduct={handleApproveProduct} pendingCount={pendingCount} loggedInUserEmail={loggedInUserEmail} newProductForm={newProductForm} orders={orders} productCosts={productCosts} products={products} storeSettings={storeSettings} isCloud={isCloud} migrating={migrating} handleMigrateProducts={handleMigrateProducts} setAdminTab={setAdminTab} setEditingProductId={setEditingProductId} setNewProductForm={setNewProductForm} startEditProduct={startEditProduct} handleDeleteRequest={handleDeleteRequest} clearProductForm={() => { setEditingProductId(null); setNewProductForm(freshProductForm()); }} />}
      </Suspense>

      {/* FOOTER */}
      <PushPrompt customerUser={customerUser} isDarkMode={isDarkMode} />
      <AlertCenter isDarkMode={isDarkMode} />
      {/* While the order is saved and the payment page is opened: one clean screen instead of a blank page in between */}
      {placingOrder && (
        <div className={`fixed inset-0 z-[300] flex flex-col items-center justify-center gap-5 px-6 text-center ${isDarkMode ? 'bg-[#0b0b0b] text-white' : 'bg-white text-gray-900'}`} role="status" aria-live="polite">
          <div className="h-14 w-14 rounded-full border-4 border-[#D4AF37]/25 border-t-[#D4AF37] animate-spin" />
          <div>
            <p className="text-lg font-serif font-bold">Securing your order...</p>
            <p className="text-sm text-gray-500 mt-1">Opening the secure payment page. Please do not close or go back.</p>
            <p className="text-sm text-gray-500">সিকিউর পেমেন্ট পেজ খুলছে, একটু অপেক্ষা করুন।</p>
          </div>
        </div>
      )}
      {/* home page of the main store only: Premium sellers' shops ("Featured on Kyvro") */}
      {currentView === 'home' && !shopKey && <FeaturedShops plans={plans} products={shopProducts} isDarkMode={isDarkMode} formatPrice={formatPrice} />}
      {/* home page of the main store only (not on a shop link): invite visitors to sell */}
      {currentView === 'home' && !shopKey && (
        <section className={`border-t ${isDarkMode ? 'bg-[#0d0d0d] border-gray-800' : 'bg-[#111] border-gray-800'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="text-lg sm:text-xl font-bold text-white">Start your own business with <span className="text-[#D4AF37]">Kyvro · কাইভ্রো</span></p>
              <p className="text-sm text-gray-400 mt-1">Free 10 products, no investment. We deliver, you earn the markup.</p>
            </div>
            <button type="button" onClick={sellAction} className="shrink-0 w-full sm:w-auto bg-gradient-to-b from-[#E9CB6B] via-[#D4AF37] to-[#B8921F] text-black font-bold px-8 py-3 rounded text-xs uppercase tracking-widest shadow hover:opacity-90 transition">{hasMyShop ? 'My Shop' : 'Start selling'}</button>
          </div>
        </section>
      )}
      <Footer onStartSelling={sellAction} sellLabel={sellLabel} navHas={navHas} isDarkMode={isDarkMode} setCurrentView={setCurrentView} setSelectedCategory={selectCategory} customerUser={customerUser} onSignIn={handleCustomerSignIn} goAccount={goAccount} />

    </div>
  );
}
