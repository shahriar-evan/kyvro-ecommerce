// Every text of the seller plan page (Sell on Kyvro) in English and Bangla. Edit here: cards, pills, Compare Plans
// and the FAQ all read from this file. {n} is replaced by a number (free limit, days, discount).

// Compare Plans: a cell is true (✓), false (–), 'soon' (Coming soon) or a text key from `cell` below.
export const COMPARE = [
  { group: 'shop', rows: [
    ['products', 'cellFreeLimit', 'cellAll', 'cellAll'],
    ['ownLink', true, true, true],
    ['markup', true, true, true],
    ['handled', true, true, true],
    ['priority', false, true, true],
  ] },
  { group: 'branding', rows: [
    ['shopName', true, true, true],
    ['tagline', false, true, true],
    ['social', false, true, true],
    ['about', false, true, true],
    ['shareKit', false, true, true],
    ['brandColor', false, false, true],
    ['announcement', false, false, true],
    ['pin', false, false, true],
    ['verified', false, false, true],
    ['logo', false, 'cellOnRequest', 'cellOwnerApproved'],
    ['banner', false, false, 'cellOwnerApproved'],
  ] },
  { group: 'earnings', rows: [
    ['payout', 'cellMonthly', 'cellMonthly', 'cellWeekly'],
    ['support', false, false, true],
    ['salesStats', false, false, true],
    ['csv', false, false, true],
  ] },
  { group: 'soon', soon: true, rows: [
    ['featured', false, false, 'soon'],
    ['coupons', false, false, 'soon'],
    ['domain', false, false, 'soon'],
    ['orderEmail', false, false, 'soon'],
  ] },
];

