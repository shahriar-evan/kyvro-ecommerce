import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, User, Menu, X, Shield, Truck, RefreshCw, 
  ChevronRight, Star, Heart, Trash2, Plus, Minus, CheckCircle, 
  Lock, Settings, PlusCircle, Edit3, Eye, DollarSign, Package, 
  BarChart2, Globe, Mail, Phone, ExternalLink, AlertCircle, Send, Check, MessageCircle, Sun, Moon, Upload
} from 'lucide-react';
import logoImg from './logo.png';
import heroBannerImg from './hero-banner.png';
import shirtImg from './shirts.png';
import punjabiImg from './punjabi.png';
import sneakersImg from './Snekers.png';

const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: "Kyvro Signature Executive Watch",
    category: "Watches",
    gender: "Watches",
    price: 3490,
    originalPrice: 5816,
    image: sneakersImg,
    images: [sneakersImg],
    description: "Crafted with precision sapphire crystal and matte black stainless steel. Designed for the modern leader who wears their story with confidence.",
    colors: ["Matte Black", "Champagne Gold", "Silver"],
    sizes: ["Standard"],
    stock: 15,
    isNew: true,
    isFeatured: true,
    isBestSeller: true
  },
  {
    id: 2,
    name: "Minimalist Italian Leather Wallet",
    category: "Wallets",
    gender: "Wallets",
    price: 890,
    originalPrice: 1780,
    image: sneakersImg,
    images: [sneakersImg],
    description: "Genuine full-grain Italian leather wallet featuring RFID blocking technology and a sleek, slim profile.",
    colors: ["Black", "Charcoal", "Tan"],
    sizes: ["One Size"],
    stock: 25,
    isNew: true,
    isFeatured: true,
    isBestSeller: false
  },
  {
    id: 3,
    name: "Luxury Silk Sharee",
    category: "Sharee",
    gender: "Women",
    price: 2890,
    originalPrice: 4816,
    image: shirtImg,
    images: [shirtImg],
    description: "An epitome of elegance. Flowing pure silk sharee designed to capture timeless sophistication at any formal occasion.",
    colors: ["Champagne Gold", "Midnight Black"],
    sizes: ["Standard"],
    stock: 10,
    isNew: true,
    isFeatured: true,
    isBestSeller: true
  },
  {
    id: 4,
    name: "Tailored Oxford Shirt",
    category: "Shirt",
    gender: "Men",
    price: 3190,
    originalPrice: 5316,
    image: shirtImg,
    images: [shirtImg],
    description: "Impeccably tailored menswear engineered from breathable, premium cotton for effortless styling.",
    colors: ["Charcoal", "Matte Black", "Navy"],
    sizes: ["S", "M", "L", "XL"],
    stock: 8,
    isNew: false,
    isFeatured: true,
    isBestSeller: true
  },
  {
    id: 5,
    name: "Designer Executive Punjabi",
    category: "Punjabi",
    gender: "Men",
    price: 2490,
    originalPrice: 4980,
    image: punjabiImg,
    images: [punjabiImg],
    description: "Traditional yet modern designer Punjabi crafted for festive and formal elegance.",
    colors: ["Matte Black", "Dark Brown"],
    sizes: ["M", "L", "XL"],
    stock: 12,
    isNew: true,
    isFeatured: false,
    isBestSeller: true
  }
];

const CURRENCIES = {
  BDT: { symbol: '৳', rate: 1, flag: '🇧🇩', name: 'BDT' },
  USD: { symbol: '$', rate: 0.0083, flag: '🇺🇸', name: 'USD' },
  EUR: { symbol: '€', rate: 0.0076, flag: '🇪🇺', name: 'EUR' },
  MYR: { symbol: 'RM', rate: 0.038, flag: '🇲🇾', name: 'RINGGIT' }
};

