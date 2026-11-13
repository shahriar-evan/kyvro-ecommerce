import React, { useEffect, useRef } from 'react';
import { ShoppingBag, X, ChevronRight, Trash2 } from 'lucide-react';
import { deliveryNote, freeDeliveryMissing, normalizeSettings } from '../data/shopConfig';

export default function CartDrawer({ storeSettings, cart, formatPrice, isDarkMode, removeFromCart, setCurrentView, setIsCartOpen, subtotal, discount = 0, discountLabel = '', lookOff = 0, reward = null, updateCartQty }) {
  const panelRef = useRef(null);
  // Touching / clicking anywhere outside the cart closes it, and that touch still works on the page underneath
  // (the dark backdrop does not block clicks, so a menu link, a product, etc. opens straight away).
  useEffect(() => {
    const onDown = (e) => {
      const t = e.target;
      if (panelRef.current && panelRef.current.contains(t)) return;
      if (t && t.closest && t.closest('[data-cart-toggle]')) return; // the header cart button toggles it by itself
      setIsCartOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setIsCartOpen(false); };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey); };
  }, [setIsCartOpen]);
  return (
    <>
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-end pointer-events-none">
          <div ref={panelRef} className={`pointer-events-auto w-full max-w-md h-full p-6 flex flex-col justify-between border-l shadow-2xl ${isDarkMode ? 'bg-[#161616] border-gray-800 text-white' : 'bg-white border-gray-300 text-black'}`}>
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
                  <div className={`flex justify-between ${discount > 0 || lookOff > 0 ? 'text-sm' : 'text-base font-bold'}`}>
                    <span>Subtotal</span>
                    <span className={discount > 0 || lookOff > 0 ? '' : 'text-[#D4AF37]'}>{formatPrice(subtotal)}</span>
                  </div>
                  {lookOff > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-semibold">
                      <span>Full look 10% off</span>
                      <span>- {formatPrice(lookOff)}</span>
                    </div>
                  )}
                  {(discount > 0 || lookOff > 0) && (
                    <>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600 font-semibold">
                          <span>Discount ({discountLabel})</span>
                          <span>- {formatPrice(discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold">
                        <span>After discount</span>
                        <span className="text-[#D4AF37]">{formatPrice(subtotal - discount - lookOff)}</span>
                      </div>
                    </>
                  )}
                  {reward && (
                    <p className="text-[11px] font-semibold text-[#D4AF37]">
                      Add {formatPrice(reward.missing)} more to get {reward.rule.type === 'percent' ? `${reward.rule.value}%` : formatPrice(reward.rule.value)} OFF!
                    </p>
                  )}
                  <p className="text-[11px] text-gray-500">
                    {deliveryNote(storeSettings, cart.reduce((n, i) => n + (parseInt(i.quantity, 10) || 0), 0)).en}
                  </p>
                  {(() => {
                    const s = normalizeSettings(storeSettings);
                    const miss = freeDeliveryMissing(subtotal - discount, s);
                    return miss > 0 && s.freeDeliveryFor !== 'cod' ? (
                      <p className="text-[11px] font-semibold text-[#D4AF37]">Add {formatPrice(miss)} more for free delivery{s.freeDeliveryFor === 'online' ? ' (with Online Payment)' : ''}!</p>
                    ) : null;
                  })()}
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
    </>
  );
}
