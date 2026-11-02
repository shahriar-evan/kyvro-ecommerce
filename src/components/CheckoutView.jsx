import React, { useState, useEffect } from 'react';
import { deliveryAreaFor, DELIVERY_AREAS, DELIVERY_AREA_BN, PAYMENT_METHODS, PAYMENT_METHOD_BN, MANUAL_METHOD, ONLINE_PAY_ON, PAY_PROVIDER, CARD_PAY_ON, manualWallets, toBanglaDigits, deliveryNote, freeDeliveryApplies, freeDeliveryMissing, normalizeSettings } from '../data/shopConfig';

export default function CheckoutView({
  storeSettings, cart, checkoutForm, setCheckoutForm, checkoutError, deliveryCharge, grandTotal, formatPrice,
  handleCheckoutSubmit, isDarkMode, placingOrder, removeFromCart, updateCartQty, setCurrentView, subtotal, discount = 0, discountLabel = '', customerUser = null, authReady = true, onSignIn, reward = null,
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
  const wallets = manualWallets(storeSettings);
  const methods = PAYMENT_METHODS.filter((m) => (m !== MANUAL_METHOD || wallets.length > 0) && (m !== 'Online Payment' || ONLINE_PAY_ON));
  const manual = checkoutForm.paymentMethod === MANUAL_METHOD && wallets.length > 0;
  const wallet = wallets.includes(checkoutForm.manualWallet) ? checkoutForm.manualWallet : (wallets[0] || '');
  const walletNo = wallet ? normalizeSettings(storeSettings)['manual' + wallet] : '';
  const online = ONLINE_PAY_ON && checkoutForm.paymentMethod === 'Online Payment';
  const areaChosen = !!checkoutForm.deliveryArea;
  // what the customer pays online when pressing Place Order: Online Payment = everything, Cash on Delivery = the delivery charge
  const payNow = !ONLINE_PAY_ON || manual ? 0 : online ? grandTotal : (areaChosen ? deliveryCharge : 0);
  // UddoktaPay: the pay button is always shown (bKash / Nagad), even before a delivery area is chosen
  const showPayBtn = payNow > 0 || (PAY_PROVIDER === 'uddokta' && ONLINE_PAY_ON && !manual);
  const payAmt = payNow > 0 ? ` ${formatPrice(payNow)}` : '';
  const placeLabel = placingOrder ? 'Placing order...' : (payNow > 0 ? `Place Order & Pay ${formatPrice(payNow)}` : 'Place Order');

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

  // No sign-in needed to order: guests can place an order with just their details. Signing in with Google is optional (it lets them see the order status).

  return (
    <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-36 lg:py-12 w-full">
      <button onClick={() => setCurrentView('shop')} className="text-xs text-gray-500 hover:text-[#D4AF37] mb-4">&larr; Continue shopping</button>
      <h1 className="text-3xl font-serif font-bold mb-4">Checkout</h1>
      <p className="text-sm font-semibold text-red-500 mb-6">
        বিঃদ্রঃ দ্রুত ডেলিভারী নিশ্চিত করার জন্য সঠিক ভাবে আপনার ঠিকানা লিখুন (জেলা উপজেলা উল্লেখ করুন)।
      </p>

      {!customerUser && (
        <div className={`mb-6 rounded-lg border p-4 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 ${isDarkMode ? 'border-gray-800 bg-[#161616]' : 'border-gray-200 bg-gray-50'}`}>
          <p className="leading-relaxed">
            <strong>সাইন ইন ছাড়াই অর্ডার করতে পারবেন।</strong> আপনার অর্ডারের অবস্থা অনলাইনে দেখতে চাইলে Google দিয়ে সাইন ইন করুন (ঐচ্ছিক)।
          </p>
          <button type="button" onClick={onSignIn} disabled={!authReady} className="border border-[#D4AF37] text-[#D4AF37] font-bold px-4 py-2 rounded text-[11px] uppercase tracking-widest hover:bg-[#D4AF37]/10 disabled:opacity-60">
            {authReady ? 'Sign in with Google' : 'Please wait...'}
          </button>
        </div>
      )}

      <form id="kyvro-checkout-form" onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
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
                {upazilaObj && upazilaObj.a.length === 0 ? (
                  <input type="text" maxLength={60} value={checkoutForm.area} onChange={(e) => set('area', e.target.value)} placeholder="Type your area (optional)" className={input} />
                ) : (
                  <select disabled={!upazilaObj} value={checkoutForm.area} onChange={(e) => set('area', e.target.value)} className={`${input} disabled:opacity-60`}>
                    <option value="">{!upazilaObj ? 'Select zone first' : 'Select Area (optional)'}</option>
                    {upazilaObj && upazilaObj.a.map((a, i) => <option key={a[0] + i} value={a[0]}>{a[0]}{a[1] ? ` (PO: ${a[1]}${a[2] ? ', ' + a[2] : ''})` : ''}</option>)}
                  </select>
                )}
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

            {(() => {
              const st = normalizeSettings(storeSettings);
              const base = checkoutForm.deliveryArea === 'Inside Dhaka' ? st.deliveryInside : st.deliveryOutside;
              const extra = areaChosen && deliveryCharge > base ? deliveryCharge - base : 0;
              return (
                <>
                  <div className="flex justify-between">
                    <span>Delivery charge</span>
                    <span className="font-semibold">
                      {!areaChosen ? 'Select city & zone' : deliveryCharge === 0 ? 'FREE' : formatPrice(deliveryCharge - extra)}
                    </span>
                  </div>
                  {extra > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Extra Delivery <span className="text-xs">(+{formatPrice(st.deliveryExtraPerItem)} per item)</span></span>
                      <span className="font-semibold">+ {formatPrice(extra)}</span>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span>TOTAL</span><span className="text-[#D4AF37]">{formatPrice(grandTotal)}</span>
            </div>
          </div>

          {/* PAYMENT */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-lg font-bold">Payment Methods</h3>
            <div className={`rounded border p-3 space-y-2 ${isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-white border-gray-200'}`}>
              {methods.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="paymentMethod" value={m} checked={checkoutForm.paymentMethod === m} onChange={() => set('paymentMethod', m)} className="accent-[#D4AF37]" />
                  <span>{m} <span className="text-gray-500">({PAYMENT_METHOD_BN[m]})</span></span>
                </label>
              ))}
            </div>

            {manual && (
              <div className={`rounded border p-4 space-y-3 text-sm ${isDarkMode ? 'bg-[#121212] border-[#D4AF37]/50' : 'bg-white border-[#D4AF37]/60'}`}>
                <p className="font-semibold">১) নিচের নম্বরে "Send Money" করুন {formatPrice(grandTotal)} / Send exactly {formatPrice(grandTotal)} to:</p>
                <div className="flex gap-2">
                  {wallets.map((w) => (
                    <button key={w} type="button" onClick={() => set('manualWallet', w)} className={`px-4 py-2 text-xs font-bold rounded border ${wallet === w ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'border-gray-400'}`}>{w}</button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold tracking-wider select-all">{walletNo}</span>
                  <button type="button" onClick={() => { try { navigator.clipboard.writeText(walletNo); } catch (e) { /* ignore */ } }} className="text-xs underline">Copy</button>
                </div>
                <p className="text-xs text-gray-500">Personal number, so use "Send Money" (not Payment/Cash Out). (সেন্ড মানি করুন)</p>
                <p className="font-semibold">২) টাকা পাঠানোর পর তথ্য দিন / Then fill in:</p>
                <input className={input} inputMode="numeric" placeholder={`Your ${wallet} number (যে নম্বর থেকে পাঠিয়েছেন)`} value={checkoutForm.manualSender || ''} onChange={(e) => set('manualSender', e.target.value)} />
                <input className={input} placeholder="TrxID (e.g. 9H7K2LM3QA)" maxLength={20} value={checkoutForm.manualTrx || ''} onChange={(e) => set('manualTrx', e.target.value.toUpperCase())} />
                <p className="text-xs text-gray-500">We verify the TrxID and amount before confirming your order. A wrong TrxID delays your order. (ভুল TrxID দিলে অর্ডার কনফার্ম হতে দেরি হবে)</p>
              </div>
            )}

            <div className={`text-xs leading-relaxed rounded border p-3 ${isDarkMode ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10' : 'border-[#D4AF37]/50 bg-[#D4AF37]/10'}`}>
              <p>{deliveryNote(storeSettings, cart.reduce((n, i) => n + (parseInt(i.quantity, 10) || 0), 0)).bn}</p>
              {(() => {
                const s = normalizeSettings(storeSettings);
                const net = subtotal - discount;
                const miss = freeDeliveryMissing(net, s);
                if (miss > 0) return <p className="mt-1 font-semibold">আর {toBanglaDigits(miss)} টাকার পণ্য যোগ করলে ডেলিভারি ফ্রি পাবেন।</p>;
                if (s.freeDeliveryEnabled && !freeDeliveryApplies(net, checkoutForm.paymentMethod, s)) return <p className="mt-1 font-semibold">{toBanglaDigits(s.freeDeliveryMin)} টাকা বা এর বেশি পণ্য কিনলে ফ্রি ডেলিভারি পাবেন। ফ্রি ডেলিভারি পেতে {s.freeDeliveryFor === 'online' ? 'অনলাইন পেমেন্ট' : 'ক্যাশ অন ডেলিভারি'} নির্বাচন করুন।</p>;
                return null;
              })()}
              {reward && reward.missing > 0 && reward.missing <= 1500 && (
                <p className="mt-1 font-semibold">আর {toBanglaDigits(reward.missing)} টাকার পণ্য কিনলে {reward.rule.type === 'percent' ? `${toBanglaDigits(reward.rule.value)}% ছাড়` : `${toBanglaDigits(reward.rule.value)} টাকা ছাড়`} পাবেন।</p>
              )}
              {online ? (
                <>
                  {PAY_PROVIDER === 'uddokta' ? (
                    <>
                      <p className="mt-1 font-semibold">অনলাইন পেমেন্ট {Number(grandTotal).toFixed(2)} টাকা {CARD_PAY_ON ? 'বিকাশ, নগদ বা কার্ডের' : 'বিকাশ বা নগদের'} মাধ্যমে পরিশোধ করতে পারবেন। {CARD_PAY_ON ? 'বিকাশ/নগদে দিতে Pay with bKash / Nagad এবং কার্ডে দিতে Pay with Card এ ক্লিক করুন।' : 'Pay with bKash / Nagad এ ক্লিক করে পেমেন্ট পেজে নম্বর দিন।'}</p>
                      <p className="mt-1 text-gray-600">The full amount is paid now by {CARD_PAY_ON ? 'bKash / Nagad / card' : 'bKash / Nagad'} on the secure payment page.</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 font-semibold">অনলাইন পেমেন্ট {Number(grandTotal).toFixed(2)} টাকা বিকাশ, নগদ বা কার্ডের মাধ্যমে পরিশোধ করতে পারবেন। বিকাশে পেমেন্ট করতে Pay with bKash এ ক্লিক করে নম্বর দিন, আর কার্ড বা ব্যাংকে পেমেন্ট করতে Pay with Card / Bank এ ক্লিক করুন।</p>
                      <p className="mt-1 text-gray-600">The full amount is paid now by bKash / card on the secure payment page.</p>
                    </>
                  )}
                </>
              ) : !ONLINE_PAY_ON ? null : areaChosen && deliveryCharge > 0 ? (
                <p className="mt-1 font-semibold">{PAY_PROVIDER === 'uddokta'
                  ? <>ক্যাশ অন ডেলিভারিতে আগে {formatPrice(deliveryCharge)} ডেলিভারি চার্জ bKash বা Nagad এর মাধ্যমে দিতে হবে। বাকি {formatPrice(grandTotal - deliveryCharge)} পণ্য হাতে পেয়ে দিবেন।<br />Pay the {formatPrice(deliveryCharge)} delivery charge now by bKash or Nagad, the rest {formatPrice(grandTotal - deliveryCharge)} in cash on delivery.</>
                  : <>ক্যাশ অন ডেলিভারিতে আগে {formatPrice(deliveryCharge)} ডেলিভারি চার্জ bKash বা কার্ডের মাধ্যমে দিতে হবে। বাকি {formatPrice(grandTotal - deliveryCharge)} পণ্য হাতে পেয়ে দিবেন।<br />Pay the {formatPrice(deliveryCharge)} delivery charge now by bKash or card, the rest {formatPrice(grandTotal - deliveryCharge)} in cash on delivery.</>}</p>
              ) : !areaChosen ? (
                <p className="mt-1 font-semibold">ক্যাশ অন ডেলিভারিতে ডেলিভারি চার্জ আগে অনলাইনে {PAY_PROVIDER === 'uddokta' ? 'bKash বা Nagad' : 'bKash বা কার্ড'} এর মাধ্যমে দিতে হবে | For Cash on Delivery the delivery charge is paid online first.</p>
              ) : null}
            </div>

            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={checkoutForm.agree} onChange={(e) => set('agree', e.target.checked)} className="mt-0.5 accent-[#D4AF37]" />
              <span>I agree to the <strong>Terms &amp; Conditions</strong>, <strong>Privacy Policy</strong> and <strong>Return &amp; Refund Policy</strong></span>
            </label>

            {checkoutError && <p className="text-xs p-3 rounded border border-red-500/40 text-red-500 bg-red-500/10">{checkoutError}</p>}

            <p className="text-[11px] text-gray-500 text-center">
              By placing your order you agree to our{' '}
              <button type="button" onClick={() => setCurrentView('terms')} className="underline hover:text-[#D4AF37]">Terms</button>,{' '}
              <button type="button" onClick={() => setCurrentView('privacy')} className="underline hover:text-[#D4AF37]">Privacy Policy</button> and{' '}
              <button type="button" onClick={() => setCurrentView('refund')} className="underline hover:text-[#D4AF37]">Return &amp; Refund Policy</button>.
            </p>
            {showPayBtn ? (
              <div className="hidden lg:flex flex-col gap-3">
                <button type="submit" name="payvia" value="bkash" disabled={placingOrder} className="w-full flex items-center justify-center gap-2 bg-[#E2136E] text-white font-bold py-4 rounded text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50">
                  {placingOrder ? 'Placing order...' : `${PAY_PROVIDER === 'uddokta' ? 'Pay with bKash / Nagad' : 'Pay with bKash'}${payAmt}`}
                </button>
                {CARD_PAY_ON && <button type="submit" name="payvia" value="card" disabled={placingOrder} className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] text-black font-bold py-4 rounded text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50">
                  {placingOrder ? 'Placing order...' : `${PAY_PROVIDER === 'uddokta' ? 'Pay with Card' : 'Pay with Card / Bank'}${payAmt}`}
                </button>}
              </div>
            ) : (
              <button type="submit" disabled={placingOrder} className="hidden lg:block w-full bg-[#D4AF37] text-black font-bold py-4 rounded text-sm tracking-widest uppercase hover:opacity-90 transition disabled:opacity-50">
                {placeLabel}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Phone only: the total and the Place Order button stay at the bottom of the screen */}
      <div className={`lg:hidden fixed bottom-0 inset-x-0 z-40 border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur ${isDarkMode ? 'bg-[#121212]/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
        {checkoutError && <p className="text-[11px] leading-snug text-red-500 mb-2 line-clamp-2">{checkoutError}</p>}
        <div className="flex items-center gap-3">
          <div className="leading-tight min-w-[5.5rem]">
            <p className="text-[10px] text-gray-500">{areaChosen ? 'Total' : 'Total (+ delivery)'}</p>
            <p className="text-lg font-bold text-[#D4AF37]">{formatPrice(grandTotal)}</p>
          </div>
          {showPayBtn ? (
            <div className="flex-1 flex flex-col gap-1.5">
              <button type="submit" name="payvia" value="bkash" form="kyvro-checkout-form" disabled={placingOrder} className="h-10 rounded-lg bg-[#E2136E] text-white font-bold text-xs tracking-wide shadow active:scale-95 transition disabled:opacity-50">
                {placingOrder ? 'Placing order...' : (PAY_PROVIDER === 'uddokta' ? 'Pay with bKash / Nagad' : 'Pay with bKash')}
              </button>
              {CARD_PAY_ON && <button type="submit" name="payvia" value="card" form="kyvro-checkout-form" disabled={placingOrder} className="h-10 rounded-lg bg-gradient-to-b from-[#E9CB6B] via-[#D4AF37] to-[#B8921F] text-black font-bold text-xs tracking-wide shadow active:scale-95 transition disabled:opacity-50">
                {placingOrder ? 'Placing order...' : (PAY_PROVIDER === 'uddokta' ? 'Pay with Card' : 'Pay with Card / Bank')}
              </button>}
            </div>
          ) : (
            <button
              type="submit"
              form="kyvro-checkout-form"
              disabled={placingOrder}
              className="flex-1 h-12 rounded-lg bg-gradient-to-b from-[#E9CB6B] via-[#D4AF37] to-[#B8921F] text-black font-bold text-xs tracking-wider uppercase shadow active:scale-95 transition disabled:opacity-50"
            >
              {placeLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