const AVAILABLE_SIZES_LIST = ["S", "M", "L", "XL", "Standard", "One Size"];

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const banners = [heroBannerImg, shirtImg, punjabiImg, sneakersImg];
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminTab, setAdminTab] = useState('products');
  
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProductForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSizeCheckboxChange = (size) => {
    setNewProductForm(prev => {
      const currentSizes = prev.sizes || [];
      if (currentSizes.includes(size)) {
        return { ...prev, sizes: currentSizes.filter(s => s !== size) };
      } else {
        return { ...prev, sizes: [...currentSizes, size] };
      }
    });
  };

  const handleGenderChange = (genderVal) => {
    let defaultCat = 'Shirt';
    if (genderVal === 'Women') defaultCat = 'Sharee';
    if (genderVal === 'Shoes') defaultCat = 'Shoes';
    if (genderVal === 'Wallets') defaultCat = 'Wallets';
    if (genderVal === 'Watches') defaultCat = 'Watches';

    setNewProductForm(prev => ({
      ...prev,
      gender: genderVal,
      category: defaultCat
    }));
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

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === 'admin123' || adminPin === 'kyvro2026') {
      setIsAdminLoggedIn(true);
      setAdminPin('');
    } else {
      alert('Invalid Admin PIN. (Hint: use admin123)');
    }
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
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
      isBestSeller: newProductForm.isBestSeller
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

  const deleteProduct = (id) => {
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
      <div className={`text-[11px] sm:text-xs font-semibold py-2 overflow-hidden whitespace-nowrap border-b tracking-wider ${isDarkMode ? 'bg-[#1a1a1a] text-[#D4AF37] border-gray-800' : 'bg-gray-100 text-black border-gray-200'}`}>
        <div className="animate-ticker inline-block px-4">
          {announcementText} &nbsp;&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;&nbsp; 24/7 VIP Customer Support: kyvrofashion@gmail.com &nbsp;&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;&nbsp; {announcementText}
        </div>
      </div>

      {/* 2. HEADER */}
      <header className={`sticky top-0 z-40 backdrop-blur border-b ${isDarkMode ? 'bg-[#121212]/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-3 sm:gap-6">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className={`md:hidden p-1 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'}`}
            >
              <Menu size={24} />
            </button>
            <div 
              onClick={() => { setCurrentView('home'); setSelectedCategory('All'); }}
              className="cursor-pointer flex items-center gap-2 sm:gap-3"
            >
              <img src={logoImg} alt="Kyvro Logo" className="h-8 sm:h-10 w-auto object-contain" />
              <div className="flex flex-col items-start">
                <span className={`text-lg sm:text-2xl font-serif font-bold tracking-widest ${isDarkMode ? 'text-white' : 'text-black'}`}>KYVRO</span>
                <span className={`text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] font-sans -mt-1 ${isDarkMode ? 'text-[#D4AF37]' : 'text-black font-semibold'}`}>কাইভ্রো &bull; WEAR YOUR STORY</span>
              </div>
            </div>
          </div>

          <nav className={`hidden md:flex items-center gap-6 text-sm font-medium tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
            <button onClick={() => { setCurrentView('home'); setSelectedCategory('All'); }} className={`hover:text-[#D4AF37] transition ${currentView === 'home' ? 'text-[#D4AF37] border-b-2 border-[#D4AF37] pb-1' : ''}`}>HOME</button>
            <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Men"); }} className="hover:text-[#D4AF37] transition">MEN'S</button>
            <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Women"); }} className="hover:text-[#D4AF37] transition">WOMEN'S</button>
            <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Shoes"); }} className="hover:text-[#D4AF37] transition">SHOES</button>
            <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Wallets"); }} className="hover:text-[#D4AF37] transition">WALLETS</button>
            <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Watches"); }} className="hover:text-[#D4AF37] transition">WATCHES</button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs font-semibold ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-black'}`}>
              <span>{curr.flag}</span>
              <select 
                value={currencyKey} 
                onChange={(e) => setCurrencyKey(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                {Object.keys(CURRENCIES).map(key => (
                  <option key={key} value={key} className={isDarkMode ? 'bg-[#1a1a1a] text-white' : 'bg-white text-black'}>
                    {key} ({CURRENCIES[key].symbol})
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full border transition flex items-center justify-center ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-[#D4AF37] hover:bg-[#222]' : 'bg-gray-100 border-gray-300 text-black hover:bg-gray-200'}`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button 
              onClick={() => setCurrentView('shop')}
              className={`transition p-1 ${isDarkMode ? 'text-gray-300 hover:text-[#D4AF37]' : 'text-gray-700 hover:text-[#D4AF37]'}`}
              title="Search"
            >
              <Search size={18} />
            </button>

            <button 
              onClick={() => setCurrentView('admin')}
              className={`transition relative p-1 ${isDarkMode ? 'text-gray-300 hover:text-[#D4AF37]' : 'text-gray-700 hover:text-[#D4AF37]'}`}
              title="Admin Panel"
            >
              <User size={18} />
            </button>

            <button 
              onClick={() => setIsCartOpen(true)}
              className={`transition relative flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full border ${isDarkMode ? 'text-gray-300 bg-[#1a1a1a] border-gray-800' : 'text-gray-800 bg-gray-100 border-gray-300'}`}
            >
              <ShoppingBag size={16} className="text-[#D4AF37]" />
              <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* MOBILE MENU DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex">
          <div className={`w-4/5 max-w-sm h-full p-6 flex flex-col justify-between border-r ${isDarkMode ? 'bg-[#121212] border-gray-800 text-white' : 'bg-white border-gray-300 text-black'}`}>
            <div>
              <div className="flex justify-between items-center mb-8">
                <div className="text-xl font-serif font-bold">KYVRO <span className="text-xs text-[#D4AF37]">কাইভ্রো</span></div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-black">
                  <X size={24} />
                </button>
              </div>
              <div className="flex flex-col gap-4 text-sm font-medium">
                <button onClick={() => { setCurrentView('home'); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 hover:text-[#D4AF37]">HOME</button>
                <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Men"); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 hover:text-[#D4AF37]">MEN'S (Shirt, Punjabi...)</button>
                <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Women"); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 hover:text-[#D4AF37]">WOMEN'S (Sharee, Bags...)</button>
                <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Shoes"); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 hover:text-[#D4AF37]">SHOES</button>
                <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Wallets"); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 hover:text-[#D4AF37]">WALLETS</button>
                <button onClick={() => { setCurrentView('shop'); setSelectedCategory("Watches"); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 hover:text-[#D4AF37]">WATCHES</button>
                <button onClick={() => { setCurrentView('admin'); setIsMobileMenuOpen(false); }} className="text-left py-2 border-b border-gray-300 text-[#D4AF37]">ADMIN LOGIN</button>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              <p>www.kyvro.store</p>
              <p>Support: 24/7 Available</p>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* CART SLIDE-OVER DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-end">
          <div className={`w-full max-w-md h-full p-6 flex flex-col justify-between border-l shadow-2xl ${isDarkMode ? 'bg-[#161616] border-gray-800 text-white' : 'bg-white border-gray-300 text-black'}`}>
            <div>
              <div className="flex justify-between items-center pb-4 border-b">
                <h2 className="text-lg font-serif font-bold flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[#D4AF37]" /> Your Shopping Cart ({cart.reduce((a, c) => a + c.quantity, 0)})
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-black">
                  <X size={22} />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <ShoppingBag size={48} className="mx-auto mb-4 opacity-30 text-[#D4AF37]" />
                  <p className="text-base font-medium mb-2">Your cart is empty.</p>
                  <p className="text-xs text-gray-500 mb-6">Explore our luxury collection and wear your story.</p>
                  <button 
                    onClick={() => { setIsCartOpen(false); setCurrentView('shop'); }}
                    className="bg-[#D4AF37] text-black text-xs font-bold px-6 py-3 tracking-widest uppercase rounded hover:opacity-90 transition"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="py-4 space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                  {cart.map(item => (
                    <div key={item.cartItemId} className={`flex gap-4 p-3 rounded-lg border ${isDarkMode ? 'bg-[#1f1f1f] border-gray-800' : 'bg-gray-100 border-gray-300'}`}>
                      <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium line-clamp-1">{item.name}</h4>
                        <p className="text-xs text-[#D4AF37] mt-0.5">{formatPrice(item.price)}</p>
                        <p className="text-[11px] text-gray-400 mt-1">Color: {item.selectedColor} | Size: {item.selectedSize}</p>
                        
                        <div className="flex justify-between items-center mt-3">
                          <div className={`flex items-center border rounded ${isDarkMode ? 'border-gray-700 bg-[#121212]' : 'border-gray-300 bg-white'}`}>
                            <button onClick={() => updateCartQty(item.cartItemId, -1)} className="px-2 py-0.5 text-gray-400 hover:text-black">-</button>
                            <span className="px-2 text-xs">{item.quantity}</span>
                            <button onClick={() => updateCartQty(item.cartItemId, 1)} className="px-2 py-0.5 text-gray-400 hover:text-black">+</button>
                          </div>
                          <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-500 hover:text-red-400">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping</span>
                    <span>{finalShipping === 0 ? 'FREE' : formatPrice(shippingFee)}</span>
                  </div>
                  {subtotal < freeShippingThreshold && (
                    <p className="text-[11px] text-[#D4AF37]">
                      Add {formatPrice(freeShippingThreshold - subtotal)} more for Free Shipping!
                    </p>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className="text-[#D4AF37]">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => { setIsCartOpen(false); setCurrentView('checkout'); }}
                  className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded text-xs tracking-widest uppercase hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  Proceed to Checkout <ChevronRight size={16} />
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* HOME VIEW */}
      {currentView === 'home' && (
        <div className="flex-1">
          <section className="relative h-[70vh] sm:h-[80vh] flex flex-col justify-between items-center text-center bg-cover bg-center py-6 px-4" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${heroBannerImg})` }}>
            <div className="w-full flex justify-center pt-2">
              <span className={`text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] font-semibold px-4 sm:px-6 py-2 rounded-full border shadow-xl ${isDarkMode ? 'bg-black/70 text-[#D4AF37] border-[#D4AF37]/50' : 'bg-white/90 text-black border-black/20'}`}>
                KYVRO &bull; কাইভ্রো LUXURY COLLECTION
              </span>
            </div>
            <div></div>
            <div className="w-full flex justify-center pb-12 sm:pb-20">
              <button 
                onClick={() => setCurrentView('shop')}
                className="bg-[#D4AF37] text-black font-bold px-6 sm:px-8 py-3.5 sm:py-4 rounded text-xs tracking-[0.2em] uppercase hover:bg-white transition shadow-2xl transform hover:scale-105"
              >
                Explore Collection
              </button>
            </div>
          </section>

          {/* AUTOMATIC BANNERS SLIDER */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-4">
            <div className="relative h-[280px] sm:h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-transparent">
              {banners.map((img, idx) => (
                <div 
                  key={idx}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                  <img src={img} alt={`Kyvro Banner ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center">
                    <button 
                      onClick={() => setCurrentView('shop')}
                      className="bg-[#D4AF37] text-black text-xs font-bold px-6 sm:px-8 py-2.5 sm:py-3 uppercase tracking-widest rounded shadow-2xl hover:bg-white transition transform hover:scale-105"
                    >
                      Shop Now
                    </button>
                  </div>
                </div>
              ))}

              <div className="absolute bottom-4 right-6 z-20 flex gap-2">
                {banners.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentBannerIndex(idx)}
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition ${idx === currentBannerIndex ? 'bg-[#D4AF37] w-6 sm:w-8' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Shop by Category */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-xl sm:text-3xl font-serif font-bold tracking-wider">SHOP BY CATEGORY</h2>
              <div className="w-12 h-0.5 bg-[#D4AF37] mx-auto mt-3"></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
              {[
                { name: "Men", label: "Men's Collection", image: shirtImg },
                { name: "Women", label: "Women's Collection", image: shirtImg },
                { name: "Shoes", label: "Shoes", image: sneakersImg },
                { name: "Wallets", label: "Wallets", image: sneakersImg },
                { name: "Watches", label: "Watches", image: sneakersImg }
              ].map((cat, idx) => (
                <div 
                  key={idx}
                  onClick={() => { setSelectedCategory(cat.name); setCurrentView('shop'); }}
                  className="group relative h-60 sm:h-80 rounded-lg overflow-hidden cursor-pointer shadow-xl border border-gray-800"
                >
                  <img src={cat.image} alt={cat.label} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-4 sm:p-6">
                    <h3 className="text-sm sm:text-lg font-serif font-bold text-white group-hover:text-[#D4AF37] transition">{cat.label}</h3>
                    <p className="text-[11px] sm:text-xs text-gray-300 mt-1 flex items-center gap-1">Shop Now <ChevronRight size={12} /></p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Featured & New Arrivals */}
          <section className={`py-16 sm:py-20 border-y ${isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 sm:mb-12 gap-3">
                <div>
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">Curated Masterpieces</span>
                  <h2 className="text-xl sm:text-3xl font-serif font-bold mt-1">FEATURED & NEW ARRIVALS</h2>
                </div>
                <button 
                  onClick={() => setCurrentView('shop')}
                  className="text-xs font-bold text-[#D4AF37] hover:underline flex items-center gap-1 tracking-wider uppercase"
                >
                  View All Products <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {products.slice(0, 4).map(product => {
                  const discountPct = calculateDiscountPercent(product.price, product.originalPrice);
                  return (
                    <div key={product.id} className={`group rounded-lg overflow-hidden border flex flex-col ${isDarkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="relative h-64 sm:h-72 overflow-hidden bg-gray-900 cursor-pointer" onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}>
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        {product.isNew && (
                          <span className="absolute top-3 left-3 bg-[#D4AF37] text-black text-[10px] font-bold px-2.5 py-1 tracking-wider uppercase">
                            New
                          </span>
                        )}
                        {product.originalPrice > product.price && (
                          <div className="absolute top-3 right-3 flex flex-col items-end">
                            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">Sale</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] sm:text-[11px] text-[#D4AF37] uppercase tracking-wider">{product.category}</span>
                          <h3 
                            onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}
                            className="text-sm sm:text-base font-serif font-semibold mt-1 cursor-pointer hover:text-[#D4AF37] transition line-clamp-1"
                          >
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-sm sm:text-base font-bold">{formatPrice(product.price)}</span>
                            {product.originalPrice > product.price && (
                              <span className="text-xs text-gray-500 line-through">{formatPrice(product.originalPrice)}</span>
                            )}
                          </div>
                        </div>

                        <div className="mt-5 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}
                              className={`border text-xs font-semibold py-2.5 rounded transition text-center ${isDarkMode ? 'border-gray-700 text-gray-300 hover:border-[#D4AF37] hover:text-white' : 'border-gray-300 text-gray-700 hover:border-[#D4AF37]'}`}
                            >
                              Details
                            </button>
                            <button 
                              onClick={() => addToCart(product, product.colors[0], product.sizes[0], 1)}
                              className="bg-[#D4AF37] text-black text-xs font-bold py-2.5 rounded hover:opacity-90 transition text-center"
                            >
                              Add to Cart
                            </button>
                          </div>
                          <a 
                            href={`https://wa.me/60123456789?text=Hello%20Kyvro,%20I%20want%20to%20order:%0A*%20Name:%20${encodeURIComponent(product.name)}%0A*%20Price:%20${encodeURIComponent(formatPrice(product.price))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-[#25D366] text-white font-bold py-2 rounded text-[11px] uppercase tracking-wider hover:opacity-90 transition flex items-center justify-center gap-1.5 shadow"
                          >
                            <MessageCircle size={13} /> Order on WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Why Choose Kyvro */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
              {[
                { icon: Shield, title: "Uncompromising Quality", desc: "Hand-selected fabrics, genuine leather, and premium stainless steel materials." },
                { icon: Truck, title: "Secure Worldwide Delivery", desc: "Fast, insured shipping directly to your doorstep with real-time tracking." },
                { icon: RefreshCw, title: "Hassle-Free Returns", desc: "30-day return policy for peace of mind and absolute customer satisfaction." },
                { icon: User, title: "24/7 VIP Support", desc: "Dedicated assistance anytime at kyvrofashion@gmail.com." }
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div key={idx} className={`p-6 sm:p-8 rounded-lg border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <IconComponent size={32} className="mx-auto text-[#D4AF37] mb-3 sm:mb-4" />
                    <h4 className="font-serif font-bold text-sm sm:text-base mb-2">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* SHOP CATALOG VIEW */}
      {currentView === 'shop' && (
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
      )}

      {/* FOOTER */}
      <footer className={`border-t pt-12 sm:pt-16 pb-12 mt-auto ${isDarkMode ? 'bg-[#121212] border-gray-800 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 text-xs">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Kyvro Logo" className="h-10 sm:h-12 w-auto object-contain" />
              <div className="flex flex-col items-start">
                <span className={`text-lg sm:text-xl font-serif font-bold tracking-widest ${isDarkMode ? 'text-white' : 'text-black'}`}>KYVRO</span>
                <span className={`text-[8px] sm:text-[9px] tracking-[0.3em] font-sans -mt-1 ${isDarkMode ? 'text-[#D4AF37]' : 'text-black font-semibold'}`}>কাইভ্রো &bull; WEAR YOUR STORY</span>
              </div>
            </div>
            <p className="leading-relaxed">
              Kyvro offers stylish, comfortable, and affordable clothing made for everyday wear. Discover premium fabrics, modern designs, and perfect fits.
            </p>
            <p className={`font-semibold ${isDarkMode ? 'text-[#D4AF37]' : 'text-black'}`}>Domain: www.kyvro.store</p>
          </div>

          <div>
            <h4 className={`font-bold uppercase tracking-wider mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Customer Care</h4>
            <ul className="space-y-2">
              <li><button onClick={() => setCurrentView('shop')} className="hover:text-[#D4AF37]">Shop Collection</button></li>
              <li><a href="mailto:kyvrofashion@gmail.com" className="hover:text-[#D4AF37]">24/7 Support: kyvrofashion@gmail.com</a></li>
              <li><span>Facebook: www.facebook.com/kyvrofashion</span></li>
              <li><span>Instagram: @kyvro_fashion</span></li>
              <li><span>TikTok: tiktok.com/@kyvro.store</span></li>
            </ul>
          </div>

          <div>
            <h4 className={`font-bold uppercase tracking-wider mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Categories</h4>
            <ul className="space-y-2">
              <li><button onClick={() => { setSelectedCategory("Men"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Men's Collection</button></li>
              <li><button onClick={() => { setSelectedCategory("Women"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Women's Collection</button></li>
              <li><button onClick={() => { setSelectedCategory("Shoes"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Shoes</button></li>
              <li><button onClick={() => { setSelectedCategory("Wallets"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Wallets</button></li>
              <li><button onClick={() => { setSelectedCategory("Watches"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Watches</button></li>
            </ul>
          </div>

          <div>
            <h4 className={`font-bold uppercase tracking-wider mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Secure Shopping</h4>
            <p className="leading-relaxed mb-4">
              All transactions and customer details are encrypted and securely handled.
            </p>
            <button 
              onClick={() => setCurrentView('admin')}
              className={`border px-4 py-2 rounded font-bold transition ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-[#D4AF37] hover:bg-[#222]' : 'bg-gray-100 border-gray-300 text-black hover:bg-gray-200'}`}
            >
              Admin Portal Login
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-12 pt-6 border-t text-center text-gray-500 text-[11px]">
          &copy; 2026 Kyvro - কাইভ্রো &bull; www.kyvro.store. All rights reserved.
        </div>
      </footer>

    </div>
  );
}