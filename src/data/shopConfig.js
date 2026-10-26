// ---------------------------------------------------------------------------
// Delivery + payment settings (amounts are in BDT)
// NOTE: the same delivery charges are checked in firestore.rules. If you change a charge
// here, change it in the rules too, otherwise new orders will be rejected.
// ---------------------------------------------------------------------------

export const DELIVERY_AREAS = ['Inside Dhaka', 'Outside Dhaka'];
export const DELIVERY_AREA_BN = { 'Inside Dhaka': 'ঢাকার ভিতরে', 'Outside Dhaka': 'ঢাকার বাইরে' };

// Delivery charge, charged only for Cash on Delivery
export const DELIVERY_CHARGES = { 'Inside Dhaka': 100, 'Outside Dhaka': 150 };

export const PAYMENT_METHODS = ['Cash on Delivery', 'Online Payment'];
export const PAYMENT_METHOD_BN = { 'Cash on Delivery': 'ক্যাশ অন ডেলিভারি', 'Online Payment': 'অনলাইন পেমেন্ট' };

export const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

// Online Payment = free delivery. Cash on Delivery = charge by area.
export const deliveryFee = (area, method) =>
  method === 'Online Payment' ? 0 : (DELIVERY_CHARGES[area] || 0);

export const paymentStatusFor = (method) =>
  method === 'Online Payment' ? 'Awaiting payment' : 'Cash on Delivery';

export const toBanglaDigits = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
