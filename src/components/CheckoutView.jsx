import React, { useState, useEffect } from 'react';
import { deliveryAreaFor, DELIVERY_AREAS, DELIVERY_AREA_BN, DELIVERY_CHARGES, PAYMENT_METHODS, PAYMENT_METHOD_BN, toBanglaDigits } from '../data/shopConfig';

export default function CheckoutView({
  cart, checkoutForm, setCheckoutForm, checkoutError, deliveryCharge, grandTotal, formatPrice,
  handleCheckoutSubmit, isDarkMode, placingOrder, removeFromCart, updateCartQty, setCurrentView, subtotal, discount = 0, discountLabel = '', customerUser = null, authReady = true, onSignIn,
}) {
  const set = (field, value) => setCheckoutForm({ ...checkoutForm, [field]: value });

  // Bangladesh districts -> thanas / upazilas -> areas (unions). Loaded when the checkout opens, not with the first page.
  const [places, setPlaces] = useState([]);
  useEffect(() => {
    let alive = true;
    import('../data/bdLocations.json').then((m) => { if (alive) setPlaces(m.default || m); });
    return () => { alive = false; };
  }, []);
  const districtObj = places.find((d) => d.n === checkoutForm.district);
  const upazilaObj = districtObj && districtObj.u.find((u) => u.n === checkoutForm.upazila);
  // picking a place also works out Inside / Outside Dhaka (so the delivery charge cannot be picked by hand)
  const setPlace = (patch) => {
    const next = { ...checkoutForm, ...patch };
    const d = places.find((x) => x.n === next.district);
    const z = d && d.u.find((x) => x.n === next.upazila);
    next.deliveryArea = deliveryAreaFor(next.district, next.upazila, !!(z && z.m));
    setCheckoutForm(next);
  };
  const online = checkoutForm.paymentMethod === 'Online Payment';
  const areaChosen = !!checkoutForm.deliveryArea;

  const panel = `rounded-lg border p-5 sm:p-7 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-gray-50 border-gray-200'}`;
  const input = `w-full border p-3 text-sm rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;
  const label = 'block text-sm font-semibold mb-1.5';

  if (cart.length === 0) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-4 py-20 text-center w-full">
        <h1 className="text-2xl font-serif font-bold mb-2">Your cart is empty</h1>
        <p className="text-sm text-gray-500 mb-6">Add something you like to your cart, then come back to checkout.</p>
        <button onClick={() => setCurrentView('shop')} className="bg-[#D4AF37] text-black text-xs font-bold px-6 py-3 tracking-widest uppercase rounded hover:opacity-90 transition">
          Start Shopping
        </button>
      </div>
    );
  }

  // Your cart works without an account, but placing the order needs a Google sign-in (the cart stays as it is)
  if (!customerUser) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full">
        <button onClick={() => setCurrentView('shop')} className="text-xs text-gray-500 hover:text-[#D4AF37] mb-4">&larr; Continue shopping</button>
        <div className={`${panel} text-center space-y-4`}>
          <h1 className="text-2xl font-serif font-bold">Sign in to place your order</h1>
          <p className="text-sm text-gray-500">অর্ডার করতে আপনার Google অ্যাকাউন্ট দিয়ে সাইন ইন করুন। আপনার কার্টের সব প্রোডাক্ট যেমন আছে তেমনই থাকবে।</p>
          <div className="space-y-2 text-left max-w-md mx-auto">
            {cart.map((item) => (
              <div key={item.cartItemId} className={`flex items-center gap-3 p-2 rounded border ${isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-white border-gray-200'}`}>
                <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                <span className="flex-1 min-w-0 text-sm font-semibold truncate">{item.name} &times; {item.quantity}</span>
                <span className="text-sm font-bold">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <button onClick={onSignIn} disabled={!authReady} className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] text-black text-xs font-bold px-8 py-3.5 tracking-widest uppercase rounded hover:opacity-90 transition disabled:opacity-60">
            {authReady ? 'Continue with Google' : 'Please wait...'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
      <button onClick={() => setCurrentView('shop')} className="text-xs text-gray-500 hover:text-[#D4AF37] mb-4">&larr; Continue shopping</button>
      <h1 className="text-3xl font-serif font-bold mb-4">Checkout</h1>
      <p className="text-sm font-semibold text-red-500 mb-6">
        বিঃদ্রঃ দ্রুত ডেলিভারী নিশ্চিত করার জন্য সঠিক ভাবে আপনার ঠিকানা লিখুন (জেলা উপজেলা উল্লেখ করুন)।
      </p>

      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
        {/* BILLING & SHIPPING */}
        <div className={`${panel} lg:col-span-3 space-y-5`}>
          <h2 className="text-xl font-bold border-b pb-3">Billing &amp; Shipping Information</h2>

          <div>
            <label className={label}>Your Name (আপনার নাম) *</label>
            <input type="text" required maxLength={80} value={checkoutForm.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Your Name" className={input} />
          </div>

          <div>
            <label className={label}>Phone (আপনার ফোন নম্বর) *</label>
            <input type="tel" required maxLength={20} value={checkoutForm.phone} onChange={(e) => set('phone', e.target.value.replace(/[^0-9+\-\s()]/g, ''))} placeholder="Phone Number" className={input} />
          </div>

          <div className={`rounded border p-4 space-y-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-300 bg-white'}`}>
            <p className="text-sm font-bold">Delivery City &amp; Zone (ডেলিভারি এলাকা)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">City (জেলা) *</label>
                <select required value={checkoutForm.district} onChange={(e) => setPlace({ district: e.target.value, upazila: '', area: '' })} className={input}>
                  <option value="">{places.length ? 'Select City' : 'Loading...'}</option>
                  {places.map((d) => <option key={d.n} value={d.n}>{d.n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Zone (থানা / উপজেলা) *</label>
                <select required disabled={!districtObj} value={checkoutForm.upazila} onChange={(e) => setPlace({ upazila: e.target.value, area: '' })} className={`${input} disabled:opacity-60`}>
                  <option value="">{districtObj ? 'Select Zone' : 'Select city first'}</option>
                  {districtObj && districtObj.u.map((u) => <option key={u.n} value={u.n}>{u.n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Area (এলাকা / ইউনিয়ন)</label>
                <select disabled={!upazilaObj || upazilaObj.a.length === 0} value={checkoutForm.area} onChange={(e) => set('area', e.target.value)} className={`${input} disabled:opacity-60`}>
                  <option value="">{!upazilaObj ? 'Select zone first' : upazilaObj.a.length ? 'Select Area (optional)' : 'Write your area below'}</option>
                  {upazilaObj && upazilaObj.a.map((a, i) => <option key={a[0] + i} value={a[0]}>{a[0]}{a[1] ? ` (PO: ${a[1]}${a[2] ? ', ' + a[2] : ''})` : ''}</option>)}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-gray-500">Selecting city &amp; zone helps ensure accurate courier delivery. Your exact village / road goes in the box below.</p>
          </div>

          <div>
            <label className={label}>House / Road / Village (বাড়ি, রাস্তা, গ্রামের নাম) *</label>
            <textarea required rows={3} maxLength={250} value={checkoutForm.address} onChange={(e) => set('address', e.target.value)} placeholder="House number, Road number, Village, nearby landmark" className={input} />
          </div>

          <div>
            <label className={label}>Comments (আপনার কোন মন্তব্য থাকলে এখানে লিখুন)</label>
            <textarea rows={3} maxLength={500} value={checkoutForm.notes} onChange={(e) => set('notes', e.target.value)} placeholder="আপনার কোন মন্তব্য থাকলে এখানে লিখুন" className={input} />
          </div>
        </div>

        {/* ORDER SUMMARY */}
        <div className={`${panel} lg:col-span-2 space-y-5`}>
          <h2 className="text-xl font-bold border-b pb-3">Order Summary</h2>
          <p className="text-sm text-gray-500">{cart.reduce((n, i) => n + i.quantity, 0)} item(s) in cart</p>

          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.cartItemId} className={`flex gap-3 p-3 rounded border ${isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-white border-gray-200'}`}>
                <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.selectedColor && <>Color: {item.selectedColor}<br /></>}
                    {item.selectedSize && item.selectedSize !== 'Standard' && <>Size: {item.selectedSize}</>}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`inline-flex items-center border rounded ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      <button type="button" disabled={item.quantity <= 1} onClick={() => updateCartQty(item.cartItemId, -1)} aria-label="Decrease quantity" className="w-8 h-8 text-lg leading-none font-bold hover:text-[#D4AF37] disabled:opacity-30 disabled:cursor-not-allowed">&minus;</button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <button type="button" onClick={() => updateCartQty(item.cartItemId, 1)} aria-label="Increase quantity" className="w-8 h-8 text-lg leading-none font-bold hover:text-[#D4AF37]">+</button>
                    </div>
                    <span className="text-xs text-gray-500">{formatPrice(item.price)} each</span>
                  </div>
                </div>
                <div className="text-right flex flex-col justify-between items-end">
                  <button type="button" onClick={() => removeFromCart(item.cartItemId)} className="w-6 h-6 rounded-full bg-red-600 text-white text-xs leading-none" title="Remove">&times;</button>
                  <span className="text-sm font-bold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-sm space-y-3 border-t pt-4">
            <div className="flex justify-between font-semibold">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between font-semibold text-green-600">
                <span>Discount ({discountLabel})</span><span>- {formatPrice(discount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Delivery area</span>
              <span className="font-semibold">{areaChosen ? `${checkoutForm.deliveryArea} (${DELIVERY_AREA_BN[checkoutForm.deliveryArea]})` : 'Select your city & zone'}</span>
            </div>

            <div className="flex justify-between">
              <span>Delivery charge</span>
              <span className="font-semibold">
                {!areaChosen ? 'Select city & zone' : deliveryCharge === 0 ? 'FREE' : formatPrice(deliveryCharge)}
              </span>
            </div>

            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span>TOTAL</span><span className="text-[#D4AF37]">{formatPrice(grandTotal)}</span>
            </div>
          </div>

          {/* PAYMENT */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-lg font-bold">Payment Methods</h3>
            <div className={`rounded border p-3 space-y-2 ${isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-white border-gray-200'}`}>
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="paymentMethod" value={m} checked={checkoutForm.paymentMethod === m} onChange={() => set('paymentMethod', m)} className="accent-[#D4AF37]" />
                  <span>{m} <span className="text-gray-500">({PAYMENT_METHOD_BN[m]})</span></span>
                </label>
              ))}
            </div>

            <div className={`text-xs leading-relaxed rounded border p-3 ${isDarkMode ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10' : 'border-[#D4AF37]/50 bg-[#D4AF37]/10'}`}>
              <p>অনলাইন পেমেন্ট করলে ডেলিভারি চার্জ লাগবে না।</p>
              <p>ক্যাশ অন ডেলিভারিতে ঢাকার ভিতরে {toBanglaDigits(DELIVERY_CHARGES['Inside Dhaka'])} টাকা এবং ঢাকার বাইরে {toBanglaDigits(DELIVERY_CHARGES['Outside Dhaka'])} টাকা ডেলিভারি চার্জ প্রযোজ্য।</p>
              {online && <p className="mt-1">অনলাইন পেমেন্ট নির্বাচন করলে অর্ডার করার পর আমাদের প্রতিনিধি আপনাকে ফোন করে পেমেন্টের নির্দেশনা জানাবেন।</p>}
            </div>

            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={checkoutForm.agree} onChange={(e) => set('agree', e.target.checked)} className="mt-0.5 accent-[#D4AF37]" />
              <span>I agree to the <strong>Terms &amp; Conditions</strong>, <strong>Privacy Policy</strong> and <strong>Return &amp; Refund Policy</strong></span>
            </label>

            {checkoutError && <p className="text-xs p-3 rounded border border-red-500/40 text-red-500 bg-red-500/10">{checkoutError}</p>}

            <button type="submit" disabled={placingOrder} className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded text-sm tracking-widest uppercase hover:opacity-90 transition disabled:opacity-50">
              {placingOrder ? 'Placing order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
