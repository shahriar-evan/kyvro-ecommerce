# Kyvro (kyvro.store)

Fashion dropshipping store for Bangladesh, prices in BDT. Owner: Evan (shahriarevan545@gmail.com).

- **Stack**: React 18 + Vite + Tailwind; Firebase Auth (Google for customers/sellers, email+password or Google for staff) + Firestore; Vercel serverless functions in `api/`.
- **Payments**: UddoktaPay (bKash / Nagad) for orders and shop plans; Manual bKash / Nagad for orders. SSLCommerz code exists but UddoktaPay is the live provider. No recurring charge exists: plans are renewed by hand.
- **Language**: Evan writes casual Banglish. Reply in Banglish, short and action oriented. Site UI text is English; the seller plan page also has Bangla (`src/data/planText.js`).

## Hard rules

1. **Supplier data (name, cost, link, profit) is never shown to Admins or sellers**, in the UI or through Firestore rules. `productCosts`, `orderSupply` are Owner/Manager only; `productCommission.profit` exists so Admins see earnings without the cost.
2. **Customer PII (name, phone, address) is never given to sellers.** Sellers see their orders only through `api/plan.js?action=seller-earnings` (order number, date, status, products, markup).
3. **Seller WhatsApp / address / email are Owner only** (`sellers/{uid}`); Managers never read `sellers/`.
4. **`tier`, `paidUntil` and `basicUntil` (on `subscriptions/{uid}` and on shops) are written only by the server** (`api/plan.js`). Never add them to a client-writable branch in `firestore.rules`. `basicFree` is written once when a store opens (checked against `settings/plans`) and never changed by the client.
5. **Vercel Hobby allows at most 12 serverless functions. We use 11.** Do not add files under `api/` that are not prefixed with `_`. New server work goes inside an existing function as `?action=` (`api/plan.js` or `api/shop-request-notify.js`), with the code in `api/_plan/` (files and folders starting with `_` are not functions).
6. Links stored on shops must be `https://` only (no `javascript:` / `data:`); images are data URLs `data:image/(png|jpeg|webp);base64,...`.
7. Do not commit, push or merge unless Evan asks. Work on a feature branch. Run `npx vite build` before saying a change is done. Never paste or print secrets.
8. The money logic (markup cap, price check, commission, payouts) must not change unless Evan asks for exactly that.

## Roles

| Role | Who | Can | Cannot |
|---|---|---|---|
| **Owner** | fixed email in `src/adminEmails.js` and `isFixedOwner()` in rules (+ `admins` role owner) | everything; plan prices; comp plans; sellers' details; Remove shops; Mark as paid; delete orders; read-only **View dashboard** of any seller; main site theme | – |
| **Manager** | `admins/{email}` role manager | supplier data, profit; confirm orders; mark Delivered; Mark as returned; own shop (markup); see Admins' stats; Plan Members: feature ON/OFF, logo/banner approve, shop ON/OFF on others' shops | change own shop's features; switch on killed/pending shops; comp plans; seller details; Owner-only settings |
| **Admin** | `admins/{email}` role admin | place / confirm orders; commission on own `soldBy` main-store sales; "Request delivered"; own shop only with "Shop create" ON (pending until Owner accepts; earns markup) | supplier data; mark Delivered or Paid; create shops without permission |
| **Seller** | any signed-in customer not in `admins/` ("Sell on Kyvro") | every shop live at once (or after paying Basic, see Plans), more shops by plan (Basic 1 / Pro 2 / Premium 3; extras live at once, the Owner gets a notification); markup on delivered orders; plan Pro/Premium | supplier data; customer data; touching orders; writing `status`, `tier`, `paidUntil`, `basicUntil`, `basicFree` (after create), `killed`; `active` only ON / OFF on their own approved, not-killed shop (Manage Shop switch; ON also clears `inactiveHold`) |

Per-member toggles on `admins/{email}` (default OFF): `addProducts`, `editAll`, `canApprove`, `canCreateShop`.

## Firestore collections (rules in `firestore.rules`)

