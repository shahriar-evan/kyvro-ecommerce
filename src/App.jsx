import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, googleProvider } from './firebase';
import { isOwnerEmail } from './adminEmails';
import { getAdminStatus, watchAdminAccess } from './adminAuth';
import { INITIAL_PRODUCTS } from './data/products';
import { CURRENCIES } from './data/currencies';
import heroBannerImg from './assets/hero-banner.png';
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

export default function App() {
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('kyvro_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('kyvro_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('kyvro_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [announcementText, setAnnouncementText] = useState("Discover Your Signature Style | Complimentary Worldwide Shipping on Orders Over 3500 BDT");
  const [currencyKey, setCurrencyKey] = useState("BDT");
  const curr = CURRENCIES[currencyKey];

  const [shippingFee, setShippingFee] = useState(150.00);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(3500.00);

  const [currentView, setCurrentView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [priceFilter, setPriceFilter] = useState(15000);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const banners = [heroBannerImg, shirtImg, punjabiImg, sneakersImg];
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Admin & Firebase Auth States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loggedInUserEmail, setLoggedInUserEmail] = useState('');
  const [adminRole, setAdminRole] = useState(null); // 'owner' | 'manager' | 'admin' | null
  const [adminTab, setAdminTab] = useState('products');

  // Checks whether an email has access (role + access ON/OFF)
  const checkAccess = async (email) => {
    const { role, active } = await getAdminStatus(email);
    if (!role) return { ok: false, message: 'Access denied: ' + email + ' is not authorized for the Admin Portal.' };
    if (!active) return { ok: false, message: 'Your access is currently turned OFF. Please contact the Owner.' };
    return { ok: true, role };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const access = await checkAccess(user.email);
      if (access.ok) {
        setAdminRole(access.role);
        setIsAdminLoggedIn(true);
        setLoggedInUserEmail(user.email);
      } else {
        // Not on the team list or access is OFF, so end the session
        signOut(auth).catch(() => {});
        setAdminRole(null);
        setIsAdminLoggedIn(false);
        setLoggedInUserEmail('');
      }
    });
    return () => unsubscribe();
  }, []);

  // While logged in, access OFF / removal / role changes by the Owner apply immediately
  useEffect(() => {
    if (!isAdminLoggedIn || !loggedInUserEmail || isOwnerEmail(loggedInUserEmail)) return;
    const unsubscribe = watchAdminAccess(loggedInUserEmail, ({ role, active }) => {
      if (!role || !active) {
        signOut(auth).catch(() => {});
        setIsAdminLoggedIn(false);
        setLoggedInUserEmail('');
        setAdminRole(null);
        setCurrentView('home');
        alert(!role ? 'Your admin access has been removed.' : 'Your admin access has been turned OFF.');
      } else {
        setAdminRole(role);
      }
    });
    return () => unsubscribe();
  }, [isAdminLoggedIn, loggedInUserEmail]);

  const [newProductForm, setNewProductForm] = useState({
    name: '', gender: 'Men', category: 'Shirt', price: '', originalPrice: '', image: '', description: '', colors: 'Matte Black, Charcoal', sizes: ['M', 'L'], stock: '10', isNew: true, isFeatured: false, isBestSeller: false
  });
  const [editingProductId, setEditingProductId] = useState(null);

  const [checkoutForm, setCheckoutForm] = useState({
    fullName: '', phone: '', email: '', city: '', zone: '', area: '', address: '', postalCode: '', notes: '', 
    paymentType: 'Partial Payment', advancePaid: 'No', paymentMethod: 'Account Wallet'
  });
  const [orderCompleteData, setOrderCompleteData] = useState(null);

  useEffect(() => {
    localStorage.setItem('kyvro_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('kyvro_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('kyvro_orders', JSON.stringify(orders));
  }, [orders]);

  const formatPrice = (amountInBDT) => {
    const converted = amountInBDT * curr.rate;
    return `${curr.symbol} ${converted.toFixed(2)}`;
  };

  const calculateDiscountPercent = (price, originalPrice) => {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  const addToCart = (product, selectedColor, selectedSize, quantity = 1) => {
    const cartItemId = `${product.id}-${selectedColor || 'default'}-${selectedSize || 'default'}`;
    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + quantity } : item);
      } else {
        return [...prev, { ...product, cartItemId, selectedColor: selectedColor || product.colors[0], selectedSize: selectedSize || product.sizes[0], quantity }];
      }
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (cartItemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const finalShipping = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : shippingFee;
  const grandTotal = subtotal + finalShipping;

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const newOrder = {
      orderNumber: 'KYV-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString(),
      customer: checkoutForm,
      items: cart,
      subtotal,
      shipping: finalShipping,
      total: grandTotal,
      status: 'Pending',
      paymentStatus: checkoutForm.paymentType === 'Full Payment' ? 'Paid' : 'Partial Payment'
    };

    setOrders([newOrder, ...orders]);
    setOrderCompleteData(newOrder);
    setCart([]);
    setCurrentView('order-success');
  };

  // Google Sign-In Handler (only owners and team members with access ON can log in)
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const access = await checkAccess(result.user.email);
      if (!access.ok) {
        await signOut(auth);
        alert(access.message);
        return;
      }
      setAdminRole(access.role);
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
      setIsAdminLoggedIn(true);
      setLoggedInUserEmail(result.user.email);
    } catch (error) {
      const wrong = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'];
      alert(wrong.includes(error.code) ? 'Incorrect email or password.' : 'Sign-In Error: ' + error.message);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {}
    setIsAdminLoggedIn(false);
    setLoggedInUserEmail('');
    setAdminRole(null);
    setCurrentView('home');
  };

  // Gender/Collection change handler (was missing in the original code and crashed the admin form)
  const handleGenderChange = (gender) => {
    const defaultCategory = { Men: 'Shirt', Women: 'Sharee', Shoes: 'Shoes', Wallets: 'Wallets', Watches: 'Watches' };
    setNewProductForm(prev => ({ ...prev, gender, category: defaultCategory[gender] || prev.category }));
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    const existingProduct = editingProductId ? products.find(p => p.id === editingProductId) : null;
    const productData = {
      id: editingProductId || Date.now(),
      name: newProductForm.name,
      category: newProductForm.category,
      gender: newProductForm.gender,
      price: parseFloat(newProductForm.price) || 0,
      originalPrice: parseFloat(newProductForm.originalPrice) || 0,
      image: newProductForm.image || shirtImg,
      images: [newProductForm.image || shirtImg],
      description: newProductForm.description,
      colors: newProductForm.colors.split(',').map(s => s.trim()),
      sizes: newProductForm.sizes.length > 0 ? newProductForm.sizes : ["Standard"],
      stock: parseInt(newProductForm.stock) || 10,
      isNew: newProductForm.isNew,
      isFeatured: newProductForm.isFeatured,
      isBestSeller: newProductForm.isBestSeller,
      // Who added this product (stays the same when edited)
      addedBy: existingProduct ? existingProduct.addedBy : loggedInUserEmail,
      addedByRole: existingProduct ? existingProduct.addedByRole : adminRole
    };

    if (editingProductId) {
      setProducts(products.map(p => p.id === editingProductId ? productData : p));
      setEditingProductId(null);
    } else {
      setProducts([productData, ...products]);
    }

    setNewProductForm({
      name: '', gender: 'Men', category: 'Shirt', price: '', originalPrice: '', image: '', description: '', colors: 'Matte Black, Charcoal', sizes: ['M', 'L'], stock: '10', isNew: true, isFeatured: false, isBestSeller: false
    });
    alert('Product saved successfully!');
  };

  const startEditProduct = (prod) => {
    setEditingProductId(prod.id);
    setNewProductForm({
      name: prod.name,
      gender: prod.gender || 'Men',
      category: prod.category,
      price: prod.price,
      originalPrice: prod.originalPrice || '',
      image: prod.image,
      description: prod.description,
      colors: prod.colors.join(', '),
      sizes: Array.isArray(prod.sizes) ? prod.sizes : [prod.sizes || 'Standard'],
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
    if (adminRole === 'manager') {
      return !!p.addedBy && p.addedBy.toLowerCase() === (loggedInUserEmail || '').toLowerCase();
    }
    return false;
  };
  const deleteProduct = (id) => {
    const target = products.find(p => p.id === id);
    if (!target || !canDeleteProduct(target)) {
      alert('You do not have permission to delete this product.');
      return;
    }
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const exportOrdersCSV = () => {
    let csv = 'Order Number,Date,Customer Name,Phone,Email,Total,Status,Payment\n';
    orders.forEach(o => {
      csv += `"${o.orderNumber}","${new Date(o.date).toLocaleDateString()}","${o.customer.fullName}","${o.customer.phone}","${o.customer.email}","${curr.symbol} ${o.total.toFixed(2)}","${o.status}","${o.paymentStatus}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kyvro-orders-${Date.now()}.csv`;
    a.click();
  };

  const filteredProducts = products.filter(p => {
    let matchesCategory = true;
    if (selectedCategory === 'Men') {
      matchesCategory = p.gender === 'Men' || ['Shirt', 'Punjabi', 'Polo', 'T-shirt', 'Joggers & Sweats', 'Jersey'].includes(p.category);
    } else if (selectedCategory === 'Women') {
      matchesCategory = p.gender === 'Women' || ['Sharee', 'Bags', 'Western Wear', 'Muslim Wear'].includes(p.category);
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
      <Header cart={cart} curr={curr} currencyKey={currencyKey} currentView={currentView} isDarkMode={isDarkMode} setCurrencyKey={setCurrencyKey} setCurrentView={setCurrentView} setIsCartOpen={setIsCartOpen} setIsDarkMode={setIsDarkMode} setIsMobileMenuOpen={setIsMobileMenuOpen} setSelectedCategory={setSelectedCategory} />

      {/* MOBILE MENU DRAWER */}
      {isMobileMenuOpen && <MobileMenu isDarkMode={isDarkMode} setCurrentView={setCurrentView} setIsMobileMenuOpen={setIsMobileMenuOpen} setSelectedCategory={setSelectedCategory} />}

      {/* CART SLIDE-OVER DRAWER */}
      {isCartOpen && <CartDrawer cart={cart} finalShipping={finalShipping} formatPrice={formatPrice} freeShippingThreshold={freeShippingThreshold} grandTotal={grandTotal} isDarkMode={isDarkMode} removeFromCart={removeFromCart} setCurrentView={setCurrentView} setIsCartOpen={setIsCartOpen} shippingFee={shippingFee} subtotal={subtotal} updateCartQty={updateCartQty} />}

      {/* HOME VIEW */}
      {currentView === 'home' && <HomeView addToCart={addToCart} banners={banners} calculateDiscountPercent={calculateDiscountPercent} currentBannerIndex={currentBannerIndex} formatPrice={formatPrice} isDarkMode={isDarkMode} products={products} setCurrentBannerIndex={setCurrentBannerIndex} setCurrentView={setCurrentView} setSelectedCategory={setSelectedCategory} setSelectedProduct={setSelectedProduct} />}

      {/* SHOP CATALOG VIEW */}
      {currentView === 'shop' && <ShopView addToCart={addToCart} filteredProducts={filteredProducts} formatPrice={formatPrice} isDarkMode={isDarkMode} products={products} searchQuery={searchQuery} selectedCategory={selectedCategory} setCurrentView={setCurrentView} setSearchQuery={setSearchQuery} setSelectedCategory={setSelectedCategory} setSelectedProduct={setSelectedProduct} setSortBy={setSortBy} sortBy={sortBy} />}

      {/* ADMIN PORTAL VIEW (GOOGLE SIGN-IN, WHITELISTED EMAILS ONLY) */}
      {currentView === 'admin' && <AdminPortal adminTab={adminTab} deleteProduct={deleteProduct} editingProductId={editingProductId} exportOrdersCSV={exportOrdersCSV} formatPrice={formatPrice} handleAdminLogout={handleAdminLogout} handleEmailSignIn={handleEmailSignIn} handleGenderChange={handleGenderChange} handleGoogleSignIn={handleGoogleSignIn} handleSaveProduct={handleSaveProduct} isAdminLoggedIn={isAdminLoggedIn} isDarkMode={isDarkMode} adminRole={adminRole} canDeleteProduct={canDeleteProduct} loggedInUserEmail={loggedInUserEmail} newProductForm={newProductForm} orders={orders} products={products} setAdminTab={setAdminTab} setEditingProductId={setEditingProductId} setNewProductForm={setNewProductForm} startEditProduct={startEditProduct} />}

      {/* FOOTER */}
      <Footer isDarkMode={isDarkMode} setCurrentView={setCurrentView} setSelectedCategory={setSelectedCategory} />

    </div>
  );
}