export const PLAN_TEXT = {
  en: {
    heading: 'Start your own business with', headingBrand: 'Kyvro', headingEnd: '',
    subtitle: 'No investment. Pick Kyvro products, set your price, earn the markup. Choose a plan to apply.',
    free: 'Free', pro: 'Pro', premium: 'Premium',
    blurbFree: 'Start selling today.', blurbPro: 'For growing sellers.', blurbPremium: 'For serious sellers.',
    mostPopular: 'Most Popular', bestValue: 'Best Value', perDays: 'per {n} days', forever: 'forever', off: '{n}% OFF', soon: 'Coming soon', current: 'Current',
    btnFree: 'Get started', btnPro: 'Get Pro', btnPremium: 'Get Premium',
    featFree: ['{n} products', 'Your own shop link', 'Earn markup on every delivered order', 'Kyvro handles payment and delivery'],
    featPro: ['All products', 'Priority approval', 'Tagline + WhatsApp / Facebook button', 'Social links', 'About section', 'Share kit (QR + caption)', 'Logo upload (on request)', 'Everything in Free'],
    featPremium: ['Everything in Pro', '✓ Verified seller badge', 'Weekly payout', 'Priority support', 'Brand color', 'Announcement strip', 'Pin top products', 'Shop name wordmark in the header', 'Custom logo (Kyvro approved)', 'Custom banner (Kyvro approved)', 'Sales stats', 'Monthly earnings CSV'],
    soonPremium: ['Custom domain', 'Featured on Kyvro', 'Shop coupon codes', 'Order email notification'],
    pills: ['Pay with bKash / Nagad', 'Activates right after payment', 'No auto-charge, renew manually'],
    compareTitle: 'Compare Plans', compareSub: 'Everything you get at a glance', feature: 'Feature',
    groups: { shop: 'Shop & products', branding: 'Branding', earnings: 'Earnings & support', soon: 'Coming soon' },
    rows: {
      products: 'Products', ownLink: 'Own shop link', markup: 'Earn markup on delivered orders', handled: 'Kyvro handles payment & delivery', priority: 'Priority approval',
      shopName: 'Shop name', tagline: 'Tagline + WhatsApp / Facebook button', social: 'Social links', about: 'About section', shareKit: 'Share kit (QR + caption)',
      brandColor: 'Brand color', announcement: 'Announcement strip', pin: 'Pin top products', verified: 'Verified seller badge', logo: 'Custom logo', banner: 'Custom banner',
      payout: 'Payout', support: 'Priority support',
      featured: 'Featured on Kyvro', salesStats: 'Sales stats', coupons: 'Shop coupon codes', domain: 'Custom domain', orderEmail: 'Order email notification', csv: 'Monthly earnings CSV',
    },
    cell: { cellFreeLimit: '{n}', cellAll: 'All', cellOnRequest: 'On request', cellOwnerApproved: '✓ Owner approved', cellMonthly: 'Monthly', cellWeekly: 'Weekly', soonCell: 'Soon' },
    faqTitle: 'Frequently Asked Questions',
    faq: [
      ['What is the Free plan?', 'The Free plan has no fee. You open your own shop link with 10 Kyvro products, sell them and earn the markup.'],
      ['How do I earn money?', 'You set your own price above the Kyvro price (within the allowed limit). When the order is delivered, the extra part (the markup) is yours. Kyvro collects the payment and delivers the order.'],
      ['When do I get paid?', 'The markup of delivered orders is added to your balance. Payout is monthly on Free and Pro, weekly on Premium. If an order is returned, that order earns no markup.'],
      ['How do I pay for Pro or Premium?', 'After your application is approved, you pay with bKash or Nagad (UddoktaPay). The plan starts right after the payment.'],
      ['Is there an automatic monthly charge?', 'No. There is no auto-charge. To renew, pay again before your plan ends; we remind you by email and with a banner.'],
      ['What happens when my plan expires?', 'Your shop goes back to the Free plan: only the 10 best-selling products show. The others are hidden, not deleted. Renew and they all show again.'],
      ['How long does approval take?', 'Kyvro reviews your application. Pro and Premium applicants get priority.'],
      ['Who handles delivery and returns?', 'Kyvro confirms the order, gets it from the supplier and sends it to the customer. If an order is returned, that order earns no markup.'],
      ['What information do you ask for?', 'Your name, email, WhatsApp, address (district / area) and the categories you will sell. We never ask for NID, passport or bank details. Only the Kyvro owner sees your WhatsApp and address.'],
      ['Can I use my own logo or domain?', 'Logo: on Premium you can upload one (it goes live after Kyvro approves it); on Pro you can request it. A custom domain is coming soon.'],
      ['Can I get a refund?', 'For a refund, please contact Kyvro support.'],
    ],
  },
  bn: {
    heading: 'নিজের ব্যবসা শুরু করুন', headingBrand: 'Kyvro', headingEnd: '-র সাথে',
    subtitle: 'কোনো বিনিয়োগ নেই। Kyvro-র পণ্য বেছে নিন, নিজের দাম ঠিক করুন, মার্কআপ আয় করুন। একটি প্ল্যান বেছে নিন।',
    free: 'Free', pro: 'Pro', premium: 'Premium',
    blurbFree: 'আজই বিক্রি শুরু করুন।', blurbPro: 'বাড়তে থাকা সেলারদের জন্য।', blurbPremium: 'সিরিয়াস সেলারদের জন্য।',
    mostPopular: 'সবচেয়ে জনপ্রিয়', bestValue: 'সেরা মূল্য', perDays: 'প্রতি {n} দিনে', forever: 'সবসময়', off: '{n}% ছাড়', soon: 'শিগগিরই আসছে', current: 'বর্তমান',
    btnFree: 'শুরু করুন', btnPro: 'Pro নিন', btnPremium: 'Premium নিন',
    featFree: ['{n}টি পণ্য', 'নিজের শপ লিংক', 'প্রতিটি ডেলিভারড অর্ডারে মার্কআপ আয়', 'পেমেন্ট ও ডেলিভারি Kyvro সামলায়'],
    featPro: ['সব পণ্য', 'অগ্রাধিকার অনুমোদন', 'ট্যাগলাইন + হোয়াটসঅ্যাপ/ফেসবুক বাটন', 'সোশ্যাল লিংক', 'About সেকশন', 'শেয়ার কিট (QR + ক্যাপশন)', 'লোগো আপলোড (অনুরোধে)', 'Free-র সব সুবিধা'],
    featPremium: ['Pro-র সব সুবিধা', '✓ ভেরিফাইড সেলার ব্যাজ', 'সাপ্তাহিক পেআউট', 'অগ্রাধিকার সাপোর্ট', 'ব্র্যান্ড কালার', 'ঘোষণা স্ট্রিপ', 'টপ পণ্য পিন করা', 'হেডারে শপের নাম', 'কাস্টম লোগো (Kyvro অনুমোদিত)', 'কাস্টম ব্যানার (Kyvro অনুমোদিত)', 'বিক্রির পরিসংখ্যান', 'মাসিক আয়ের CSV'],
    soonPremium: ['কাস্টম ডোমেইন', 'Kyvro-তে ফিচার্ড', 'শপ কুপন কোড', 'অর্ডার ইমেইল নোটিফিকেশন'],
    pills: ['বিকাশ / নগদে পেমেন্ট', 'পেমেন্টের সাথে সাথে চালু', 'অটো-চার্জ নেই, নিজে নবায়ন করুন'],
    compareTitle: 'প্ল্যান তুলনা', compareSub: 'এক নজরে সব সুবিধা', feature: 'সুবিধা',
    groups: { shop: 'শপ ও পণ্য', branding: 'ব্র্যান্ডিং', earnings: 'আয় ও সাপোর্ট', soon: 'শিগগিরই আসছে' },
    rows: {
      products: 'পণ্য', ownLink: 'নিজের শপ লিংক', markup: 'ডেলিভারড অর্ডারে মার্কআপ আয়', handled: 'পেমেন্ট ও ডেলিভারি Kyvro সামলায়', priority: 'অগ্রাধিকার অনুমোদন',
      shopName: 'শপের নাম', tagline: 'ট্যাগলাইন + হোয়াটসঅ্যাপ/ফেসবুক বাটন', social: 'সোশ্যাল লিংক', about: 'About সেকশন', shareKit: 'শেয়ার কিট (QR + ক্যাপশন)',
      brandColor: 'ব্র্যান্ড কালার', announcement: 'ঘোষণা স্ট্রিপ', pin: 'টপ পণ্য পিন করা', verified: 'ভেরিফাইড সেলার ব্যাজ', logo: 'কাস্টম লোগো', banner: 'কাস্টম ব্যানার',
      payout: 'পেআউট', support: 'অগ্রাধিকার সাপোর্ট',
      featured: 'Kyvro-তে ফিচার্ড', salesStats: 'বিক্রির পরিসংখ্যান', coupons: 'শপ কুপন কোড', domain: 'কাস্টম ডোমেইন', orderEmail: 'অর্ডার ইমেইল নোটিফিকেশন', csv: 'মাসিক আয়ের CSV',
    },
    cell: { cellFreeLimit: '{n}টি', cellAll: 'সব', cellOnRequest: 'অনুরোধে', cellOwnerApproved: '✓ মালিক অনুমোদিত', cellMonthly: 'মাসিক', cellWeekly: 'সাপ্তাহিক', soonCell: 'শিগগিরই' },
    faqTitle: 'সাধারণ প্রশ্ন',
    faq: [
      ['ফ্রি প্ল্যান কী?', 'ফ্রি প্ল্যানে কোনো ফি নেই। আপনি ১০টি Kyvro পণ্য নিয়ে নিজের শপ লিংক খুলে বিক্রি করতে পারবেন এবং মার্কআপ আয় করবেন।'],
      ['আমি কীভাবে আয় করব?', 'Kyvro-র দামের ওপরে আপনি নিজের দাম নির্ধারণ করবেন (অনুমোদিত সীমার মধ্যে)। অর্ডার ডেলিভারড হলে বাড়তি অংশ (মার্কআপ) আপনার। পেমেন্ট নেওয়া ও ডেলিভারি Kyvro করে।'],
      ['কখন টাকা পাব?', 'ডেলিভারড অর্ডারের মার্কআপ আপনার ব্যালেন্সে যোগ হয়। ফ্রি ও প্রো-তে মাসিক, প্রিমিয়ামে সাপ্তাহিক পেআউট। অর্ডার রিটার্ন হলে সেই অর্ডারের মার্কআপ পাওয়া যায় না।'],
      ['প্রো বা প্রিমিয়ামের জন্য কীভাবে পেমেন্ট করব?', 'আবেদন অনুমোদনের পর বিকাশ বা নগদ (UddoktaPay) দিয়ে পেমেন্ট করতে হবে। পেমেন্ট করার সাথে সাথে প্ল্যান চালু হয়।'],
      ['অটোমেটিক মাসিক চার্জ আছে কি?', 'না। কোনো অটো-চার্জ নেই। প্ল্যান শেষ হওয়ার আগে আবার পেমেন্ট করে নবায়ন করতে হবে; আমরা ইমেইল ও ব্যানারে রিমাইন্ডার দেখাব।'],
      ['প্ল্যান শেষ হয়ে গেলে কী হয়?', 'আপনার শপ ফ্রি প্ল্যানে ফিরে যায়: শুধু সবচেয়ে বেশি বিক্রীত ১০টি পণ্য দেখায়। বাকি পণ্য লুকানো থাকে, মুছে যায় না। নবায়ন করলে সব আবার দেখা যায়।'],
      ['অনুমোদন পেতে কতক্ষণ লাগে?', 'Kyvro আপনার আবেদন যাচাই করে। প্রো ও প্রিমিয়াম আবেদনকারীরা অগ্রাধিকার পায়।'],
      ['ডেলিভারি ও রিটার্ন কে সামলায়?', 'Kyvro অর্ডার কনফার্ম করে, সরবরাহকারীর কাছ থেকে আনে এবং কাস্টমারের কাছে পাঠায়। রিটার্ন হলে ওই অর্ডারের মার্কআপ পাওয়া যায় না।'],
      ['কী কী তথ্য চাওয়া হয়?', 'নাম, ইমেইল, হোয়াটসঅ্যাপ নম্বর, ঠিকানা (জেলা/এলাকা) ও কোন ক্যাটাগরির পণ্য বিক্রি করবেন। এনআইডি, পাসপোর্ট বা ব্যাংকের তথ্য কখনোই চাই না। আপনার হোয়াটসঅ্যাপ ও ঠিকানা শুধু Kyvro-র মালিক দেখতে পান।'],
      ['নিজের লোগো বা ডোমেইন ব্যবহার করতে পারব?', 'লোগো: প্রিমিয়ামে আপলোড করা যায় (Kyvro অনুমোদন করলে লাইভ হয়), প্রো-তে অনুরোধ করে। কাস্টম ডোমেইন শিগগিরই আসছে।'],
      ['রিফান্ড পাব?', 'রিফান্ডের জন্য Kyvro সাপোর্টের সাথে যোগাযোগ করুন।'],
    ],
  },
};

// '{n}' -> value (Bangla digits in Bangla)
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const bnNum = (n) => String(n).replace(/[0-9]/g, (d) => BN_DIGITS[d]);
export const fill = (s, n, lang = 'en') => String(s).replace('{n}', lang === 'bn' ? bnNum(n) : n);
export const BN_FONT = "'Noto Sans Bengali', 'Hind Siliguri', 'SolaimanLipi', 'Kalpurush', system-ui, sans-serif";
