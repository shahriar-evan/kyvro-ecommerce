# Kyvro (kyvro.store)

Fashion dropshipping store for Bangladesh, prices in BDT. Owner: Evan (shahriarevan545@gmail.com).

- **Stack**: React 18 + Vite + Tailwind; Firebase Auth (Google for customers/sellers, email+password or Google for staff) + Firestore; Vercel serverless functions in `api/`.
- **Payments**: UddoktaPay (bKash / Nagad) for orders and shop plans; Manual bKash / Nagad for orders. SSLCommerz code exists but UddoktaPay is the live provider. No recurring charge exists: plans are renewed by hand.
- **Language**: Evan writes casual Banglish. Reply in Banglish, short and action oriented. Site UI text is English; the seller plan page also has Bangla (`src/data/planText.js`).

## Hard rules

1. **Supplier data (name, cost, link, profit) is never shown to Admins or sellers**, in the UI or through Firestore rules. `productCosts`, `orderSupply` are Owner/Manager only; `productCommission.profit` exists so Admins see earnings without the cost.
2. **Customer PII (name, phone, address) is never given to sellers.** Sellers see their orders only through `api/plan.js?action=seller-earnings` (order number, date, status, products, markup).
3. **Seller WhatsApp / address / email are Owner only** (`sellers/{uid}`); Managers never read `sellers/`.
4. **`tier` and `paidUntil` (on `subscriptions/{uid}` and on shops) are written only by the server** (`api/plan.js`). Never add them to a client-writable branch in `firestore.rules`.
5. **Vercel Hobby allows at most 12 serverless functions. We use 11.** Do not add files under `api/` that are not prefixed with `_`. New server work goes inside an existing function as `?action=` (`api/plan.js` or `api/shop-request-notify.js`), with the code in `api/_plan/` (files and folders starting with `_` are not functions).
6. Links stored on shops must be `https://` only (no `javascript:` / `data:`); images are data URLs `data:image/(png|jpeg|webp);base64,...`.
7. Do not commit, push or merge unless Evan asks. Work on a feature branch. Run `npx vite build` before saying a change is done. Never paste or print secrets.
8. The money logic (markup cap, price check, commission, payouts) must not change unless Evan asks for exactly that.

## Roles

| Role | Who | Can | Cannot |
|---|---|---|---|
| **Owner** | fixed email in `src/adminEmails.js` and `isFixedOwner()` in rules (+ `admins` role owner) | everything; plan prices; comp plans; sellers' details; kill switch; Mark as paid; delete orders | – |
| **Manager** | `admins/{email}` role manager | supplier data, profit; confirm orders; mark Delivered; Mark as returned; own shop (markup); see Admins' stats; Plan Members: feature ON/OFF, logo/banner approve, shop ON/OFF on others' shops | change own shop's features; switch on killed/pending shops; comp plans; seller details; Owner-only settings |
| **Admin** | `admins/{email}` role admin | place / confirm orders; commission on own `soldBy` main-store sales; "Request delivered"; own shop only with "Shop create" ON (pending until Owner accepts; earns markup) | supplier data; mark Delivered or Paid; create shops without permission |
| **Seller** | any signed-in customer not in `admins/` ("Sell on Kyvro") | one shop after Owner approval; markup on delivered orders; plan Pro/Premium | supplier data; customer data; touching orders; writing `active`, `status`, `tier`, `paidUntil` |

Per-member toggles on `admins/{email}` (default OFF): `addProducts`, `editAll`, `canApprove`, `canCreateShop`.

## Firestore collections (rules in `firestore.rules`)

