import React, { useEffect } from 'react';

const EMAIL = 'kyvrofashion@gmail.com';
const WA_TEXT = '+880 1770 849168';
const UPDATED_EN = 'Last updated: 27 October 2026';
const UPDATED_BN = 'সর্বশেষ আপডেট: ২৭ অক্টোবর ২০২৬';

// Each page: title + sections in English first, then the same in Bangla. A section is { h, p: [paragraphs], li: [bullets] }.
const PAGES = {
  privacy: {
    en: {
      title: 'Privacy Policy',
      intro: 'Kyvro (www.kyvro.store) respects your privacy. This page explains what information we collect when you visit or order from our website, why we collect it, and how we look after it.',
      sections: [
        { h: '1. Information we collect', li: [
          'Order details: your name, phone number, delivery address (district, zone, area, street) and any comment you write.',
          'Account details: when you sign in with Google we receive your name, email address and profile photo.',
          'Your orders, saved items and cart.',
          'Offer emails and notifications: your email address, and a notification address of your device if you press "Allow" on our notification pop-up.',
          'Website usage: which pages and products you look at, what you add to your cart and whether an order is completed (with the order value), plus technical details such as your browser, device type and approximate location. This is collected by Facebook (Meta) Pixel and Google Analytics.',
          'Small pieces of data kept in your browser (local storage) so the site works: your cart, dark/light mode and chosen currency.',
        ] },
        { h: '2. How we use it', li: [
          'To confirm, pack and deliver your order, and to contact you about it (phone, WhatsApp or email).',
          'To show you your order history and let you cancel an order within the allowed time.',
          'To prevent fake or abusive orders (for example by blocking a phone number or account that places fake orders).',
          'To send you offers and news by email and by phone / browser notification, if you signed in with Google or allowed notifications. You can switch these off at any time (see section 6).',
          'To understand how visitors use the website, and to show Kyvro ads on Facebook, Instagram and Google to people who visited our shop (advertising and remarketing).',
          'To improve the shop and to answer your questions.',
        ] },
        { h: '3. Who we share it with', p: ['We do not sell your personal information. We only share what is needed to complete your order:'], li: [
          'Delivery and courier partners (your name, phone number and address).',
          'Payment providers such as bKash or Nagad when you pay online.',
          'Google Firebase, the service that securely stores our data, handles Google sign-in and delivers notifications.',
          'Our email delivery service (Resend), which sends the offer and order emails.',
          'Meta (Facebook / Instagram) and Google (Google Analytics), which receive usage data about your visit (pages viewed, items added to cart, orders completed) to measure and improve our ads and website. We do not send them your name, phone number or address.',
          'Authorities, only if the law requires it.',
        ] },
        { h: '4. Storage and security', p: ['Your data is stored on Google Firebase servers. Only authorised Kyvro team members can see customer orders. No system is 100% secure, but we take reasonable steps to protect your information.'] },
        { h: '5. Cookies and local storage', p: ['We use browser storage and sign-in cookies that are needed to run the shop (login, cart, theme, currency). We also use the Facebook (Meta) Pixel and Google Analytics, which set cookies or similar identifiers in your browser to count visits, see which pages and products are popular, measure our advertising and show our ads to people who visited the shop. These tools are used for analytics and advertising only. You can block them with your browser settings or an ad blocker, and the shop will still work.'] },
        { h: '6. Your choices', li: [
          'You can ask us to correct or delete your personal information by contacting us. We may need to keep order records for a reasonable time for accounting and dispute purposes.',
          'You can switch off offer emails in My Account (Offer emails), with the Unsubscribe link at the bottom of every email, or from the footer link "Manage offer emails". You can switch off notifications in My Account (Notifications on this device) or in your browser or phone settings.',
          'You can control ads in your Facebook / Instagram "Ad preferences" and Google "Ad settings", and you can install the Google Analytics opt-out browser add-on.',
          'You can clear your browser data at any time, and you can sign out of your account whenever you like.',
        ] },
        { h: '7. Children', p: ['Our shop is meant for adults. If you are under 18, please order with a parent or guardian.'] },
        { h: '8. Changes', p: ['We may update this policy from time to time. The latest version is always on this page.'] },
        { h: '9. Contact us', p: [`Email: ${EMAIL}  |  WhatsApp: ${WA_TEXT}`] },
      ],
    },
    bn: {
      title: 'গোপনীয়তা নীতি (Privacy Policy)',
      intro: 'কাইভ্রো (www.kyvro.store) আপনার গোপনীয়তাকে সম্মান করে। আমাদের ওয়েবসাইট ব্যবহার বা অর্ডার করলে আমরা কী তথ্য নিই, কেন নিই এবং কীভাবে সুরক্ষিত রাখি, তা এই পেজে বলা হয়েছে।',
      sections: [
        { h: '১. আমরা কী তথ্য সংগ্রহ করি', li: [
          'অর্ডারের তথ্য: আপনার নাম, ফোন নম্বর, ডেলিভারির ঠিকানা (জেলা, থানা/উপজেলা, এলাকা, রাস্তা) এবং আপনার লেখা মন্তব্য।',
          'অ্যাকাউন্টের তথ্য: Google দিয়ে লগইন করলে আপনার নাম, ইমেইল ঠিকানা ও প্রোফাইল ছবি আমরা পাই।',
          'আপনার অর্ডার, সেভ করা পণ্য এবং কার্ট।',
          'অফার ইমেইল ও নোটিফিকেশন: আপনার ইমেইল ঠিকানা এবং আমাদের নোটিফিকেশন পপ-আপে "Allow" চাপলে আপনার ডিভাইসের নোটিফিকেশন ঠিকানা।',
          'ওয়েবসাইট ব্যবহারের তথ্য: আপনি কোন পেজ ও পণ্য দেখেন, কার্টে কী যোগ করেন, অর্ডার সম্পন্ন হলো কি না (অর্ডারের মূল্যসহ), এবং ব্রাউজার, ডিভাইসের ধরন ও আনুমানিক অবস্থানের মতো কারিগরি তথ্য। এগুলো Facebook (Meta) Pixel ও Google Analytics সংগ্রহ করে।',
          'সাইট চালানোর জন্য আপনার ব্রাউজারে রাখা ছোট তথ্য (local storage): কার্ট, ডার্ক/লাইট মোড ও বেছে নেওয়া মুদ্রা।',
        ] },
        { h: '২. তথ্য কীভাবে ব্যবহার করি', li: [
          'আপনার অর্ডার নিশ্চিত করা, প্যাক করা ও ডেলিভারি দেওয়া এবং ফোন, WhatsApp বা ইমেইলে যোগাযোগ করা।',
          'আপনার অর্ডারের ইতিহাস দেখানো এবং নির্দিষ্ট সময়ের মধ্যে অর্ডার বাতিল করার সুযোগ দেওয়া।',
          'ভুয়া বা অপব্যবহারমূলক অর্ডার ঠেকানো (যেমন ভুয়া অর্ডারকারী ফোন নম্বর বা অ্যাকাউন্ট ব্লক করা)।',
          'Google দিয়ে লগইন করলে বা নোটিফিকেশন Allow করলে ইমেইল ও ফোন/ব্রাউজার নোটিফিকেশনে অফার ও খবর পাঠানো। আপনি যে কোনো সময় এগুলো বন্ধ করতে পারবেন (৬ নম্বর দেখুন)।',
          'দর্শকরা ওয়েবসাইট কীভাবে ব্যবহার করেন তা বোঝা এবং যারা আমাদের দোকান দেখেছেন তাদের Facebook, Instagram ও Google-এ কাইভ্রোর বিজ্ঞাপন দেখানো (বিজ্ঞাপন ও রিমার্কেটিং)।',
          'দোকানের মান উন্নত করা এবং আপনার প্রশ্নের উত্তর দেওয়া।',
        ] },
        { h: '৩. কাদের সাথে তথ্য শেয়ার করি', p: ['আমরা আপনার ব্যক্তিগত তথ্য বিক্রি করি না। অর্ডার সম্পন্ন করতে যতটুকু দরকার, শুধু ততটুকুই শেয়ার করি:'], li: [
          'ডেলিভারি ও কুরিয়ার সহযোগী (আপনার নাম, ফোন নম্বর ও ঠিকানা)।',
          'অনলাইনে পেমেন্ট করলে bKash বা Nagad-এর মতো পেমেন্ট সেবা।',
          'Google Firebase, যা আমাদের তথ্য নিরাপদে সংরক্ষণ করে, Google লগইন চালায় ও নোটিফিকেশন পাঠায়।',
          'আমাদের ইমেইল পাঠানোর সেবা (Resend), যা অফার ও অর্ডারের ইমেইল পাঠায়।',
          'Meta (Facebook / Instagram) ও Google (Google Analytics): আমাদের বিজ্ঞাপন ও ওয়েবসাইট মাপা ও উন্নত করতে তারা আপনার ভিজিটের ব্যবহার-তথ্য (দেখা পেজ, কার্টে যোগ করা পণ্য, সম্পন্ন অর্ডার) পায়। আপনার নাম, ফোন নম্বর বা ঠিকানা আমরা তাদের পাঠাই না।',
          'আইন বাধ্য করলে সংশ্লিষ্ট কর্তৃপক্ষ।',
        ] },
        { h: '৪. সংরক্ষণ ও নিরাপত্তা', p: ['আপনার তথ্য Google Firebase-এর সার্ভারে জমা থাকে। শুধু অনুমোদিত কাইভ্রো টিমের সদস্যরা গ্রাহকের অর্ডার দেখতে পারেন। কোনো ব্যবস্থাই ১০০% নিরাপদ নয়, তবে আপনার তথ্য রক্ষায় আমরা যুক্তিসঙ্গত পদক্ষেপ নিই।'] },
        { h: '৫. কুকি ও লোকাল স্টোরেজ', p: ['দোকান চালাতে যা দরকার (লগইন, কার্ট, থিম, মুদ্রা) সেই ব্রাউজার স্টোরেজ ও লগইন কুকি আমরা ব্যবহার করি। এছাড়া Facebook (Meta) Pixel ও Google Analytics ব্যবহার করি, যেগুলো আপনার ব্রাউজারে কুকি বা অনুরূপ আইডি রেখে ভিজিট গোনে, কোন পেজ ও পণ্য জনপ্রিয় তা দেখে, আমাদের বিজ্ঞাপন মাপে এবং দোকান দেখা মানুষদের আমাদের বিজ্ঞাপন দেখায়। এই টুলগুলো শুধু অ্যানালিটিক্স ও বিজ্ঞাপনের জন্য ব্যবহৃত হয়। ব্রাউজার সেটিংস বা অ্যাড ব্লকার দিয়ে এগুলো বন্ধ করলেও দোকান ঠিকমতো চলবে।'] },
        { h: '৬. আপনার অধিকার', li: [
          'আমাদের সাথে যোগাযোগ করে আপনার তথ্য সংশোধন বা মুছে ফেলার অনুরোধ করতে পারেন। হিসাব ও বিরোধ নিষ্পত্তির জন্য অর্ডারের রেকর্ড কিছুদিন রাখার দরকার হতে পারে।',
          'অফার ইমেইল বন্ধ করতে পারবেন My Account (Offer emails) থেকে, প্রতিটি ইমেইলের নিচের Unsubscribe লিংক থেকে, বা ফুটারের "Manage offer emails" লিংক থেকে। নোটিফিকেশন বন্ধ করতে পারবেন My Account (Notifications on this device) থেকে অথবা ব্রাউজার বা ফোনের সেটিংস থেকে।',
          'আপনার Facebook / Instagram "Ad preferences" ও Google "Ad settings" থেকে বিজ্ঞাপন নিয়ন্ত্রণ করতে পারেন, এবং Google Analytics opt-out ব্রাউজার অ্যাড-অন ইনস্টল করতে পারেন।',
          'আপনি যে কোনো সময় ব্রাউজারের ডেটা মুছতে এবং অ্যাকাউন্ট থেকে সাইন আউট করতে পারেন।',
        ] },
        { h: '৭. শিশুদের ব্যাপারে', p: ['আমাদের দোকান প্রাপ্তবয়স্কদের জন্য। আপনার বয়স ১৮ বছরের কম হলে অভিভাবকের সাথে অর্ডার করুন।'] },
        { h: '৮. পরিবর্তন', p: ['আমরা সময়ে সময়ে এই নীতি বদলাতে পারি। সর্বশেষ সংস্করণ সবসময় এই পেজেই থাকবে।'] },
        { h: '৯. যোগাযোগ', p: [`ইমেইল: ${EMAIL}  |  WhatsApp: ${WA_TEXT}`] },
      ],
    },
  },

  terms: {
    en: {
      title: 'Terms & Conditions',
      intro: 'By using www.kyvro.store and placing an order, you agree to these terms. Please read them together with our Privacy Policy and Return & Refund Policy.',
      sections: [
        { h: '1. Your account', p: ['You need to sign in with a Google account to place an order. You can add products to your cart without signing in. You are responsible for the information you give us and must provide a correct name, phone number and address.'] },
        { h: '2. Products and prices', li: [
          'All prices are in Bangladeshi Taka (BDT). Other currencies shown on the site are only an estimate.',
          'Photos are for reference. Colours may look slightly different on your screen.',
          'Stock is limited and shown for each size and colour. A product can run out before your order is confirmed.',
          'We may correct a wrong price or stock number. If that affects your order, we will contact you before going ahead.',
        ] },
        { h: '3. Placing and confirming an order', li: [
          'When you place an order it is first marked Pending. It is confirmed only when our team accepts it (we may call or message you on WhatsApp).',
          'We may cancel an order if the product is out of stock, the details are incomplete or wrong, or we believe the order is fake or abusive.',
          'We may block phone numbers or accounts that repeatedly place fake orders.',
        ] },
        { h: '4. Cancelling your order', p: ['You can cancel your own order from your account within 30 minutes of placing it, as long as it is still Pending. After that, or once our team has confirmed the order, it can no longer be cancelled online. Please contact us on WhatsApp if you need help.'] },
        { h: '5. Payment', li: [
          'Cash on Delivery (COD): you pay the delivery person when you receive the product.',
          'Online payment: you pay in advance with the payment method shown at checkout. Your order is processed after we receive the payment.',
        ] },
        { h: '6. Delivery', li: [
          'Delivery charge: a charge that depends on your delivery area (inside or outside Dhaka), shown at checkout before you order. Delivery may be free when your order reaches the minimum amount shown on the website (and you use the payment method it names). See the Return & Refund Policy for what happens if you return the product.',
          'Our team will tell you the expected delivery time when the order is confirmed. Delays caused by couriers, weather or other things outside our control may happen.',
          'Please keep your phone on so the delivery person can reach you.',
        ] },
        { h: '7. Returns and refunds', p: ['Please read our Return & Refund Policy. In short: check the product in front of the delivery person while they wait; once you accept and take it, it cannot be refunded, and a return or exchange after they leave costs an additional delivery charge.'] },
        { h: '8. Using the website', p: ['Please do not misuse the website, place fake orders, try to break into the system or copy our photos and content without permission. All Kyvro names, logos, photos and text belong to Kyvro.'] },
        { h: '9. Our responsibility', p: ['We do our best to keep the website correct and available, but we cannot promise it will always be error-free or uninterrupted. Our responsibility for any order is limited to the amount you paid for that order.'] },
        { h: '10. Governing law and changes', p: ['These terms follow the laws of Bangladesh. We may update them from time to time; the latest version is always on this page.'] },
        { h: '11. Contact us', p: [`Email: ${EMAIL}  |  WhatsApp: ${WA_TEXT}`] },
      ],
    },
    bn: {
      title: 'শর্তাবলি (Terms & Conditions)',
      intro: 'www.kyvro.store ব্যবহার করলে এবং অর্ডার দিলে আপনি এই শর্তগুলো মেনে নিচ্ছেন। অনুগ্রহ করে এটি আমাদের গোপনীয়তা নীতি ও রিটার্ন ও রিফান্ড নীতির সাথে পড়ুন।',
      sections: [
        { h: '১. আপনার অ্যাকাউন্ট', p: ['অর্ডার দিতে Google অ্যাকাউন্ট দিয়ে লগইন করতে হয়। লগইন ছাড়াই কার্টে পণ্য যোগ করা যায়। আপনার দেওয়া তথ্যের দায়িত্ব আপনার, তাই সঠিক নাম, ফোন নম্বর ও ঠিকানা দিন।'] },
        { h: '২. পণ্য ও দাম', li: [
          'সব দাম বাংলাদেশি টাকায় (BDT)। সাইটে দেখানো অন্য মুদ্রা শুধু আনুমানিক।',
          'ছবি রেফারেন্সের জন্য। আপনার স্ক্রিনে রঙ সামান্য আলাদা দেখাতে পারে।',
          'স্টক সীমিত এবং প্রতিটি সাইজ ও রঙের জন্য আলাদা দেখানো হয়। অর্ডার নিশ্চিত হওয়ার আগেই পণ্য শেষ হয়ে যেতে পারে।',
          'ভুল দাম বা স্টক সংখ্যা থাকলে আমরা তা ঠিক করতে পারি। তাতে আপনার অর্ডার প্রভাবিত হলে এগিয়ে যাওয়ার আগে আমরা আপনার সাথে যোগাযোগ করব।',
        ] },
        { h: '৩. অর্ডার দেওয়া ও নিশ্চিত করা', li: [
          'অর্ডার দিলে প্রথমে সেটি Pending থাকে। আমাদের টিম গ্রহণ করলেই তবে নিশ্চিত হয় (আমরা ফোন বা WhatsApp-এ যোগাযোগ করতে পারি)।',
          'পণ্য স্টকে না থাকলে, তথ্য অসম্পূর্ণ বা ভুল হলে, অথবা অর্ডারটি ভুয়া বা অপব্যবহারমূলক মনে হলে আমরা অর্ডার বাতিল করতে পারি।',
          'বারবার ভুয়া অর্ডার করলে সেই ফোন নম্বর বা অ্যাকাউন্ট আমরা ব্লক করতে পারি।',
        ] },
        { h: '৪. অর্ডার বাতিল', p: ['অর্ডার দেওয়ার ৩০ মিনিটের মধ্যে, যতক্ষণ সেটি Pending আছে, আপনি নিজের অ্যাকাউন্ট থেকে অর্ডার বাতিল করতে পারবেন। এরপর, অথবা আমাদের টিম নিশ্চিত করার পর, অনলাইনে আর বাতিল করা যাবে না। সাহায্য লাগলে WhatsApp-এ যোগাযোগ করুন।'] },
        { h: '৫. পেমেন্ট', li: [
          'ক্যাশ অন ডেলিভারি (COD): পণ্য হাতে পাওয়ার সময় ডেলিভারি ম্যানকে টাকা দেবেন।',
          'অনলাইন পেমেন্ট: চেকআউটে দেখানো পদ্ধতিতে আগে টাকা দেবেন। পেমেন্ট পাওয়ার পর আপনার অর্ডার প্রসেস হবে।',
        ] },
        { h: '৬. ডেলিভারি', li: [
          'ডেলিভারি চার্জ: ডেলিভারি এলাকা (ঢাকার ভিতরে বা বাইরে) অনুযায়ী ঠিক হয়, অর্ডারের আগে চেকআউটে দেখানো হয়। ওয়েবসাইটে দেখানো ন্যূনতম অর্ডার পূর্ণ হলে (এবং উল্লেখ করা পেমেন্ট পদ্ধতি ব্যবহার করলে) ডেলিভারি ফ্রি হতে পারে। পণ্য ফেরত দিলে কী হবে তা রিটার্ন ও রিফান্ড নীতিতে দেখুন।',
          'অর্ডার নিশ্চিত হলে আমাদের টিম আনুমানিক ডেলিভারির সময় জানাবে। কুরিয়ার, আবহাওয়া বা আমাদের নিয়ন্ত্রণের বাইরের কারণে দেরি হতে পারে।',
          'ডেলিভারি ম্যান যেন যোগাযোগ করতে পারে, তাই ফোন চালু রাখুন।',
        ] },
        { h: '৭. রিটার্ন ও রিফান্ড', p: ['আমাদের রিটার্ন ও রিফান্ড নীতি পড়ুন। সংক্ষেপে: ডেলিভারি ম্যান দাঁড়িয়ে থাকা অবস্থায় পণ্য দেখে নিন; একবার গ্রহণ করে নিলে আর রিফান্ড হবে না, আর ডেলিভারি ম্যান চলে যাওয়ার পর রিটার্ন বা পরিবর্তনে অতিরিক্ত ডেলিভারি চার্জ লাগবে।'] },
        { h: '৮. ওয়েবসাইট ব্যবহার', p: ['ওয়েবসাইটের অপব্যবহার, ভুয়া অর্ডার, সিস্টেমে ঢোকার চেষ্টা, বা অনুমতি ছাড়া আমাদের ছবি ও লেখা কপি করা যাবে না। কাইভ্রোর সব নাম, লোগো, ছবি ও লেখার মালিক কাইভ্রো।'] },
        { h: '৯. আমাদের দায়', p: ['ওয়েবসাইট সঠিক ও চালু রাখতে আমরা সর্বোচ্চ চেষ্টা করি, তবে এটি সবসময় ত্রুটিহীন বা বিরতিহীন থাকবে এমন নিশ্চয়তা দিতে পারি না। কোনো অর্ডারের ক্ষেত্রে আমাদের দায় সেই অর্ডারে আপনার দেওয়া টাকার অঙ্কে সীমাবদ্ধ।'] },
        { h: '১০. প্রযোজ্য আইন ও পরিবর্তন', p: ['এই শর্তাবলি বাংলাদেশের আইন অনুযায়ী চলবে। আমরা সময়ে সময়ে এটি হালনাগাদ করতে পারি; সর্বশেষ সংস্করণ এই পেজেই থাকবে।'] },
        { h: '১১. যোগাযোগ', p: [`ইমেইল: ${EMAIL}  |  WhatsApp: ${WA_TEXT}`] },
      ],
    },
  },

  refund: {
    en: {
      title: 'Return & Refund Policy',
      intro: 'We want you to be happy with your order. Because you can check the product when it arrives, our policy is simple: decide at the door, together with the delivery person.',
      sections: [
        { h: '1. Cash on Delivery (COD)', li: [
          'You can open and check the product in front of the delivery person before you pay.',
          'If you do not like it, you can refuse it and hand it back to the delivery person right then. You will not pay for the product.',
          'The delivery charge is not refundable. If you refuse the product, you pay the delivery charge shown at checkout to the delivery person (even if your order had free delivery).',
          'Check the product carefully while the delivery person is waiting. If you find any fault or defect, ask to return it at that moment.',
          'Once you receive and take the product, it cannot be returned or refunded, whether it is used or not.',
          'If you want to return or exchange the product after the delivery person has left, you must pay an additional delivery charge.',
        ] },
        { h: '2. Online payment', li: [
          'If you paid online and the product could not be delivered to you (you did not receive it), we will refund your money within 2 weeks (14 days).',
          'If you paid the full amount online and you do not like the product when it arrives, you can check it in front of the delivery person and return it to the delivery person then. We will refund the amount you paid after deducting the standard delivery charge shown at checkout (even if your order had free delivery). The refund is made within 2 weeks (14 days).',
          'Refunds are sent to the same bKash, Nagad or other account you paid from.',
        ] },
        { h: '3. When we cannot refund', li: [
          'The product has already been received and taken by you.',
          'The product has been used, washed, worn or damaged after delivery.',
          'You ask for a refund after the delivery person has left. Refund requests must be made to the delivery person at the time of delivery. After the delivery person has left, a return or exchange is only possible by paying an additional delivery charge.',
        ] },
        { h: '4. How to get help', p: [`If you have any problem with an order, message us on WhatsApp ${WA_TEXT} or email ${EMAIL} with your order number (for example KYV-261027-1234).`] },
      ],
    },
    bn: {
      title: 'রিটার্ন ও রিফান্ড নীতি',
      intro: 'আপনি আপনার অর্ডারে খুশি থাকুন, এটাই আমরা চাই। পণ্য আসার সময়ই দেখে নেওয়া যায় বলে আমাদের নীতি সহজ: ডেলিভারি ম্যানের সামনে, দরজাতেই সিদ্ধান্ত নিন।',
      sections: [
        { h: '১. ক্যাশ অন ডেলিভারি (COD)', li: [
          'টাকা দেওয়ার আগে ডেলিভারি ম্যানের সামনে পণ্য খুলে দেখে নিতে পারবেন।',
          'পছন্দ না হলে তখনই ডেলিভারি ম্যানকে পণ্য ফেরত দিতে পারবেন। পণ্যের টাকা দিতে হবে না।',
          'ডেলিভারি চার্জ ফেরতযোগ্য নয়। পণ্য ফেরত দিলে চেকআউটে দেখানো ডেলিভারি চার্জ ডেলিভারি ম্যানকে দিতে হবে (আপনার অর্ডারে ডেলিভারি ফ্রি থাকলেও)।',
          'ডেলিভারি ম্যান দাঁড়িয়ে থাকা অবস্থায় পণ্যটি ভালোভাবে চেক করে নিতে হবে। পণ্যে কোনো ত্রুটি পেলে তখনই রিটার্ন করতে বলবেন।',
          'পণ্য একবার হাতে নিয়ে গ্রহণ করে নিলে, ব্যবহার করুন বা না করুন, আর ফেরত বা রিফান্ড হবে না।',
          'ডেলিভারি ম্যান চলে যাওয়ার পর পণ্যটি রিটার্ন অথবা পরিবর্তন করে নিতে চাইলে অতিরিক্ত ডেলিভারি চার্জ প্রদান করতে হবে।',
        ] },
        { h: '২. অনলাইন পেমেন্ট', li: [
          'অনলাইনে টাকা দেওয়ার পর পণ্য যদি আপনার কাছে পৌঁছাতে না পারে (আপনি না পান), তাহলে ২ সপ্তাহের (১৪ দিনের) মধ্যে আপনার টাকা ফেরত দেওয়া হবে।',
          'অনলাইনে পুরো টাকা দেওয়ার পর পণ্য আসার সময় পছন্দ না হলে ডেলিভারি ম্যানের সামনে দেখে তখনই তাকে ফেরত দিতে পারবেন। তখন আপনার দেওয়া টাকা থেকে চেকআউটে দেখানো সাধারণ ডেলিভারি চার্জ কেটে (ডেলিভারি ফ্রি থাকলেও) বাকি টাকা ফেরত দেওয়া হবে। ফেরত ২ সপ্তাহের (১৪ দিনের) মধ্যে দেওয়া হবে।',
          'যে bKash, Nagad বা অন্য অ্যাকাউন্ট থেকে টাকা দিয়েছেন, রিফান্ড সেখানেই যাবে।',
        ] },
        { h: '৩. যখন রিফান্ড দেওয়া যাবে না', li: [
          'আপনি পণ্য গ্রহণ করে নিয়ে নিয়েছেন।',
          'ডেলিভারির পর পণ্য ব্যবহার, ধোয়া, পরা বা নষ্ট করা হয়েছে।',
          'ডেলিভারি ম্যান চলে যাওয়ার পর রিফান্ড চাইলে। রিফান্ডের অনুরোধ ডেলিভারির সময়ই ডেলিভারি ম্যানের কাছে করতে হবে। ডেলিভারি ম্যান চলে যাওয়ার পর রিটার্ন বা পরিবর্তন শুধু অতিরিক্ত ডেলিভারি চার্জ দিলেই সম্ভব।',
        ] },
        { h: '৪. সাহায্য পাবেন যেভাবে', p: [`অর্ডারে কোনো সমস্যা হলে অর্ডার নম্বর (যেমন KYV-261027-1234) সহ WhatsApp ${WA_TEXT} এ মেসেজ করুন বা ${EMAIL} এ ইমেইল করুন।`] },
      ],
    },
  },
};

