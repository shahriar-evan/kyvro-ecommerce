import React from 'react';
import { DELIVERY_AREA_BN } from '../data/shopConfig';
import { formatDateTime } from '../utils/dates';

export default function OrderSuccess({ order, formatPrice, isDarkMode, setCurrentView }) {
  if (!order) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-4 py-20 text-center w-full">
        <p className="text-sm text-gray-500 mb-6">No recent order to show.</p>
        <button onClick={() => setCurrentView('shop')} className="bg-[#D4AF37] text-black text-xs font-bold px-6 py-3 tracking-widest uppercase rounded">Continue Shopping</button>
      </div>
    );
  }
  const online = order.paymentMethod === 'Online Payment';
  const panel = `rounded-lg border p-5 sm:p-7 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-gray-50 border-gray-200'}`;

  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-green-500/15 text-green-600 text-3xl flex items-center justify-center mx-auto">✓</div>
        <h1 className="text-3xl font-serif font-bold">Thank you for your order!</h1>
        <p className="text-sm text-gray-500">আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
        <p className="text-sm">Your order number is <strong className="text-[#D4AF37] text-lg">{order.orderNumber}</strong></p>
        <p className="text-xs text-gray-500">Placed on {formatDateTime(order.date)}</p>
      </div>

      <div className={`${panel} space-y-4`}>
        <h2 className="font-bold text-lg border-b pb-2">Order details</h2>
        <div className="text-sm space-y-1">
          <p><span className="text-gray-500">Name:</span> {order.customer.name}</p>
          <p><span className="text-gray-500">Phone:</span> {order.customer.phone}</p>
          <p><span className="text-gray-500">Address:</span> {order.customer.address}</p>
          <p><span className="text-gray-500">Delivery area:</span> {order.deliveryArea} ({DELIVERY_AREA_BN[order.deliveryArea]})</p>
          <p><span className="text-gray-500">Payment:</span> {order.paymentMethod}</p>
        </div>

        <div className="divide-y text-sm">
          {order.items.map((it, i) => (
            <div key={i} className="py-2 flex justify-between gap-3">
              <span>{it.name}{it.size && it.size !== 'Standard' ? ` (${it.size})` : ''} &times; {it.quantity}</span>
              <span className="font-semibold">{formatPrice(it.price * it.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="text-sm space-y-1 border-t pt-3">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Delivery charge</span><span>{order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}</span></div>
          <div className="flex justify-between text-lg font-bold pt-1"><span>Total</span><span className="text-[#D4AF37]">{formatPrice(order.total)}</span></div>
        </div>

        <p className="text-xs text-gray-500 border-t pt-3">
          {online
            ? 'Our team will call you to share the payment instructions and confirm your order. (আমাদের প্রতিনিধি আপনাকে ফোন করে পেমেন্টের নির্দেশনা জানাবেন।)'
            : 'Our team will call you to confirm your order. You pay in cash when it is delivered. (ডেলিভারির সময় ক্যাশে পেমেন্ট করবেন।)'}
        </p>
      </div>

      <div className="text-center">
        <button onClick={() => setCurrentView('shop')} className="bg-[#D4AF37] text-black text-xs font-bold px-8 py-3.5 tracking-widest uppercase rounded hover:opacity-90 transition">
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