- `admins/{email}` team list; `adminPrivate/{email}` Owner-only details; `statsReset/{email}`.
- `products/{id}` public (approved) / staff (all); `productCosts/{id}` Owner/Manager; `productCommission/{id}` staff.
- `orders/{orderNumber}`: customer writes on create (validated); staff updates; fields `soldBy`, `shop`, `items[].basePrice`, `returned`, `cancelRequest`, `deliveredRequest`, `deliveredReject`. `orderSupply/{id}` Owner/Manager.
- `shops/{slug}` public read. Team shops (`kind` missing/'team') and seller shops (`kind: 'seller'`). Fields: `name`, `ownerUid`, `items{productId: price}`, `active`, `status` (pending/approved), `killed`, `planExempt` (Owner's shop), `tier`, `paidUntil` (server), extras (`tagline`, `contactUrl`, `about`, `socialLinks`, `brandColor`, `announcement`, `pinnedItems`), `features{}` overrides, `logo*`, `banner*`.
- `shopOwners/{slug}` team shops' owner email (Owner/Manager/self). Sellers do not get one.
- `sellers/{uid}` seller application + private details (self + Owner); `sellerPayout/{uid}` bKash (seller writes, Owner reads).
- `subscriptions/{uid}` plan (server writes; self + Owner read); `subscriptionPayments/{invoiceId}` server only.
- `payouts/{id}` Owner writes, member reads own. `settings/store`, `settings/plans`, `settings/sellerRules` public read, Owner write.
- `users/{uid}`, `subscribers/{email}`, `pushTokens/{token}`, `blockedPhones`, `blockedEmails`.

## Money

- Profit = (basePrice − supplier cost) × qty. Shop markup = (price − basePrice) × qty, capped by `shopPriceClamp` (`src/data/priceCheck.js`).
- Admin commission: only orders with `soldBy` = that Admin and no `shop`, Delivered, not returned, by `productCommission.pct` (max 15).
- Shop markup goes to the shop owner (team via `shopOwners`, seller via `sellers`), Delivered and not returned only.
- Order prices are checked on the server before any payment page (`verifyOrderPrices` in `api/_sslc.js`, `checkOrderPrices` / `orderVisibleIds` in `src/data/priceCheck.js`) and flagged in the Orders panel.

## Plans and sellers

- Tiers: **Free** (`freeLimit` products, default 10), **Pro** and **Premium** (up to 300). Prices in `settings/plans` (`pro`/`premium` `{price, discount}`), computed on the server (`planPrice`). Expired = Free: only the top `freeLimit` best sellers show; the rest are hidden, not deleted.
- Payment: `api/plan.js?action=init` (tier priced on the server; no Pro while Premium runs) → UddoktaPay → `?action=callback` verifies and sets `paidUntil = max(now, paidUntil) + period` once per invoice → `syncShops` copies `tier`/`paidUntil` to shops. Reminders: daily cron `?action=reminders` (`vercel.json`, needs `CRON_SECRET`). Owner comp plans: `?action=comp`.
- Features per shop: defaults by tier (`FEATURES` in `src/data/shopBrand.js`, `featOn()` in rules); Owner/Manager override per shop in Plan Members (`shops.features`).
- Seller flow: Sell on Kyvro → plan page (Free / Pro / Premium, Compare, FAQ) → application (`sellers/{uid}` pending + shop OFF pending, categories) → Owner approves (shop live) or rejects (shop removed, can re-apply) → shop editor (My Shop) → plan upgrade after approval. New applications, logos and banners notify the Owner via `api/shop-request-notify.js` actions.
- Abuse controls: one shop per account, blocked name words (`settings/sellerRules`), "New sellers allowed" switch, kill switch (`killed`, Owner only).

## Deploy order (every time `firestore.rules` changes)

1. Merge the PR on GitHub.
2. Wait until the Vercel **Production** deployment is **Ready**.
3. Paste the **full** `firestore.rules` into Firebase Console → Firestore → Rules and press **Publish** (rules are not deployed by CI). Check the editor is not empty before publishing.

After plan-setting changes, the Owner presses **Save plans** once. Vercel env: `FIREBASE_SERVICE_ACCOUNT`, `UDDOKTAPAY_BASE_URL`, `UDDOKTAPAY_API_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `CRON_SECRET` (+ SSLCommerz vars if used).

## Key files

`src/App.jsx` (state, storefront, shop context, order creation) · `src/components/AdminPortal.jsx` (tabs) · `OrdersPanel.jsx` · `TeamStats.jsx` · `MyShop.jsx` + `ShopExtrasEditor.jsx` · `SellerDashboard.jsx` · `SellersPanel.jsx` · `PlanMembers.jsx` · `PlanCards.jsx` / `PlanCompareFaq.jsx` · `src/data/priceCheck.js` (plans, prices, visibility) · `src/data/shopBrand.js` (features, extras) · `src/sellers.js`, `src/shops.js`, `src/orders.js` · `api/plan.js` + `api/_plan/*` · `api/_sslc.js` · `firestore.rules`.