export const POLICY_VIEWS = ['privacy', 'terms', 'refund'];

function Block({ doc, updated, isDarkMode }) {
  return (
    <section className="space-y-5">
      <h2 className="text-2xl sm:text-3xl font-serif font-bold">{doc.title}</h2>
      <p className="text-[11px] text-gray-500">{updated}</p>
      <p className="text-sm leading-relaxed">{doc.intro}</p>
      {doc.sections.map((s) => (
        <div key={s.h} className="space-y-2">
          <h3 className="font-bold text-sm">{s.h}</h3>
          {(s.p || []).map((t, i) => <p key={i} className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t}</p>)}
          {s.li && (
            <ul className={`list-disc pl-5 space-y-1.5 text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {s.li.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}

export default function PolicyPages({ page, isDarkMode, setCurrentView }) {
  const p = PAGES[page] || PAGES.privacy;
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  const tabs = [['privacy', 'Privacy Policy'], ['terms', 'Terms & Conditions'], ['refund', 'Return & Refund']];
  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
      <button onClick={() => setCurrentView('home')} className="text-xs text-gray-500 hover:text-[#D4AF37] mb-6">&larr; Back to shop</button>
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setCurrentView(k)} className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition ${page === k ? 'bg-[#D4AF37] text-black' : 'bg-gray-200 dark:bg-[#222] text-gray-700 dark:text-gray-300'}`}>{label}</button>
        ))}
      </div>
      <Block doc={p.en} updated={UPDATED_EN} isDarkMode={isDarkMode} />
      <div className={`my-10 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`} />
      <div lang="bn"><Block doc={p.bn} updated={UPDATED_BN} isDarkMode={isDarkMode} /></div>
    </div>
  );
}