- `admins/{email}` team list; `adminPrivate/{email}` Owner-only details; `statsReset/{email}`.
- `products/{id}` public (approved) / staff (all); `productCosts/{id}` Owner/Manager; `productCommission/{id}` staff.
- `orders/{orderNumber}`: customer writes on create (validated); staff updates; fields `soldBy`, `shop`, `items[].basePrice`, `returned`, `cancelRequest`, `deliveredRequest`, `deliveredReject`. `orderSupply/{id}` Owner/Manager.
- `shops/{slug}` public read. `slug` = fixed internal id (orders, earnings, payouts point at it; never changes). Team shops (`kind` missing/'team') and seller shops (`kind: 'seller'`). Fields: `name` (Website Name), `autoName` (no Website Name yet), `handle` (public link), `handleChangedAt`, `ownerUid`, `items{productId: price}`, `active`, `status` (pending/approved), `killed`, `extra` (seller's 2nd/3rd shop), `categories`, `inactiveHold`, `warning{note, at}`, `planExempt` (Owner's shop), `tier`, `paidUntil`, `basicUntil` (server), `basicFree` (seller shops, set on create), extras (`tagline`, `contactUrl`, `about`, `socialLinks`, `brandColor`, `announcement`, `pinnedItems`), `theme` + `themeMode` (storefront theme), `features{}` overrides, `logo*`, `banner*`.
- `shopHandles/{handle}` = `{slug, uid}`: unique public links + old aliases (public read; owner creates; only the Owner deletes).
- `shopOwners/{slug}` team shops' owner email (Owner/Manager/self). Sellers do not get one.
- `sellers/{uid}` seller application + private details (self + Owner): `slug` (first shop), `shops[]` (all shops), `basicFree`, `lastSeenAt`, `inactiveWarn*` / `inactiveHoldAt` (server). `sellerPayout/{uid}` bKash (seller writes, Owner reads).
- `subscriptions/{uid}` plan (server writes; self + Owner read): `tier`, `paidUntil`, `basicUntil`, reminder flags; `subscriptionPayments/{invoiceId}` server only.
- `payouts/{id}` Owner writes, member reads own. `settings/store`, `settings/plans` (+ `freeCategoryLimit`, `tierFeatures`, `shopLimits`, `basic{price, discount, label, endsAt}`), `settings/sellerRules`, `settings/theme` (main site `theme` + `themeMode`), `settings/sellerDash` (seller dashboard banner `banners[]` ≤ 3 × `{image ≤ 300 KB data URL, link https}`) public read, Owner write.
- `users/{uid}`, `subscribers/{email}`, `pushTokens/{token}`, `blockedPhones`, `blockedEmails`.

## Money

