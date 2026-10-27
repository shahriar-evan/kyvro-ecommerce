import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, googleProvider } from './firebase';
import { isOwnerEmail } from './adminEmails';
import { getAdminStatus, watchAdminAccess } from './adminAuth';
import { placeOrder, watchOrders, cancelMyOrder } from './orders';
import { watchProfile, saveProfile, watchMyOrders } from './customerData';
import { ensureSubscribed } from './subscribers';
import { watchProducts, saveProduct, removeProduct, requestProductDelete, rejectProductDelete, approveProduct, migrateProducts } from './productsStore';
import { watchStoreSettings } from './storeSettings';
import { cleanPhone, DELIVERY_AREAS, deliveryFee, paymentStatusFor, DEFAULT_STORE_SETTINGS, bestDiscount, nextReward, describeRule } from './data/shopConfig';
import { INITIAL_PRODUCTS } from './data/products';
import { CURRENCIES } from './data/currencies';
import { defaultCategoryFor, matchesCollectionPage, hasSizeStock, stockForSize, orderedSizes, hasColorStock, stockFor, variantKey, needsChoice, imageFor } from './data/catalog';
import QuickAdd from './components/QuickAdd';
import heroBannerImg from './assets/hero-banner.png';
import coverPhoto1Img from './assets/cover_photo1.png';
import men_womenImg from './assets/men_women.png';
import women_bannerImg from './assets/women_banner.png';
import styleImg from './assets/style.png';
import punjabi_shirtImg from './assets/punjabi_shirt.png';
import shirtImg from './assets/shirts.png';
import punjabiImg from './assets/punjabi.png';
import sneakersImg from './assets/Snekers.png';
import AnnouncementBar from './components/AnnouncementBar';
import Header from './components/Header';
import MobileMenu from './components/MobileMenu';
import CartDrawer from './components/CartDrawer';
import HomeView from './components/HomeView';
import ShopView from './components/ShopView';
import AdminPortal from './components/AdminPortal';
import Footer from './components/Footer';
import CheckoutView from './components/CheckoutView';
import PolicyPages from './components/PolicyPages';
import OrderSuccess from './components/OrderSuccess';
import ProductDetail from './components/ProductDetail';
import AccountView from './components/AccountView';

const EMPTY_CHECKOUT = {
  fullName: '', phone: '', address: '', notes: '',
  district: '', upazila: '', area: '', deliveryArea: '', paymentMethod: 'Cash on Delivery', agree: false
};

const EMPTY_PRODUCT_FORM = {
  name: '', gender: 'Men', category: 'Shirt', price: '', originalPrice: '', image: '', description: '',
  colors: 'Matte Black, Charcoal', sizeStock: {}, colorStock: {}, colorImages: {}, trackColors: false, stock: '10', isNew: true, isFeatured: false, isBestSeller: false
};

