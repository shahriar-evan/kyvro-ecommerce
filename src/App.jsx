import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, User, Menu, X, Shield, Truck, RefreshCw, 
  ChevronRight, Star, Heart, Trash2, Plus, Minus, CheckCircle, 
  Lock, Settings, PlusCircle, Edit3, Eye, DollarSign, Package, 
  BarChart2, Globe, Mail, Phone, ExternalLink, AlertCircle, Send, Check, MessageCircle, Sun, Moon, Upload
} from 'lucide-react';
import logoImg from './logo.png';
import heroBannerImg from './hero-banner.png';
import banner1Img from './style.png';
import banner2Img from './punjabi.png';
import banner3Img from './shirts.png';
import banner4Img from './snekers.png';

const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: "Kyvro Signature Executive Watch",
    category: "Watches",
    gender: "Watches",
    price: 3490,
    originalPrice: 5816,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&q=80&w=800"
    ],
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
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&q=80&w=800",
    images: [
      "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&q=80&w=800"
    ],
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
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800",
    images: [
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800"
    ],
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
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800",
    images: [
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800"
    ],
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
    image: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&q=80&w=800",
    images: [
      "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&q=80&w=800"
    ],
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
  
  // Default isDarkMode set to false so website opens in White Mode first
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Banners Slider State
  const banners = [banner1Img, banner2Img, banner3Img, banner4Img];
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
      image: newProductForm.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
      images: [newProductForm.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800'],
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
    <div className={`min-h-screen flex flex-col font-sans relative transition-colors duration-300 ${isDarkMode ? 'bg-[#0f0f0f] text-gray-100' : 'bg-white text-gray-900'}`}>
      
      {/* 1. ANNOUNCEMENT BAR */}
      <div className={`text-xs font-semibold py-2 overflow-hidden whitespace-nowrap border-b tracking-wider ${isDarkMode ? 'bg-[#1a1a1a] text-[#D4AF37] border-gray-800' : 'bg-gray-100 text-black border-gray-200'}`}>
        <div className="animate-ticker inline-block">
          {announcementText} &nbsp;&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;&nbsp; 24/7 VIP Customer Support: kyvrofashion@gmail.com &nbsp;&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;&nbsp; {announcementText}
        </div>
      </div>

      {/* 2. HEADER */}
      <header className={`sticky top-0 z-40 backdrop-blur border-b ${isDarkMode ? 'bg-[#121212]/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className={`md:hidden ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'}`}
            >
              <Menu size={24} />
            </button>
            <div 
              onClick={() => { setCurrentView('home'); setSelectedCategory('All'); }}
              className="cursor-pointer flex items-center gap-3"
            >
              <div className="flex flex-col items-start">
                <span className={`text-xl sm:text-2xl font-serif font-bold tracking-widest ${isDarkMode ? 'text-white' : 'text-black'}`}>KYVRO</span>
                <span className={`text-[9px] tracking-[0.3em] font-sans -mt-1 ${isDarkMode ? 'text-[#D4AF37]' : 'text-black font-semibold'}`}>কাইভ্রো &bull; WEAR YOUR STORY</span>
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

          <div className="flex items-center gap-4">
            {/* Currency Selector */}
            <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs font-semibold ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-black'}`}>
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
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button 
              onClick={() => setCurrentView('shop')}
              className={`transition ${isDarkMode ? 'text-gray-300 hover:text-[#D4AF37]' : 'text-gray-700 hover:text-[#D4AF37]'}`}
              title="Search"
            >
              <Search size={20} />
            </button>

            <button 
              onClick={() => setCurrentView('admin')}
              className={`transition relative ${isDarkMode ? 'text-gray-300 hover:text-[#D4AF37]' : 'text-gray-700 hover:text-[#D4AF37]'}`}
              title="Admin Panel"
            >
              <User size={20} />
            </button>

            <button 
              onClick={() => setIsCartOpen(true)}
              className={`transition relative flex items-center gap-1 px-3 py-1.5 rounded-full border ${isDarkMode ? 'text-gray-300 bg-[#1a1a1a] border-gray-800' : 'text-gray-800 bg-gray-100 border-gray-300'}`}
            >
              <ShoppingBag size={18} className="text-[#D4AF37]" />
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

      {/* ================= MAIN CONTENT VIEWS ================= */}

      {/* HOME VIEW */}
      {currentView === 'home' && (
        <div className="flex-1">
          {/* Hero Banner */}
          <section className="relative h-[80vh] flex flex-col justify-between items-center text-center bg-cover bg-center py-6" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${heroBannerImg})` }}>
            <div className="w-full flex justify-center pt-2 px-4">
              <span className={`text-xs uppercase tracking-[0.4em] font-semibold px-6 py-2 rounded-full border shadow-xl ${isDarkMode ? 'bg-black/70 text-[#D4AF37] border-[#D4AF37]/50' : 'bg-white/90 text-black border-black/20'}`}>
                KYVRO &bull; কাইভ্রো LUXURY COLLECTION
              </span>
            </div>

            <div></div>

            <div className="w-full flex justify-center pb-20">
              <button 
                onClick={() => setCurrentView('shop')}
                className="bg-[#D4AF37] text-black font-bold px-8 py-4 rounded text-xs tracking-[0.2em] uppercase hover:bg-white transition shadow-2xl transform hover:scale-105"
              >
                Explore Collection
              </button>
            </div>
          </section>

          {/* AUTOMATIC BANNERS SLIDER */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-4">
            <div className="relative h-[350px] sm:h-[450px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-transparent">
              {banners.map((img, idx) => (
                <div 
                  key={idx}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                  <img src={img} alt={`Kyvro Banner ${idx + 1}`} className="w-full h-full object-cover" />
                  
                  <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center">
                    <button 
                      onClick={() => setCurrentView('shop')}
                      className="bg-[#D4AF37] text-black text-xs font-bold px-8 py-3 uppercase tracking-widest rounded shadow-2xl hover:bg-white transition transform hover:scale-105"
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
                    className={`w-3 h-3 rounded-full transition ${idx === currentBannerIndex ? 'bg-[#D4AF37] w-8' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Shop by Category */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-wider">SHOP BY CATEGORY</h2>
              <div className="w-12 h-0.5 bg-[#D4AF37] mx-auto mt-3"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { name: "Men", label: "Men's Collection", image: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&q=80&w=600" },
                { name: "Women", label: "Women's Collection", image: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=600" },
                { name: "Shoes", label: "Shoes", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=600" },
                { name: "Wallets", label: "Wallets", image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&q=80&w=600" },
                { name: "Watches", label: "Watches", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=600" }
              ].map((cat, idx) => (
                <div 
                  key={idx}
                  onClick={() => { setSelectedCategory(cat.name); setCurrentView('shop'); }}
                  className="group relative h-80 rounded-lg overflow-hidden cursor-pointer shadow-xl border border-gray-800"
                >
                  <img src={cat.image} alt={cat.label} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-6">
                    <h3 className="text-lg font-serif font-bold text-white group-hover:text-[#D4AF37] transition">{cat.label}</h3>
                    <p className="text-xs text-gray-300 mt-1 flex items-center gap-1">Shop Now <ChevronRight size={12} /></p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* New Arrivals & Featured Products */}
          <section className={`py-20 border-y ${isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-end mb-12">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">Curated Masterpieces</span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold mt-1">FEATURED & NEW ARRIVALS</h2>
                </div>
                <button 
                  onClick={() => setCurrentView('shop')}
                  className="text-xs font-bold text-[#D4AF37] hover:underline flex items-center gap-1 tracking-wider uppercase"
                >
                  View All Products <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {products.slice(0, 4).map(product => {
                  const discountPct = calculateDiscountPercent(product.price, product.originalPrice);
                  return (
                    <div key={product.id} className={`group rounded-lg overflow-hidden border flex flex-col ${isDarkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="relative h-72 overflow-hidden bg-gray-900 cursor-pointer" onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}>
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        {product.isNew && (
                          <span className="absolute top-3 left-3 bg-[#D4AF37] text-black text-[10px] font-bold px-2.5 py-1 tracking-wider uppercase">
                            New
                          </span>
                        )}
                        {product.originalPrice > product.price && (
                          <div className="absolute top-3 right-3 flex flex-col items-end">
                            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                              Sale
                            </span>
                            {discountPct > 0 && (
                              <span className="bg-black/80 text-[#D4AF37] text-[9px] font-extrabold px-1.5 py-0.5 mt-0.5 rounded shadow">
                                {discountPct}% OFF
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[11px] text-[#D4AF37] uppercase tracking-wider">{product.category}</span>
                          <h3 
                            onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}
                            className="text-base font-serif font-semibold mt-1 cursor-pointer hover:text-[#D4AF37] transition line-clamp-1"
                          >
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-base font-bold">{formatPrice(product.price)}</span>
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
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              {[
                { icon: Shield, title: "Uncompromising Quality", desc: "Hand-selected fabrics, genuine leather, and premium stainless steel materials." },
                { icon: Truck, title: "Secure Worldwide Delivery", desc: "Fast, insured shipping directly to your doorstep with real-time tracking." },
                { icon: RefreshCw, title: "Hassle-Free Returns", desc: "30-day return policy for peace of mind and absolute customer satisfaction." },
                { icon: User, title: "24/7 VIP Support", desc: "Dedicated assistance anytime at kyvrofashion@gmail.com." }
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div key={idx} className={`p-8 rounded-lg border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <IconComponent size={36} className="mx-auto text-[#D4AF37] mb-4" />
                    <h4 className="font-serif font-bold mb-2">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Newsletter Subscription */}
          <section className={`border-t py-16 ${isDarkMode ? 'bg-[#151515] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
            <div className="max-w-3xl mx-auto px-4 text-center space-y-4">
              <h3 className="text-2xl font-serif font-bold">JOIN THE KYVRO CIRCLE</h3>
              <p className="text-xs text-gray-500">Subscribe to receive private sale invites, style guides, and exclusive voucher codes.</p>
              <form onSubmit={(e) => { e.preventDefault(); alert('Thank you for subscribing to Kyvro!'); }} className="flex gap-2 max-w-md mx-auto pt-2">
                <input 
                  type="email" 
                  placeholder="Enter your email address" 
                  required 
                  className={`flex-1 border px-4 py-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#1f1f1f] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                />
                <button type="submit" className="bg-[#D4AF37] text-black font-bold px-6 py-3 text-xs tracking-wider uppercase rounded hover:opacity-90 transition">
                  Subscribe
                </button>
              </form>
            </div>
          </section>
        </div>
      )}

      {/* SHOP CATALOG VIEW */}
      {currentView === 'shop' && (
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold">
                {selectedCategory === 'All' ? 'Complete Collection' : `${selectedCategory} Collection`}
              </h1>
              <p className="text-xs text-gray-500 mt-1">Showing {filteredProducts.length} luxury products</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <input 
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`border px-4 py-2 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#181818] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
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
            {/* Sidebar Categories */}
            <div className="space-y-6">
              <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <h3 className="text-sm font-serif font-bold mb-4 uppercase tracking-wider">Categories</h3>
                <div className="flex flex-col space-y-2 text-xs">
                  <button onClick={() => setSelectedCategory('All')} className={`text-left py-2 px-3 rounded transition ${selectedCategory === 'All' ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`}>All Products</button>
                  
                  <div className="pt-2 pb-1 text-[#D4AF37] font-bold uppercase tracking-widest text-[10px]">Collections</div>
                  <button onClick={() => setSelectedCategory('Men')} className={`text-left py-1.5 px-4 rounded transition ml-2 ${selectedCategory === 'Men' ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`}>&bull; Men's Collection</button>
                  <button onClick={() => setSelectedCategory('Women')} className={`text-left py-1.5 px-4 rounded transition ml-2 ${selectedCategory === 'Women' ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`}>&bull; Women's Collection</button>
                  <button onClick={() => setSelectedCategory('Shoes')} className={`text-left py-1.5 px-4 rounded transition ml-2 ${selectedCategory === 'Shoes' ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`}>&bull; Shoes</button>
                  <button onClick={() => setSelectedCategory('Wallets')} className={`text-left py-1.5 px-4 rounded transition ml-2 ${selectedCategory === 'Wallets' ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`}>&bull; Wallets</button>
                  <button onClick={() => setSelectedCategory('Watches')} className={`text-left py-1.5 px-4 rounded transition ml-2 ${selectedCategory === 'Watches' ? 'bg-[#D4AF37] text-black font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#222]'}`}>&bull; Watches</button>
                </div>
              </div>

              <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <h3 className="text-sm font-serif font-bold mb-4 uppercase tracking-wider">Price Filter</h3>
                <input 
                  type="range" 
                  min="50" 
                  max="15000" 
                  step="500"
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(Number(e.target.value))}
                  className="w-full accent-[#D4AF37]"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{formatPrice(50)}</span>
                  <span>Max: {formatPrice(priceFilter)}</span>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="lg:col-span-3">
              {filteredProducts.length === 0 ? (
                <div className={`py-24 text-center rounded-lg border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200'}`}>
                  <p className="text-gray-500 text-sm mb-4">No products found in "{selectedCategory}".</p>
                  <button 
                    onClick={() => { setSelectedCategory('All'); setSearchQuery(''); setPriceFilter(15000); }}
                    className="bg-[#D4AF37] text-black text-xs font-bold px-6 py-3 uppercase tracking-widest rounded"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map(product => {
                    const discountPct = calculateDiscountPercent(product.price, product.originalPrice);
                    return (
                      <div key={product.id} className={`group rounded-lg overflow-hidden border flex flex-col ${isDarkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="relative h-64 overflow-hidden bg-gray-900 cursor-pointer" onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }}>
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                          {product.originalPrice > product.price && (
                            <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">Sale</span>
                          )}
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider">{product.category}</span>
                            <h3 onClick={() => { setSelectedProduct(product); setCurrentView('product-detail'); }} className="text-sm font-semibold mt-1 cursor-pointer hover:text-[#D4AF37] line-clamp-1">
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-sm font-bold">{formatPrice(product.price)}</span>
                              {product.originalPrice > product.price && (
                                <span className="text-xs text-gray-500 line-through">{formatPrice(product.originalPrice)}</span>
                              )}
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
                            <a 
                              href={`https://wa.me/60123456789?text=Hello%20Kyvro,%20I%20want%20to%20order:%0A*%20Name:%20${encodeURIComponent(product.name)}%0A*%20Price:%20${encodeURIComponent(formatPrice(product.price))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full bg-[#25D366] text-white font-bold py-2 rounded text-[10px] uppercase tracking-wider hover:opacity-90 transition flex items-center justify-center gap-1 shadow"
                            >
                              <MessageCircle size={12} /> Order on WhatsApp
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DETAIL VIEW */}
      {currentView === 'product-detail' && selectedProduct && (() => {
        const [selectedColor, setSelectedColor] = useState(selectedProduct.colors[0]);
        const [selectedSize, setSelectedSize] = useState(Array.isArray(selectedProduct.sizes) ? selectedProduct.sizes[0] : (selectedProduct.sizes || 'Standard'));
        const [qty, setQty] = useState(1);
        const [activeImg, setActiveImg] = useState(selectedProduct.image);
        const detailDiscount = calculateDiscountPercent(selectedProduct.price, selectedProduct.originalPrice);

        return (
          <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
            <button onClick={() => setCurrentView('shop')} className="text-xs text-[#D4AF37] mb-8 hover:underline flex items-center gap-1">
              &larr; Back to Collection
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-4">
                <div className={`h-[450px] rounded-lg overflow-hidden border relative ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200'}`}>
                  <img src={activeImg} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  {detailDiscount > 0 && (
                    <span className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded shadow uppercase tracking-wider">
                      {detailDiscount}% OFF Sale
                    </span>
                  )}
                </div>
                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <div className="flex gap-4">
                    {selectedProduct.images.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img} 
                        onClick={() => setActiveImg(img)} 
                        className={`w-20 h-20 object-cover rounded cursor-pointer border ${activeImg === img ? 'border-[#D4AF37]' : 'border-gray-300 dark:border-gray-800'}`} 
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">{selectedProduct.category}</span>
                  <h1 className="text-3xl font-serif font-bold mt-1">{selectedProduct.name}</h1>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-2xl font-bold">{formatPrice(selectedProduct.price)}</span>
                    {selectedProduct.originalPrice > selectedProduct.price && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 line-through">{formatPrice(selectedProduct.originalPrice)}</span>
                        {detailDiscount > 0 && (
                          <span className="text-xs bg-red-500/20 text-red-500 font-bold px-2 py-0.5 rounded">
                            Save {detailDiscount}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-gray-500 text-sm leading-relaxed">{selectedProduct.description}</p>

                {/* Color Selector */}
                {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Color: <span className="font-bold">{selectedColor}</span></label>
                    <div className="flex gap-3">
                      {selectedProduct.colors.map(col => (
                        <button
                          key={col}
                          onClick={() => setSelectedColor(col)}
                          className={`px-4 py-2 text-xs rounded border transition ${selectedColor === col ? 'border-[#D4AF37] bg-[#D4AF37]/10 font-bold' : 'border-gray-300 dark:border-gray-700 text-gray-500'}`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Selector */}
                {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Size: <span className="font-bold">{selectedSize}</span></label>
                    <div className="flex gap-3">
                      {(Array.isArray(selectedProduct.sizes) ? selectedProduct.sizes : [selectedProduct.sizes]).map(sz => (
                        <button
                          key={sz}
                          onClick={() => setSelectedSize(sz)}
                          className={`px-4 py-2 text-xs rounded border transition ${selectedSize === sz ? 'border-[#D4AF37] bg-[#D4AF37]/10 font-bold' : 'border-gray-300 dark:border-gray-700 text-gray-500'}`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Quantity</label>
                  <div className={`flex items-center border w-32 rounded ${isDarkMode ? 'border-gray-700 bg-[#161616]' : 'border-gray-300 bg-white'}`}>
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-gray-400 hover:text-black">-</button>
                    <span className="flex-1 text-center text-sm font-bold">{qty}</span>
                    <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-gray-400 hover:text-black">+</button>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    onClick={() => addToCart(selectedProduct, selectedColor, selectedSize, qty)}
                    className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded text-xs tracking-widest uppercase hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ShoppingBag size={18} /> Add to Cart
                  </button>
                  
                  <a 
                    href={`https://wa.me/60123456789?text=Hello%20Kyvro,%20I%20want%20to%20order%20this%20product:%0A*%20Name:%20${encodeURIComponent(selectedProduct.name)}%0A*%20Price:%20${encodeURIComponent(formatPrice(selectedProduct.price))}%0A*%20Color:%20${encodeURIComponent(selectedColor)}%0A*%20Size:%20${encodeURIComponent(selectedSize)}%0A*%20Qty:%20${qty}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] text-white font-bold py-4 rounded text-xs tracking-widest uppercase hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <MessageCircle size={18} /> Order on WhatsApp
                  </a>
                </div>

                <div className="border-t pt-6 space-y-2 text-xs text-gray-500">
                  <p className="flex items-center gap-2"><Truck size={14} className="text-[#D4AF37]" /> Free shipping on orders over {formatPrice(freeShippingThreshold)}</p>
                  <p className="flex items-center gap-2"><Shield size={14} className="text-[#D4AF37]" /> Authentic luxury guaranteed with 30-day return policy</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CHECKOUT VIEW */}
      {currentView === 'checkout' && (
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <h1 className="text-3xl font-serif font-bold mb-8">SECURE CHECKOUT</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <form onSubmit={handleCheckoutSubmit} className={`space-y-8 p-8 rounded-lg border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div>
                  <h3 className="text-base font-serif font-bold mb-4 uppercase tracking-wider flex items-center gap-2">
                    <User size={18} className="text-[#D4AF37]" /> Customer & Delivery Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={checkoutForm.fullName}
                        onChange={e => setCheckoutForm({...checkoutForm, fullName: e.target.value})}
                        className={`w-full border p-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Phone *</label>
                      <input 
                        type="text" 
                        required 
                        value={checkoutForm.phone}
                        onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})}
                        className={`w-full border p-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                        placeholder="Enter customer phone"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Address *</label>
                      <textarea 
                        required 
                        rows="2"
                        value={checkoutForm.address}
                        onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})}
                        className={`w-full border p-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                        placeholder="Enter customer address"
                      ></textarea>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Custom Note</label>
                      <textarea 
                        rows="2"
                        value={checkoutForm.notes}
                        onChange={e => setCheckoutForm({...checkoutForm, notes: e.target.value})}
                        className={`w-full border p-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                        placeholder="Enter custom note"
                      ></textarea>
                    </div>

                    <div className={`sm:col-span-2 grid grid-cols-3 gap-3 p-4 rounded border ${isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">City / District *</label>
                        <select 
                          value={checkoutForm.city}
                          onChange={e => setCheckoutForm({...checkoutForm, city: e.target.value})}
                          className={`w-full border p-2 text-xs rounded ${isDarkMode ? 'bg-[#181818] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                          required
                        >
                          <option value="">Select City</option>
                          <option value="Dhaka">Dhaka</option>
                          <option value="Chittagong">Chittagong</option>
                          <option value="Sylhet">Sylhet</option>
                          <option value="Kuala Lumpur">Kuala Lumpur</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Zone *</label>
                        <select 
                          value={checkoutForm.zone}
                          onChange={e => setCheckoutForm({...checkoutForm, zone: e.target.value})}
                          className={`w-full border p-2 text-xs rounded ${isDarkMode ? 'bg-[#181818] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                          required
                        >
                          <option value="">Select Zone</option>
                          <option value="Inside City">Inside City</option>
                          <option value="Outside City">Outside City</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Area</label>
                        <input 
                          type="text"
                          value={checkoutForm.area}
                          onChange={e => setCheckoutForm({...checkoutForm, area: e.target.value})}
                          className={`w-full border p-2 text-xs rounded ${isDarkMode ? 'bg-[#181818] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                          placeholder="Area name"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base font-serif font-bold uppercase tracking-wider flex items-center gap-2">
                    <Shield size={18} className="text-[#D4AF37]" /> Payment Options
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">Payment type</label>
                    <div className="flex gap-4">
                      {['Full Payment', 'Partial Payment'].map(type => (
                        <label key={type} className={`flex-1 p-3 rounded border cursor-pointer text-center text-xs font-semibold ${checkoutForm.paymentType === type ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-gray-300 dark:border-gray-700 text-gray-500'}`}>
                          <input 
                            type="radio" 
                            name="paymentType" 
                            checked={checkoutForm.paymentType === type}
                            onChange={() => setCheckoutForm({...checkoutForm, paymentType: type})}
                            className="mr-2 accent-[#D4AF37]"
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">Did customer pay advance delivery charge?</label>
                    <div className="flex gap-4">
                      {['Yes', 'No'].map(val => (
                        <label key={val} className={`flex-1 p-3 rounded border cursor-pointer text-center text-xs font-semibold ${checkoutForm.advancePaid === val ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-gray-300 dark:border-gray-700 text-gray-500'}`}>
                          <input 
                            type="radio" 
                            name="advancePaid" 
                            checked={checkoutForm.advancePaid === val}
                            onChange={() => setCheckoutForm({...checkoutForm, advancePaid: val})}
                            className="mr-2 accent-[#D4AF37]"
                          />
                          {val}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">Pay delivery fee via</label>
                    <div className="flex gap-4">
                      {['Account Wallet', 'SSL Commerz'].map(method => (
                        <label key={method} className={`flex-1 p-3 rounded border cursor-pointer text-center text-xs font-semibold ${checkoutForm.paymentMethod === method ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-gray-300 dark:border-gray-700 text-gray-500'}`}>
                          <input 
                            type="radio" 
                            name="paymentMethod" 
                            checked={checkoutForm.paymentMethod === method}
                            onChange={() => setCheckoutForm({...checkoutForm, paymentMethod: method})}
                            className="mr-2 accent-[#D4AF37]"
                          />
                          {method}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded text-xs tracking-widest uppercase hover:opacity-90 transition shadow-xl"
                >
                  Confirm Order ({formatPrice(grandTotal)})
                </button>
              </form>
            </div>

            {/* Order Summary Sidebar */}
            <div>
              <div className={`p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <h3 className="text-sm font-serif font-bold uppercase tracking-wider pb-3 border-b">Customer order</h3>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.cartItemId} className={`flex justify-between items-center text-xs p-3 rounded border ${isDarkMode ? 'bg-[#1f1f1f] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                      <div className="flex items-center gap-3">
                        <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                        <div>
                          <p className="font-medium line-clamp-1">{item.name}</p>
                          <p className="text-gray-400 text-[10px]">Qty: {item.quantity} | {item.selectedColor}</p>
                          <p className="text-[#D4AF37] font-bold mt-1">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Purchase cost</span>
                    <span>{formatPrice(subtotal * 0.5)}</span>
                  </div>
                  <div className="flex justify-between text-[#D4AF37] font-bold">
                    <span>Profit amount</span>
                    <span>{formatPrice(subtotal * 0.5)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery Charge</span>
                    <span>{checkoutForm.city ? formatPrice(shippingFee) : 'Select a city'}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t">
                    <span>Customer due on delivery</span>
                    <span className="text-[#D4AF37]">{formatPrice(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDER SUCCESS VIEW */}
      {currentView === 'order-success' && orderCompleteData && (
        <div className="flex-1 max-w-2xl mx-auto px-4 py-20 text-center">
          <div className={`p-10 rounded-xl border space-y-6 shadow-2xl ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200'}`}>
            <CheckCircle size={64} className="mx-auto text-[#D4AF37]" />
            <h1 className="text-3xl font-serif font-bold">ORDER PLACED SUCCESSFULLY</h1>
            <p className="text-xs text-gray-500">Thank you for shopping with <strong className="font-bold">Kyvro (কাইভ্রো)</strong>. Your order has been saved and our team has been notified.</p>
            
            <div className={`p-6 rounded text-left space-y-2 border text-xs ${isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
              <p className="text-[#D4AF37] font-bold">Order Number: {orderCompleteData.orderNumber}</p>
              <p>Customer Name: {orderCompleteData.customer.fullName}</p>
              <p>Delivery Address: {orderCompleteData.customer.address}, {orderCompleteData.customer.city} ({orderCompleteData.customer.zone})</p>
              <p>Total Amount: <span className="text-[#D4AF37] font-bold">{formatPrice(orderCompleteData.total)}</span> ({orderCompleteData.customer.paymentType})</p>
              <p className="text-gray-400 pt-2 border-t">Email notification sent to store admin at <span className="font-bold">kyvrofashion@gmail.com</span></p>
            </div>

            <button 
              onClick={() => { setCurrentView('home'); }}
              className="bg-[#D4AF37] text-black text-xs font-bold px-8 py-3.5 uppercase tracking-widest rounded hover:opacity-90 transition"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      )}

      {/* ADMIN DASHBOARD VIEW */}
      {currentView === 'admin' && (
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          {!isAdminLoggedIn ? (
            <div className={`max-w-md mx-auto p-8 rounded-xl border shadow-2xl space-y-6 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="text-center space-y-2">
                <Lock size={40} className="mx-auto text-[#D4AF37]" />
                <h2 className="text-2xl font-serif font-bold">KYVRO ADMIN PORTAL</h2>
                <p className="text-xs text-gray-500">Restricted access for store owners only. Enter PIN to manage products and orders.</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Admin Security PIN</label>
                  <input 
                    type="password" 
                    required
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Enter PIN (e.g. admin123)"
                    className={`w-full border p-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                  />
                </div>
                <button type="submit" className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded text-xs uppercase tracking-widest hover:opacity-90 transition">
                  Access Dashboard
                </button>
              </form>
              <p className="text-[11px] text-center text-gray-500">Default PIN for testing: <code className="text-[#D4AF37]">admin123</code></p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-lg border gap-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div>
                  <h1 className="text-2xl font-serif font-bold">Kyvro Management Dashboard</h1>
                  <p className="text-xs text-gray-500">Logged in as Owner | Email: kyvrofashion@gmail.com | Domain: www.kyvro.store</p>
                </div>
                <button 
                  onClick={() => setIsAdminLoggedIn(false)}
                  className="bg-gray-800 hover:bg-red-900 text-gray-300 px-4 py-2 rounded text-xs font-bold transition"
                >
                  Logout Admin
                </button>
              </div>

              {/* Admin Navigation Tabs */}
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
                <button 
                  onClick={() => setAdminTab('settings')} 
                  className={`px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition ${adminTab === 'settings' ? 'bg-[#D4AF37] text-black' : 'bg-gray-200 dark:bg-[#181818] text-gray-700 dark:text-gray-300'}`}
                >
                  Store Settings
                </button>
              </div>

              {/* TAB 1: PRODUCTS LIST */}
              {adminTab === 'products' && (
                <div className={`rounded-lg border overflow-x-auto ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`uppercase tracking-wider border-b ${isDarkMode ? 'bg-[#1f1f1f] text-gray-400 border-gray-800' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      <tr>
                        <th className="p-4">Product</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Price</th>
                        <th className="p-4">Stock & Sizes</th>
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
                          <td className="p-4 text-gray-500">{p.stock} units ({Array.isArray(p.sizes) ? p.sizes.join(', ') : p.sizes})</td>
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

              {/* TAB 2: ADD / EDIT PRODUCT */}
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
                        placeholder="e.g. Silk Executive Suit"
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
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Sub Category *</label>
                      <select 
                        value={newProductForm.category}
                        onChange={e => setNewProductForm({...newProductForm, category: e.target.value})}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                      >
                        {newProductForm.gender === 'Men' && (
                          <>
                            <option value="Shirt">Shirt</option>
                            <option value="Punjabi">Punjabi</option>
                            <option value="Polo">Polo</option>
                            <option value="T-shirt">T-shirt</option>
                            <option value="Joggers & Sweats">Joggers & Sweats</option>
                            <option value="Jersey">Jersey</option>
                          </>
                        )}
                        {newProductForm.gender === 'Women' && (
                          <>
                            <option value="Sharee">Sharee</option>
                            <option value="Bags">Bags</option>
                            <option value="Western Wear">Western Wear</option>
                            <option value="Muslim Wear">Muslim Wear</option>
                          </>
                        )}
                        {newProductForm.gender === 'Shoes' && <option value="Shoes">Shoes</option>}
                        {newProductForm.gender === 'Wallets' && <option value="Wallets">Wallets</option>}
                        {newProductForm.gender === 'Watches' && <option value="Watches">Watches</option>}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Selling Price (BDT) *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        required 
                        value={newProductForm.price}
                        onChange={e => setNewProductForm({...newProductForm, price: e.target.value})}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                        placeholder="2990"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Original Price (BDT - for Sale %)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={newProductForm.originalPrice}
                        onChange={e => setNewProductForm({...newProductForm, originalPrice: e.target.value})}
                        className={`w-full border p-3 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                        placeholder="4990"
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
                        placeholder="10"
                      />
                    </div>

                    {/* Size Checkboxes */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Available Sizes (Check to include) *</label>
                      <div className="flex flex-wrap gap-4">
                        {AVAILABLE_SIZES_LIST.map(sz => (
                          <label key={sz} className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer text-xs font-medium ${newProductForm.sizes?.includes(sz) ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-gray-700 text-gray-400'}`}>
                            <input 
                              type="checkbox"
                              checked={newProductForm.sizes?.includes(sz)}
                              onChange={() => handleSizeCheckboxChange(sz)}
                              className="accent-[#D4AF37]"
                            />
                            {sz}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Product Image (Upload from Computer or Image URL) *</label>
                      <div className="flex gap-3 items-center">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          className={`flex-1 border p-2 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                        />
                        <span className="text-xs text-gray-400">OR paste URL below</span>
                      </div>
                      <input 
                        type="url" 
                        value={newProductForm.image}
                        onChange={e => setNewProductForm({...newProductForm, image: e.target.value})}
                        className={`w-full border p-3 text-xs rounded mt-2 ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
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

              {/* TAB 3: ORDERS MANAGEMENT */}
              {adminTab === 'orders' && (
                <div className="space-y-6">
                  <div className={`flex justify-between items-center p-4 rounded border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <p className="text-xs text-gray-500">Total Orders Received: <strong className="font-bold">{orders.length}</strong></p>
                    <button onClick={exportOrdersCSV} className="bg-[#D4AF37] text-black text-xs font-bold px-4 py-2 rounded uppercase tracking-wider">
                      Export Orders to CSV
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className={`p-12 text-center rounded border text-xs text-gray-500 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200'}`}>
                      No customer orders received yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((ord, idx) => (
                        <div key={idx} className={`p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                          <div className="flex flex-col sm:flex-row justify-between border-b pb-3 gap-2">
                            <div>
                              <span className="text-sm font-bold text-[#D4AF37]">{ord.orderNumber}</span>
                              <p className="text-xs text-gray-500">{new Date(ord.date).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold">{formatPrice(ord.total)}</span>
                              <p className="text-xs text-[#D4AF37]">{ord.paymentStatus}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="font-semibold">Customer Details:</p>
                              <p className="text-gray-500">{ord.customer.fullName} ({ord.customer.phone})</p>
                              <p className="text-gray-500">{ord.customer.address}, {ord.customer.city} - {ord.customer.zone}</p>
                            </div>
                            <div>
                              <p className="font-semibold">Ordered Items:</p>
                              <ul className="list-disc list-inside text-gray-500">
                                {ord.items.map((it, i) => (
                                  <li key={i}>{it.name} (Qty: {it.quantity}) - {formatPrice(it.price * it.quantity)}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: STORE SETTINGS */}
              {adminTab === 'settings' && (
                <div className={`p-8 rounded-lg border space-y-6 max-w-2xl ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <h3 className="text-lg font-serif font-bold border-b pb-3">Store Configuration & Ticker</h3>
                  
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-gray-500 mb-1">Announcement Ticker Message</label>
                      <input 
                        type="text" 
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        className={`w-full border p-3 rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-500 mb-1">Owner Email Notification Address</label>
                      <input 
                        type="email" 
                        value="kyvrofashion@gmail.com" 
                        disabled
                        className="w-full bg-gray-200 dark:bg-[#121212] border p-3 text-gray-500 rounded cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-500 mb-1">Domain & Instagram Handle</label>
                      <input 
                        type="text" 
                        value="www.kyvro.store | @kyvro_fashion" 
                        disabled
                        className="w-full bg-gray-200 dark:bg-[#121212] border p-3 text-gray-500 rounded cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <footer className={`border-t pt-16 pb-12 mt-auto ${isDarkMode ? 'bg-[#121212] border-gray-800 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10 text-xs">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src={logoImg} 
                alt="Kyvro Logo" 
                className="h-12 w-auto object-contain" 
                style={{ mixBlendMode: isDarkMode ? 'screen' : 'multiply' }} 
              />
              <div className="flex flex-col items-start">
                <span className={`text-xl font-serif font-bold tracking-widest ${isDarkMode ? 'text-white' : 'text-black'}`}>KYVRO</span>
                <span className={`text-[9px] tracking-[0.3em] font-sans -mt-1 ${isDarkMode ? 'text-[#D4AF37]' : 'text-black font-semibold'}`}>কাইভ্রো &bull; WEAR YOUR STORY</span>
              </div>
            </div>
            <p className="leading-relaxed">
              Kyvro offers stylish, comfortable, and affordable clothing made for everyday wear. Discover premium fabrics, modern designs, and perfect fits—crafted to keep you confident all day.
            </p>
            <p className={`font-semibold ${isDarkMode ? 'text-[#D4AF37]' : 'text-black'}`}>Domain: www.kyvro.store</p>
          </div>

          <div>
            <h4 className={`font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Customer Care</h4>
            <ul className="space-y-2">
              <li><button onClick={() => setCurrentView('shop')} className="hover:text-[#D4AF37]">Shop Collection</button></li>
              <li><a href="mailto:kyvrofashion@gmail.com" className="hover:text-[#D4AF37]">24/7 Support: kyvrofashion@gmail.com</a></li>
              <li><span>Facebook: www.facebook.com/kyvrofashion</span></li>
              <li><span>Instagram: @kyvro_fashion</span></li>
              <li><span>TikTok: tiktok.com/@kyvro.store</span></li>
            </ul>
          </div>

          <div>
            <h4 className={`font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Categories</h4>
            <ul className="space-y-2">
              <li><button onClick={() => { setSelectedCategory("Men"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Men's Collection</button></li>
              <li><button onClick={() => { setSelectedCategory("Women"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Women's Collection</button></li>
              <li><button onClick={() => { setSelectedCategory("Shoes"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Shoes</button></li>
              <li><button onClick={() => { setSelectedCategory("Wallets"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Wallets</button></li>
              <li><button onClick={() => { setSelectedCategory("Watches"); setCurrentView('shop'); }} className="hover:text-[#D4AF37]">Watches</button></li>
            </ul>
          </div>

          <div>
            <h4 className={`font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Secure Shopping</h4>
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t text-center text-gray-500 text-[11px]">
          &copy; 2026 Kyvro - কাইভ্রো &bull; www.kyvro.store. All rights reserved.
        </div>
      </footer>

      {/* FLOATING LIVE CHAT WIDGET */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {isChatOpen && (
          <div className={`border p-4 rounded-xl shadow-2xl w-64 space-y-3 ${isDarkMode ? 'bg-[#181818] border-gray-700 text-white' : 'bg-white border-gray-200 text-black'}`}>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle size={14} className="text-[#D4AF37]" /> Chat with Kyvro
              </span>
              <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-black dark:hover:text-white text-sm font-bold">&times;</button>
            </div>
            <p className="text-[11px] text-gray-500">Hello! How can we help you with your order or style today?</p>
            <div className="space-y-2 pt-1">
              <a 
                href="https://wa.me/60123456789?text=Hello%20Kyvro,%20I%20want%20to%20know%20more%20about%20your%20products." 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#25D366] text-black text-xs font-bold p-2.5 rounded hover:opacity-90 transition text-center justify-center"
              >
                <Phone size={14} /> Chat on WhatsApp
              </a>
              <a 
                href="https://www.instagram.com/kyvro_fashion" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-500 text-white text-xs font-bold p-2.5 rounded hover:opacity-90 transition text-center justify-center"
              >
                <ExternalLink size={14} /> Message on Instagram
              </a>
            </div>
          </div>
        )}

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-[#D4AF37] text-black p-3.5 rounded-full shadow-2xl hover:opacity-90 transition flex items-center justify-center group relative"
          title="Live Chat Support"
        >
          <MessageCircle size={24} className="group-hover:scale-110 transition" />
          <span className={`absolute right-14 text-[10px] px-2 py-1 rounded shadow border whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none ${isDarkMode ? 'bg-[#181818] text-white border-gray-700' : 'bg-white text-black border-gray-300'}`}>
            Live Chat Support
          </span>
        </button>
      </div>

    </div>
  );
}