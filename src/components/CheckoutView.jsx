import React from 'react';
import { DELIVERY_AREAS, DELIVERY_AREA_BN, DELIVERY_CHARGES, PAYMENT_METHODS, PAYMENT_METHOD_BN, toBanglaDigits } from '../data/shopConfig';

export default function CheckoutView({
  cart, checkoutForm, setCheckoutForm, checkoutError, deliveryCharge, grandTotal, formatPrice,
  handleCheckoutSubmit, isDarkMode, placingOrder, removeFromCart, setCurrentView, subtotal,
}) {
  const set = (field, value) => setCheckoutForm({ ...checkoutForm, [field]: value });
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

          <div>
            <label className={label}>Enter Your Full Address (আপনার ঠিকানা) *</label>
            <textarea required rows={3} maxLength={400} value={checkoutForm.address} onChange={(e) => set('address', e.target.value)} placeholder="(আপনার ঠিকানা) House number, Road number, Thana, District" className={input} />
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
                  <p className="text-xs mt-1">{formatPrice(item.price)} &times; {item.quantity}</p>
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

            <div>
              <label className="block font-semibold mb-1.5">Shipping (ডেলিভারি এলাকা) *</label>
              <select required value={checkoutForm.deliveryArea} onChange={(e) => set('deliveryArea', e.target.value)} className={input}>
                <option value="">-- Select Area --</option>
                {DELIVERY_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area} ({DELIVERY_AREA_BN[area]}) &ndash; {online ? 'Free' : formatPrice(DELIVERY_CHARGES[area])}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between">
              <span>Delivery charge</span>
              <span className="font-semibold">
                {!areaChosen ? 'Select area' : deliveryCharge === 0 ? 'FREE' : formatPrice(deliveryCharge)}
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