export default function App() {
  // Products: Firestore ("cloud") once the Owner has moved them there, until then this browser's saved list
  const [localProducts, setLocalProducts] = useState(() => {
    const saved = localStorage.getItem('kyvro_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [cloudProducts, setCloudProducts] = useState(null); // null = not in Firestore yet
  const isCloud = cloudProducts !== null;
  const products = isCloud ? cloudProducts : localProducts;
  // Customers only see approved products (an Admin's new product waits for Owner / Manager approval)
  const isApproved = (p) => (p.status || 'approved') === 'approved';
  const shopProducts = products.filter(isApproved);
  const pendingCount = products.filter(p => !isApproved(p)).length;

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('kyvro_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState([]); // live from Firestore (team members only)

  // Customer account (Google sign-in). Team members who sign in this way are also recognised as team below.
  const [customerUser, setCustomerUser] = useState(null);
  const [authReady, setAuthReady] = useState(false); // true once Firebase has told us whether someone is signed in
  const [profile, setProfile] = useState({});
  const [myOrders, setMyOrders] = useState([]);
  const [accountTab, setAccountTab] = useState('orders');
  const displayName = profile.name || (customerUser && customerUser.displayName) || '';
  const photoURL = profile.photoURL !== undefined && profile.photoURL !== '' ? profile.photoURL : ((customerUser && customerUser.photoURL) || '');
  const savedIds = Array.isArray(profile.saved) ? profile.saved : [];

  // Banner text + discount rules: edited by the Owner in the admin panel (Firestore settings/store)
  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETTINGS);
  const announcementText = storeSettings.announcementText;
  const [currencyKey, setCurrencyKey] = useState("BDT");
  const curr = CURRENCIES[currencyKey];


  const [currentView, setCurrentView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState(null); // null = default view of the collection
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Choosing a collection always starts at its default view
  const selectCategory = (category) => {
    setSelectedCategory(category);
    setSelectedSubCategory(null);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [priceFilter, setPriceFilter] = useState(15000);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const banners = [coverPhoto1Img, men_womenImg, women_bannerImg, styleImg, punjabi_shirtImg, shirtImg, punjabiImg, sneakersImg];
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Every slide stays exactly 5 seconds. The timer restarts after each change (also after a click on a dot)
  // and only runs while the home page is open, so the first photo is never cut short.
  const BANNER_SECONDS = 5;
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
  const [loggedInUserEmail, setLoggedInUserEmail] = useState('');
  const [adminRole, setAdminRole] = useState(null); // 'owner' | 'manager' | 'admin' | null
  const [adminName, setAdminName] = useState('');
  const [adminTab, setAdminTab] = useState('products');

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
        return;
      }
      // Everyone who signs in is a customer; team members are recognised on top of that
      setCustomerUser({ uid: user.uid, email: user.email || '', displayName: user.displayName || '', photoURL: user.photoURL || '' });
      // offer emails: a signed-in customer joins the list once (they can switch it off in Account -> Settings)
      if (user.email && user.emailVerified) ensureSubscribed(user).catch(() => {});
      const access = await checkAccess(user.email);
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
    });
    return () => unsubscribe();
  }, []);

  // While logged in, access OFF / removal / role changes by the Owner apply immediately
  useEffect(() => {
    if (!isAdminLoggedIn || !loggedInUserEmail || isOwnerEmail(loggedInUserEmail)) return;
    const unsubscribe = watchAdminAccess(loggedInUserEmail, ({ role, active, name }) => {
      if (!role || !active) {
        setIsAdminLoggedIn(false);
        setLoggedInUserEmail('');
        setAdminRole(null);
        setAdminName('');
        setCurrentView('home');
        alert(!role ? 'Your admin access has been removed.' : 'Your admin access has been turned OFF.');
      } else {
        setAdminRole(role);
        if (name) setAdminName(name);
      }
    });
    return () => unsubscribe();
  }, [isAdminLoggedIn, loggedInUserEmail]);

  const [newProductForm, setNewProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState(null);

  const [checkoutForm, setCheckoutForm] = useState(EMPTY_CHECKOUT);
  const [checkoutError, setCheckoutError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderCompleteData, setOrderCompleteData] = useState(null);

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
  }, [cart]);

  // Team members see new customer orders live
  useEffect(() => {
    if (!isAdminLoggedIn) { setOrders([]); return; }
    const unsubscribe = watchOrders(setOrders, (err) => console.error('Could not load orders:', err));
    return () => unsubscribe();
  }, [isAdminLoggedIn]);

  // The signed-in customer's profile (name, photo, saved items) and own orders
  const customerUid = customerUser ? customerUser.uid : null;
  useEffect(() => {
    if (!customerUid) return;
    const stopProfile = watchProfile(customerUid, setProfile);
    const stopOrders = watchMyOrders(customerUid, setMyOrders, (err) => console.error('Could not load your orders:', err));
    return () => { stopProfile(); stopOrders(); };
  }, [customerUid]);

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
    const live = products.find(p => p.id === product.id) || product;
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
      const { colorImages, ...rest } = live; // color photos stay out of the cart (keeps it small)
      return [...prev, { ...rest, image: imageFor(live, color), cartItemId, selectedColor: color, selectedSize: size, quantity: qty }];
    });
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
    const live = products.find(p => p.id === product.id) || product;
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
  // Online Payment = free delivery, Cash on Delivery = 100 / 150 by area (see data/shopConfig.js)
  const deliveryCharge = deliveryFee(checkoutForm.deliveryArea, checkoutForm.paymentMethod);
  // Automatic discount (rules are set by the Owner), taken off the product total, not the delivery charge
  const discountInfo = bestDiscount(subtotal, storeSettings);
  const discount = discountInfo.amount;
  const discountLabel = discountInfo.rule ? describeRule(discountInfo.rule) : '';
  const reward = nextReward(subtotal, storeSettings);
  const grandTotal = subtotal - discount + deliveryCharge;

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (placingOrder || cart.length === 0) return;
    setCheckoutError('');
    if (!customerUser) { setCheckoutError('Please sign in with Google to place your order.'); return; }

    const name = checkoutForm.fullName.trim();
    const phone = cleanPhone(checkoutForm.phone.trim());
    const street = checkoutForm.address.trim();
    if (name.length < 2) return setCheckoutError('Please enter your name. (আপনার নাম লিখুন)');
    if (!/^[+]?[0-9]{7,15}$/.test(phone)) return setCheckoutError('Please enter a valid phone number. (সঠিক ফোন নম্বর দিন)');
    if (!checkoutForm.district) return setCheckoutError('Please select your city / district. (জেলা নির্বাচন করুন)');
    if (!checkoutForm.upazila) return setCheckoutError('Please select your zone / thana. (থানা বা উপজেলা নির্বাচন করুন)');
    if (street.length < 5) return setCheckoutError('Please enter your house / road / village. (বাড়ি, রাস্তা বা গ্রামের নাম লিখুন)');
    if (!DELIVERY_AREAS.includes(checkoutForm.deliveryArea)) return setCheckoutError('Please select your city / district again.');
    // one clear address line for the order: street, area, thana/upazila, district
    const address = [street, checkoutForm.area, checkoutForm.upazila, checkoutForm.district].filter(Boolean).join(', ');
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

    const order = {
      customer: { name, phone, address, notes: checkoutForm.notes.trim() },
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category || '',
        price: item.price,
        quantity: item.quantity,
        size: item.selectedSize || '',
        color: item.selectedColor || '',
        image: typeof item.image === 'string' && /^https?:\/\//.test(item.image) && item.image.length < 400 ? item.image : ''
      })),
      subtotal,
      discount,
      discountLabel,
      deliveryArea: checkoutForm.deliveryArea,
      shipping: deliveryCharge,
      total: grandTotal,
      paymentMethod: checkoutForm.paymentMethod,
      paymentStatus: paymentStatusFor(checkoutForm.paymentMethod),
      status: 'Pending',
      ...(customerUser ? { uid: customerUser.uid } : {}),
      ...(customerUser && customerUser.email ? { email: customerUser.email.toLowerCase() } : {})
    };

    setPlacingOrder(true);
    try {
      const { orderNumber } = await placeOrder(order);
      setOrderCompleteData({ ...order, orderNumber, date: new Date().toISOString() });
      setCart([]);
      setCheckoutForm(EMPTY_CHECKOUT);
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
      alert(wrong.includes(error.code) ? 'Incorrect email or password.' : 'Sign-In Error: ' + error.message);
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

  const handleSaveProfile = (patch) => saveProfile(customerUser.uid, patch);

  // Heart button: saved items are kept in the customer's profile (sign in first)
  const toggleSaved = async (productId) => {
    if (!customerUser) {
      alert('Please sign in to save items.');
      await handleCustomerSignIn();
      return;
    }
    const next = savedIds.includes(productId) ? savedIds.filter(id => id !== productId) : [...savedIds, productId];
    try {
      await saveProfile(customerUser.uid, { saved: next });
    } catch (err) {
      alert('Could not save this item. Please try again.');
    }
  };

  const savedProducts = savedIds.map(id => shopProducts.find(p => p.id === id)).filter(Boolean);

  // Owner: move the products from this browser into Firestore (one time)
  const [migrating, setMigrating] = useState(false);
  const handleMigrateProducts = async () => {
    if (migrating || isCloud) return;
    if (!confirm('Move all products to Firestore? After this, every customer on every device will see the same products.')) return;
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

    if (!newProductForm.image) {
      alert('Please add a product image: paste an image link or upload a photo.');
      return;
    }

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

    const productData = {
      id: editingProductId || Date.now(),
      name: newProductForm.name,
      category: newProductForm.category,
      gender: newProductForm.gender,
      price: parseFloat(newProductForm.price) || 0,
      originalPrice: parseFloat(newProductForm.originalPrice) || 0,
      image: newProductForm.image,
      images: [newProductForm.image],
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
      stock,
      isNew: newProductForm.isNew,
      isFeatured: newProductForm.isFeatured,
      isBestSeller: newProductForm.isBestSeller,
      // Who added this product (stays the same when edited)
      addedBy: existingProduct ? existingProduct.addedBy : loggedInUserEmail,
      addedByName: existingProduct ? existingProduct.addedByName : (adminName || loggedInUserEmail),
      addedByRole: existingProduct ? existingProduct.addedByRole : adminRole,
      // New products from an Admin wait for approval; Owner and Manager products go live at once.
      // Editing keeps the current status.
      status: existingProduct ? (existingProduct.status || 'approved') : (isCloud && adminRole === 'admin' ? 'pending' : 'approved'),
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
    if (editingProductId) setEditingProductId(null);
    const wentPending = productData.status === 'pending';

    setNewProductForm(EMPTY_PRODUCT_FORM);
    alert(wentPending ? 'Product saved. It is waiting for approval by the Owner or a Manager, then customers will see it.' : 'Product saved successfully!');
  };

  const startEditProduct = (prod) => {
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
    setEditingProductId(prod.id);
    setNewProductForm({
      name: prod.name,
      gender: prod.gender || 'Men',
      category: prod.category,
      price: prod.price,
      originalPrice: prod.originalPrice || '',
      image: prod.image,
      description: prod.description,
      colors: (prod.colors || []).join(', '),
      sizeStock,
      colorStock,
      colorImages: { ...(prod.colorImages || {}) },
      trackColors: hasColorStock(prod),
      stock: prod.stock,
      isNew: prod.isNew,
      isFeatured: prod.isFeatured,
      isBestSeller: prod.isBestSeller
    });
    setAdminTab('add-product');
  };

  // Owner can delete everything, Manager only products they added, Admin none
  const canDeleteProduct = (p) => {
    if (adminRole === 'owner') return true;
    const mine = !!p.addedBy && p.addedBy.toLowerCase() === (loggedInUserEmail || '').toLowerCase();
    // Manager: own products, or a pending product from an Admin (rejecting it). Admin: own products only.
    if (adminRole === 'manager') return mine || !isApproved(p);
    if (adminRole === 'admin') return mine;
    return false;
  };
  const canApproveProduct = (p) => isCloud && !isApproved(p) && (adminRole === 'owner' || adminRole === 'manager');
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
      if (confirm('This product is live on the shop. A delete request will be sent to the Owner, and it stays on the shop until the Owner confirms. Send the request?')) {
        try {
          await requestProductDelete(id, { email: loggedInUserEmail, name: adminName });
          alert('Delete request sent to the Owner.');
        } catch (err) {
          alert('Could not send the request: ' + (err.code === 'permission-denied' ? 'you do not have permission (check the Firestore rules).' : err.message));
        }
      }
      return;
    }
    if (confirm('Are you sure you want to delete this product?')) {
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
    if (!confirm(approve ? `Delete "${p.name}" permanently? (requested by ${who})` : `Keep "${p.name}" and reject the request from ${who}?`)) return;
    try {
      if (approve) await removeProduct(p.id); else await rejectProductDelete(p.id);
    } catch (err) {
      alert('Could not do that: ' + (err.code === 'permission-denied' ? 'you do not have permission (check the Firestore rules).' : err.message));
    }
  };

  const filteredProducts = shopProducts.filter(p => {
    let matchesCategory = true;
    if (selectedCategory === 'Men' || selectedCategory === 'Women') {
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
    return 0;
  });


  return (
    <div className={`min-h-screen flex flex-col font-sans relative transition-colors duration-300 overflow-x-hidden ${isDarkMode ? 'bg-[#0f0f0f] text-gray-100' : 'bg-white text-gray-900'}`}>

      {/* 1. ANNOUNCEMENT BAR */}
      <AnnouncementBar announcementText={announcementText} isDarkMode={isDarkMode} />

      {/* 2. HEADER */}
      <Header cart={cart} curr={curr} currencyKey={currencyKey} currentView={currentView} isDarkMode={isDarkMode} setCurrencyKey={setCurrencyKey} setCurrentView={setCurrentView} setIsCartOpen={setIsCartOpen} setIsDarkMode={setIsDarkMode} setIsMobileMenuOpen={setIsMobileMenuOpen} setSelectedCategory={selectCategory} customerUser={customerUser} displayName={displayName} photoURL={photoURL} goAccount={goAccount} onSignIn={handleCustomerSignIn} onSignOut={handleCustomerSignOut} />

      {/* MOBILE MENU DRAWER */}
      {isMobileMenuOpen && <MobileMenu isDarkMode={isDarkMode} setCurrentView={setCurrentView} setIsMobileMenuOpen={setIsMobileMenuOpen} setSelectedCategory={selectCategory} />}

      {/* CART SLIDE-OVER DRAWER */}
      {quickAdd && <QuickAdd product={quickAdd.product} goCheckout={quickAdd.goCheckout} onConfirm={confirmQuickAdd} onClose={() => setQuickAdd(null)} formatPrice={formatPrice} isDarkMode={isDarkMode} />}
      {isCartOpen && <CartDrawer cart={cart} formatPrice={formatPrice} isDarkMode={isDarkMode} removeFromCart={removeFromCart} setCurrentView={setCurrentView} setIsCartOpen={setIsCartOpen} subtotal={subtotal} discount={discount} discountLabel={discountLabel} reward={reward} updateCartQty={updateCartQty} />}

      {/* HOME VIEW */}
      {currentView === 'home' && <HomeView requestAdd={requestAdd} addToCart={addToCart} banners={banners} calculateDiscountPercent={calculateDiscountPercent} currentBannerIndex={currentBannerIndex} formatPrice={formatPrice} isDarkMode={isDarkMode} products={shopProducts} setCurrentBannerIndex={setCurrentBannerIndex} setCurrentView={setCurrentView} setSelectedCategory={selectCategory} setSelectedProduct={setSelectedProduct} savedIds={savedIds} toggleSaved={toggleSaved} />}

      {/* SHOP CATALOG VIEW */}
      {currentView === 'shop' && <ShopView selectedSubCategory={selectedSubCategory} setSelectedSubCategory={setSelectedSubCategory} requestAdd={requestAdd} addToCart={addToCart} filteredProducts={filteredProducts} formatPrice={formatPrice} isDarkMode={isDarkMode} products={shopProducts} searchQuery={searchQuery} selectedCategory={selectedCategory} setCurrentView={setCurrentView} setSearchQuery={setSearchQuery} setSelectedCategory={selectCategory} setSelectedProduct={setSelectedProduct} setSortBy={setSortBy} sortBy={sortBy} savedIds={savedIds} toggleSaved={toggleSaved} />}

      {currentView === 'product-detail' && selectedProduct && <ProductDetail product={selectedProduct} products={shopProducts} addToCart={addToCart} calculateDiscountPercent={calculateDiscountPercent} formatPrice={formatPrice} isDarkMode={isDarkMode} setCurrentView={setCurrentView} savedIds={savedIds} toggleSaved={toggleSaved} />}

      {currentView === 'account' && <AccountView customerUser={customerUser} displayName={displayName} photoURL={photoURL} activeTab={accountTab} setActiveTab={setAccountTab} onSignIn={handleCustomerSignIn} onSignOut={handleCustomerSignOut} onSaveProfile={handleSaveProfile} onCancelOrder={handleCancelMyOrder} myOrders={myOrders} savedProducts={savedProducts} toggleSaved={toggleSaved} formatPrice={formatPrice} isDarkMode={isDarkMode} setCurrentView={setCurrentView} setSelectedProduct={setSelectedProduct} />}

      {/* CHECKOUT (guest checkout, no login needed) */}
      {currentView === 'checkout' && <CheckoutView cart={cart} checkoutForm={checkoutForm} setCheckoutForm={setCheckoutForm} checkoutError={checkoutError} deliveryCharge={deliveryCharge} grandTotal={grandTotal} formatPrice={formatPrice} handleCheckoutSubmit={handleCheckoutSubmit} isDarkMode={isDarkMode} placingOrder={placingOrder} removeFromCart={removeFromCart} updateCartQty={updateCartQty} setCurrentView={setCurrentView} subtotal={subtotal} discount={discount} discountLabel={discountLabel} reward={reward} customerUser={customerUser} authReady={authReady} onSignIn={handleCustomerSignIn} />}

      {/* ORDER CONFIRMATION */}
      {['privacy', 'terms', 'refund'].includes(currentView) && <PolicyPages page={currentView} isDarkMode={isDarkMode} setCurrentView={setCurrentView} />}
      {currentView === 'order-success' && <OrderSuccess order={orderCompleteData} formatPrice={formatPrice} isDarkMode={isDarkMode} setCurrentView={setCurrentView} />}

      {/* ADMIN PORTAL VIEW (GOOGLE SIGN-IN, WHITELISTED EMAILS ONLY) */}
      {currentView === 'admin' && <AdminPortal adminTab={adminTab} deleteProduct={deleteProduct} editingProductId={editingProductId} formatPrice={formatPrice} handleAdminLogout={handleAdminLogout} handleEmailSignIn={handleEmailSignIn} handleGenderChange={handleGenderChange} handleGoogleSignIn={handleGoogleSignIn} handleSaveProduct={handleSaveProduct} isAdminLoggedIn={isAdminLoggedIn} isDarkMode={isDarkMode} adminRole={adminRole} adminName={adminName} canDeleteProduct={canDeleteProduct} canApproveProduct={canApproveProduct} handleApproveProduct={handleApproveProduct} pendingCount={pendingCount} loggedInUserEmail={loggedInUserEmail} newProductForm={newProductForm} orders={orders} products={products} storeSettings={storeSettings} isCloud={isCloud} migrating={migrating} handleMigrateProducts={handleMigrateProducts} setAdminTab={setAdminTab} setEditingProductId={setEditingProductId} setNewProductForm={setNewProductForm} startEditProduct={startEditProduct} handleDeleteRequest={handleDeleteRequest} clearProductForm={() => { setEditingProductId(null); setNewProductForm(EMPTY_PRODUCT_FORM); }} />}

      {/* FOOTER */}
      <Footer isDarkMode={isDarkMode} setCurrentView={setCurrentView} setSelectedCategory={selectCategory} customerUser={customerUser} onSignIn={handleCustomerSignIn} goAccount={goAccount} />

    </div>
  );
}