- Profit = (basePrice − supplier cost) × qty. Shop markup = (price − basePrice) × qty, capped by `shopPriceClamp` (`src/data/priceCheck.js`).
- Admin commission: only orders with `soldBy` = that Admin and no `shop`, Delivered, not returned, by `productCommission.pct` (max 15).
- Shop markup goes to the shop owner (team via `shopOwners`, seller via `sellers`), Delivered and not returned only. A seller's shops are counted together (one Earned / Due / payout): `api/_plan/seller.js` (only shops whose `ownerUid` matches) and `SellersPanel.jsx`.
- **Promo codes** (Premium `coupons`): `shops/{slug}.coupons = {CODE: {percent 1-50, minOrder, endsAt, active}}` (≤ 5), set in the seller dashboard (`PromoCodesEditor.jsx`). Checkout on that shop link takes the code; order gets `coupon {code, percent, amount}` and `total = subtotal − discount − coupon.amount + shipping`. The amount = percent of (subtotal − discount), **capped at the shop's markup** (`couponAmountFor`), so it only ever comes out of the seller's markup: every markup sum uses `orderMarkup(o)` (`src/data/priceCheck.js`; OrdersPanel, SellersPanel, TeamStats, `api/_plan/seller.js`, reminders). Rules (`couponOk`, kept short for the 1000-step limit) check on / percent / minimum / amount bound; end date and markup cap are checked at checkout, in `checkOrderPrices` (server before payment + Orders panel flag).
- **Order email** (Premium `orderEmail`): after a shop order the app calls `api/shop-request-notify?action=order`; the server checks the plan and emails the shop owner once (`sellerNotified`) with products + markup, **never the customer's details**.
- **Featured on Kyvro** (Premium `featured`): `FeaturedShops.jsx` on the main home lists live shops with the feature (not the Owner's own).
- Order prices are checked on the server before any payment page (`verifyOrderPrices` in `api/_sslc.js`, `checkOrderPrices` / `orderVisibleIds` in `src/data/priceCheck.js`) and flagged in the Orders panel.

## Plans and sellers

- Tiers: **Basic** (internal tier id `free` everywhere in code, rules and data; only the shown name is Basic, `TIER_LABEL`; `freeLimit` products, default 10), **Pro** and **Premium** (up to 300). Prices in `settings/plans` (`pro`/`premium` `{price, discount}` max 90%), computed on the server (`planPrice`). Expired Pro/Premium = Basic: only the top `freeLimit` best sellers show; the rest are hidden, not deleted.
- **Basic price** (`settings/plans.basic` `{price, discount 0-100, label, endsAt}`, Owner: Shop plans → Basic; `basicPrice`): the card shows list price, % off, the price, the label ("Launch offer" is translated) and "Offer ends …" (display only; the offer runs until the Owner changes the discount).
- **Paid Basic** (`basicCharging(plans)` = plans on and Basic ≥ ৳1; same test in rules `basicFreeNow()`):
  - At 100% off nobody pays. A store opened while Basic is ৳0 gets `basicFree: true` (sellers + shop, set on apply, rules check it) and stays free for good; stores from before this have no field = free. Extra stores copy the account's value.
  - While Basic is charged, a new store gets `basicFree: false` and is closed to customers (`basicDue(shop, plans)` → hidden like a not-live shop, Preview bar for the owner, orders refused in `verifyOrderPrices`) until the seller pays Basic (`?action=init` `tier: 'basic'`, server price). Payment sets `subscriptions.basicUntil = max(now, basicUntil) + periodDays` once per invoice and copies it to the shops (`syncBasic`, also `?action=sync`). Renew every period, else closed again (nothing deleted). Daily reminders for Basic too.
  - Back to 100% off = nobody pays (new or old). A running Pro / Premium includes Basic.
- Refunds: plan fees are non-refundable, no auto-renew (FAQ in `src/data/planText.js`; one line under the Pay / Renew buttons in `MyShop` plan section, EN + বাংলা). Double charges / payment errors: Kyvro support.
- Payment: `api/plan.js?action=init` (tier priced on the server; no Pro while Premium runs) → UddoktaPay → `?action=callback` verifies and sets `paidUntil = max(now, paidUntil) + period` once per invoice → `syncShops` copies `tier`/`paidUntil` to shops. Reminders: daily cron `?action=reminders` (`vercel.json`, needs `CRON_SECRET`). Owner comp plans: `?action=comp`.
- Features per shop: defaults by tier (`FEATURES` in `src/data/shopBrand.js`, `featOn()` in rules), changed per plan by the Owner (Shop plans → Plan features, `settings/plans.tierFeatures`) and per shop in Plan Members (`shops.features`). Free never gets Website Name, logo or banner (`paidFeatOn`).
- Seller flow: Start selling → public pricing page → plan pick → Google sign-in → application (link, categories, socials). The **first shop is live at once** (any plan; while Basic is charged, after paying Basic: dashboard "Pay Basic"); the Owner gets a phone + email notification (`api/shop-request-notify.js?action=seller`). Not-live shops show a **Preview** banner to the team and the shop's owner; customers get 404.
- **Removing a shop** (Owner, Team Shops → open a shop → Remove shop): asks for a reason, then `api/plan.js?action=remove-shop` hides it (`active: false`, `removed {at, note}`) and emails the reason to its owner (they can ask on WhatsApp to get it back). It stays 30 days under **Removed shops** (Restore / Delete now); the daily job deletes it for good after 30 days (`purgeOldRemovedShops`: handles, shopOwners, the seller's list entry; the seller entry only when it was their last shop). Before removing, Plan Members / Team Shops shows a check (warnings, the Owner still decides): owner signed in within 7 days, a customer opened the shop within 15 days (`shops.lastVisitAt`, stamped once a day per visitor browser; rules allow any visitor to set only that field to now), markup still due, open orders. Rules: a removed shop cannot be changed by its owner. The Owner's own shop: **Remove my shop** on My Shop deletes it at once. Orders always stay.
- Abuse controls: blocked words (`settings/sellerRules`) + big brand names (`BRAND_WORDS` in `src/sellers.js`, `brandRe()` in rules) in links and names, reserved links, "New sellers allowed" switch, no Page off any more (a bad or inactive shop is **Removed**; an old `killed` shop can still get **Page on**), sellers switch their own shop ON / OFF, Owner **Warning** (note on the shop + email, `api/plan.js?action=warn`), **Make live**, **Remove** per shop (Sellers tab).

### Plan features (defaults)

| | Basic (`free`) | Pro | Premium |
|---|---|---|---|
| Shops per account (`shopLimits`) | 1 | 2 | 3 |
| Products | 10 (all shops together), max 3 categories | all | all |
| Priority approval, social links, share kit, sales stats | – | ✓ | ✓ |
| Payout | monthly | monthly | weekly |
| Tagline + contact, About, Re-design (brand color), announcement, pinned products, verified badge, priority support, earnings CSV | – | – | ✓ |
| Website Name, logo, banner (Kyvro approves logo/banner) | never | off (Owner can switch on) | ✓ |
| Storefront themes (feature `themes`, `paid`) | Classic only (+ light/dark) | all | all |
| Featured on Kyvro (`featured`), Promo codes (`coupons`), Order email (`orderEmail`) — all `paid` | – | – | ✓ |
| Landing pages, Custom domain | – | – | Soon |

### Shop links and names

- Public link: `kyvro.store/<handle>` (3–30 of a-z 0-9 -). Required on apply, any plan; changeable in My Shop **once in 30 days** (`handleChangedAt`, rules; Owner exempt). Old handles stay as **aliases** in `shopHandles` (still open the shop, nobody else can take them).
- Old `?shop=<handle|slug>` and aliases redirect to `kyvro.store/<current handle>`. Unknown or not-live path → 404 page. `vercel.json` rewrites one lowercase path segment to the app.
- Reserved links: `src/data/reservedLinks.js` (`RESERVED_LINKS`); the same list is in `firestore.rules` (shopHandles create). Add new site routes to BOTH.
- Website Name (`name`): header wordmark, page title, "Sold by". Premium only (Pro off by default, Free locked with "Upgrade to Premium"); blocked words apply. Without one, the pretty link name shows ("rupa-style" → "Rupa Style"). Shops from before keep their name.

### Multi-shop (sellers only; team shops unchanged)

- Limit by account plan: Free 1 / Pro 2 / Premium 3 (`settings/plans.shopLimits`, rules `shopLimitFor` reads `subscriptions/{uid}`). One plan covers all shops (`syncShops` writes every shop of the uid).
- "+ New shop" (My shops card): link + categories → `extra: true`, **live at once** within the plan's shop limit (rules: `sellers/{uid}.shops` size ≤ `shopLimitFor`); the Owner gets a notification (`?action=seller-shop`). Old pending requests still show in Sellers → New shop requests.
- Free products count across all shops (My Shop cap + rules `sellerSizeOk`). My Shop has a shop switcher.
- Paid plan ended: first shop stays Free; extra shops are hidden from customers (not deleted) until renewed.

### Daily job (`api/plan.js?action=reminders`, cron)

- Plan reminder emails (as before).
- Customers (`api/_plan/nudges.js`): unpaid Pending orders (Online not Paid, or COD whose delivery charge had to be paid online and was not) get a phone + email reminder on day 1 and 3 (`payRemind`; link `/?pay=due&order=…`) and are **cancelled on day 7** (history line, `autoCancelledAt`). Carts left behind: signed-in customers' cart summary `users/{uid}.cart {n, name, at, shop}` (app writes on change) → phone notification on day 1 / 3 / 7 after the last change (`cartReminders/{uid}` server only; link `?cart=open`).
- Inactive sellers (`lastSeenAt`, saved on sign-in): warning emails after 7, 15, 25 days. On day 30 (60 if the account paid before; never while a paid plan runs): no open orders and nothing due → shops, links and seller entry are removed; otherwise shops are hidden (`inactiveHold`) and the Owner is notified; the seller (back again) switches it on themselves (Manage Shop ON / OFF, or the Preview bar), or the Owner does (**Make live** / Preview bar **Switch shop on**). Basic still needs paying while charged; an ended Pro / Premium runs as Basic.

## Dashboards

- **Admin Portal** (`AdminPortal.jsx`): left menu via `SellerDashLayout` (`label="Admin menu"`; phone: drop-down), groups main / Team & Shops / Settings, red `count` badges (new orders, cancel requests, pending products, shop / seller requests). Opens on **Dashboard** (`AdminDashboard.jsx`: greeting, "Needs you", revenue + orders today / month, live products, customers = count of distinct phones only, live shops (Owner), latest orders). **Analytics** (`AdminAnalytics`, same file): 7 / 30 / 90 days, revenue per day bars, top products, sales by shop, status, payment method. Cancelled / returned orders are not money. **No supplier cost or profit on these pages** (profit stays in Team Stats). Owner-only Settings: Banner & Discount (+ Shop plans, Seller dashboard banner), **Store Theme**. **Products** = every store product (approve / edit); **My Products** = only the ones the signed-in member added (`addedBy`). **Plan Members**: each row opens its details (chevron).
- **Seller dashboard** (`SellerDashboard.jsx` + `SellerDashLayout.jsx`): left menu with Dashboard (banner slider `SellerBanner.jsx`, stats, My shops, latest orders), Orders, Products, Manage Shop, Analytics (Pro), Themes, Landing Pages / Promo Codes ("Soon"), Earnings & Payout, Subscription (Overview / Plans / Billing History), Support. Locked pages show the plan that unlocks them. `MyShop` takes `view` (`products` / `manage` / `theme` / `plan` / `none`) and stays mounted so unsaved ticks survive page changes; team My Shop uses `view='all'`.
- **Seller dashboard banner**: Owner sets up to 3 slides in Settings (`SellerDashBannerSettings.jsx`, `src/sellerDash.js`); none saved = the main site's first two banners.
- **Billing History**: `api/plan.js?action=billing` (`api/_plan/billing.js`), the caller's own `subscriptionPayments`.
- **Owner "View dashboard"** (Sellers tab, Owner only): the seller's dashboard **read-only** (`SellerDashboard viewAs`, `MyShop readOnly` + `asUid`; controls disabled by a `<fieldset disabled>`, plan sync skipped). No impersonation: the Owner's own login reads the data; `seller-earnings` and `billing` take `&uid=` and `ownerViewer()` (`api/_plans.js`) allows it only if the Owner's token can read `sellers/{uid}` **and** the email is an Owner. Same fields as the seller sees (no customer or supplier data).
- **Account menu**: "Admin Panel" item for the team only (`isAdminLoggedIn`). Shop links: the team and the shop's own owner get a "← Kyvro main site" bar that clears `sessionStorage.kyvro_shop`; customers stay in the shop.
- **Client auth token**: the app's `customerUser` is a plain object (no `getIdToken`); use `auth.currentUser.getIdToken()` (`loadSellerEarnings` does).

## Storefront themes

- Presets in `src/data/themes.js`: **Classic** (the original `HomeView`), **Minimal**, **Bold**, **Boutique**, **Editorial**, **Street**, **Fresh**, **Luxe** (`ThemedHome.jsx`; picker drawings in `ThemePicker.jsx` `Thumb`), each with mode `auto` (visitor chooses) / `light` / `dark`. Only the home layout changes; other pages get small type changes via `[data-theme]` in `index.css`. Original designs; do not copy another site's themes.
- Which theme shows (`App.jsx`): `?themePreview=<key>&themeMode=<mode>` (preview, never saved) > the shop's own `theme` (non-Classic only with feature `themes`, else Classic) > `settings/theme` for the main site. A preview frame never reads or writes `sessionStorage.kyvro_shop`.
- Picker `ThemePicker.jsx` (drawn thumbnails, mode buttons, Apply, preview iframe with Computer / Mobile 375px): Owner → Admin → Settings → Store Theme (main site, all themes); seller → Themes (per shop; Free can preview all but apply only Classic, "Upgrade to Pro"). Save: `src/themeStore.js`.
- Rules: `settings/theme` Owner only, values from the 8 keys / 3 modes; shops `theme`/`themeMode` allowed for the shop's owner / seller with Classic always and the rest only with `paidFeatOn('themes', true)` (plan running + not switched off); `'themes'` is in the Manager's `features` key list. **Add a new theme key to `themes.js` AND both rule lists.**

## Deploy order (every time `firestore.rules` changes)

If the new app writes a field the live rules reject (e.g. a new key in a `hasOnly` list) and the new rules still accept the old app, publish the rules (from the PR branch, with Evan's OK) **before** merging; otherwise:

1. Merge the PR on GitHub.
2. Wait until the Vercel **Production** deployment is **Ready**.
3. Publish `origin/main:firestore.rules` (not deployed by CI): Claude runs `firebase deploy --only firestore:rules --project kyvro-admin-auth` (dry-run first) **only after Evan's OK each time**, then diffs the live ruleset against main. Or Evan pastes the full file in Firebase Console → Firestore → Rules → Publish (check the editor is not empty).

**Testing rules (no Java here, so no emulator):** the Firebase Rules API `POST /v1/projects/kyvro-admin-auth:test` (firebase-tools' logged-in client, like the live-rules diff) runs test cases against a rules source with mocked data: `request {auth, path, method, time (required, RFC3339), resource.data (new doc)}`, `resource.data` (old doc), `functionMocks` for `exists` / `get` / `existsAfter` / `getAfter` (`anyValue` args, or `exactValue: '/databases/(default)/documents/<path>'` to mock one document). A `create` test needs a top-level `resource: null`, else `resource != null` checks fail with a null error. Nothing touches live data. Use it for new rule branches (expected ALLOW and DENY cases) before publishing.

If Vercel stops deploying from GitHub (no Vercel check on the PR): deploy a clean copy of main (`git archive origin/main` into a scratch dir + `.vercel/project.json`, then `vercel deploy --prod`) only with Evan's OK, so `.env.local` is never uploaded. All Vercel env vars are Production-only, so a preview's `/api` cannot work.

After plan-setting changes, the Owner presses **Save plans** once. Vercel env: `FIREBASE_SERVICE_ACCOUNT`, `UDDOKTAPAY_BASE_URL`, `UDDOKTAPAY_API_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `CRON_SECRET` (+ SSLCommerz vars if used).

## Logo

- Website logo = the **K emblem** (from Evan's logo picture): `src/components/KyvroMark.jsx` shows `public/brand/kyvro-emblem-black.png` in light mode (black text) and `-gold.png` in dark mode (gold text: header, footer, mobile menu, dashboard menu), on every theme (`-white.png` exists, unused). Bump `V` in KyvroMark when the pictures change (cache). Size it with a height class. Header: `KYVRO · কাইভ্রো` (HTML text) from 340px, only `KYVRO` below, only the logo under 320px.
- `scripts/emblem-assets.py` makes the emblem PNGs (smoothed edges, from `scripts/emblem-source.png`) plus `apple-touch-icon.png` and `kyvro-icon.png` (share + push: gold emblem on black).
- KyvroMark renders both pictures and hides one, so a light / dark switch is instant (swapping `src` kept the old logo until the new one loaded). The gold PNG is saved with 128 colours (~13 KB).
- Social pictures (Facebook / Instagram profile = gold emblem on black, 2048px; T-shirt / label / hang-tag mockups) are made ad hoc and kept in the untracked `.claude/logo-export/`, not in git.
- The **favicon stays the hexagon** (`scripts/brand-assets.py`: `favicon.svg`, 16/32 PNG, `public/brand` hexagon icons, lockups, round badges); the emblem is too detailed for 16 / 32 px.

## Key files

`src/App.jsx` (state, storefront, shop context, theme, order creation) · `src/components/KyvroMark.jsx` (logo) + `scripts/emblem-assets.py` / `scripts/brand-assets.py` · `src/components/AdminPortal.jsx` (menu + pages) + `AdminDashboard.jsx` · `SellerDashLayout.jsx` (shared left menu) · `ThemePicker.jsx` + `ThemedHome.jsx` + `src/data/themes.js` + `src/themeStore.js` · `OrdersPanel.jsx` · `TeamStats.jsx` · `MyShop.jsx` + `ShopExtrasEditor.jsx` · `SellerDashboard.jsx` · `SellersPanel.jsx` · `PlanMembers.jsx` · `PlanCards.jsx` / `PlanCompareFaq.jsx` · `SellPricing.jsx` · `src/data/priceCheck.js` (plans, prices, shop limits, visibility) · `src/data/shopBrand.js` (features, display name) · `src/data/reservedLinks.js` · `src/sellers.js`, `src/shops.js` (handles), `src/orders.js` · `api/plan.js` + `api/_plan/*` · `api/_sslc.js` · `firestore.rules`.
