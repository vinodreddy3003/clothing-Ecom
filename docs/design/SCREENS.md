# Screens: mobile, tablet, desktop

Wireframes for every storefront and admin screen at the three breakpoints from `DESIGN_SYSTEM.md`.
`[lime]` marks the single accent per view. `▢` = image tile (`--tile` grey, 24px radius).

---

## Home `/`

### Mobile (375)
```
┌──────────────────────────────┐
│ (●) Hey, Alex ▾        (bag) │  greeting if signed in, else logo
│ ┌─────────────────────┐ ┌──┐ │
│ │ ⌕ Explore fashion   │ │⚙ │ │  search → /shop?q= ; ⚙ opens filters on /shop
│ └─────────────────────┘ └──┘ │
│ ┌──────────────────────────┐ │
│ │ Super sale     ▢ model   │ │  ink banner, admin-managed, swipe/auto-rotate
│ │ discount up to [50%]     │ │
│ │ (Shop now)[lime]   ●○○○  │ │
│ └──────────────────────────┘ │
│ (All)(✦Women)(Men)(Kids)(Acc)│  chips from categories (showInNav), horizontal scroll
│ Special for you      See all │  = featured products
│ ┌────────┐ ┌────────┐        │
│ │▢     ♡ │ │▢     ♡ │        │  2-col grid
│ │Outerwear women   │        │
│ │Casual hoodie     │        │
│ │₹4,500 ₹5,600     │        │
│ └────────┘ └────────┘        │
│ New arrivals         See all │  horizontal scroll row
│ Best sellers         See all │
│ <collection sections>        │  admin collections with showOnHome
│                              │
│ ╭──────────────────────────╮ │
│ │(⌂ Home)[lime] 🛍  ♡   👤 │ │  floating bottom pill nav
│ ╰──────────────────────────╯ │
└──────────────────────────────┘
```

### Tablet (834)
```
┌───────────────────────────────────────────────┐
│ STORE   ⌕ Explore fashion ________   ♡ 👤 🛍 │
│ ┌───────────────────────────────────────────┐ │
│ │ Super sale discount        ▢ model        │ │  banner 21:9
│ │ up to [50%]  (Shop now)                    │ │
│ └───────────────────────────────────────────┘ │
│ (All)(Women)(Men)(Kids)(Accessories)          │
│ Special for you                      See all  │
│ ▢ ▢ ▢                                         │  3-col
│ New arrivals  ▢ ▢ ▢ →                         │
└───────────────────────────────────────────────┘
```

### Desktop (1440)
```
┌──────────────────────────────────────────────────────────────────────┐
│ announcement bar (admin)                                            │
│ STORE   Women  Men  Kids  Accessories   ⌕ Search______  ♡  👤  🛍(2) │
├──────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────┬───────────────────────────────┐ │
│ │ Super sale discount               │                               │ │
│ │ up to [50%]                       │        ▢ banner image         │ │
│ │ (Shop now)                ●○○○    │                               │ │
│ └──────────────────────────────────┴───────────────────────────────┘ │
│ Shop by category: ▢Women ▢Men ▢Kids ▢Accessories (image tiles)       │
│ Special for you                                             See all │
│ ▢ ▢ ▢ ▢                                                              │
│ New arrivals ▢ ▢ ▢ ▢ │ Best sellers ▢ ▢ ▢ ▢ │ collections…            │
│ footer: links (About, Contact, Policies), contact info, © store     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Product listing `/shop`, `/category/[slug]`, `/collections/[slug]`

### Mobile
```
│ ← Women                  (bag) │
│ ⌕ Explore fashion        [⚙]  │  ⚙ opens bottom sheet: sort, price min/max, size, in-stock only
│ (All)(Dresses)(Jackets)…       │
│ 128 results       Sort: New ▾  │
│ ▢ ▢                            │
│ ▢ ▢                            │
│ (Load more)                    │  paginated, 24 per page
```

### Tablet
Same as mobile, 3 columns; filter sheet slides from the right.

### Desktop
```
│ Women                                   128 results   Sort ▾ │
│ ┌───────────┐ ┌──────────────────────────────────────────┐ │
│ │ Category  │ │ ▢ ▢ ▢                                     │ │
│ │ Price     │ │ ▢ ▢ ▢                                     │ │
│ │  min max  │ │                                           │ │
│ │ Size chips│ │          ‹ 1 2 3 ›                        │ │
│ │ ☐ In stock│ │                                           │ │
│ └───────────┘ └──────────────────────────────────────────┘ │
```
Filters are URL search params (`?q=&category=&min=&max=&size=&inStock=1&sort=`), so results are shareable and SSR'd.

Empty state: "No products match these filters." + (Clear filters).

---

## Product detail `/product/[slug]`

### Mobile
```
│ (←)        Details        (♡) │
│ ┌──────────────────────────┐ │
│ │        ▢ main image      │ │  swipeable, dots
│ └──────────────────────────┘ │
│ (▢)(▢)([▢])(▢)(▢)            │  thumbnails, selected = lime ring
│ Casual hoodie black   ₹6,800 │
│ Outerwear · Men      ₹8,000  │  struck list price + "-15%"
│ Colour: Black  (●)(●)(●)     │
│ Select size       Size chart │
│ (S)(M)([L])(XL)(XXL)         │  disabled + struck if out of stock
│ Only 2 left in L             │  warn colour when ≤ low threshold
│ This casual black hoodie…    │
│ Read more                    │
│ ┌──────────────────────────┐ │  sticky bottom bar
│ │ (⤴)  [ Add to bag ][lime]│ │
│ └──────────────────────────┘ │
```

### Tablet
Image 4:5 full width at top, details below in two columns (left: name/price/selectors, right: description).

### Desktop
```
│ ┌────────────────────────┬──────────────────────────┐ │
│ │ ▢ thumbnails │ ▢ main   │ Outerwear / Men          │ │
│ │ ▢            │  image   │ Casual hoodie black      │ │
│ │ ▢            │          │ ₹6,800  ₹8,000  -15%     │ │
│ │              │          │ Colour (●)(●)            │ │
│ │              │          │ Size (S)(M)(L)(XL)       │ │
│ │              │          │ [Add to bag]  (♡)        │ │  sticky column
│ │              │          │ Description, shipping,   │ │
│ │              │          │ returns accordions       │ │
│ └────────────────────────┴──────────────────────────┘ │
│ You may also like ▢ ▢ ▢ ▢                              │
```

Admin preview (`/admin/products/[id]/preview`) renders this same component with a "Preview — not published" bar.

---

## Bag `/cart`

### Mobile
```
│ (←)   My bag (3)               │
│ ┌─▢─┬──────────────────────┐   │
│ │   │ Casual hoodie        │   │
│ │   │ Black · L            │   │
│ │   │ ₹6,800   (−) 1 (+) 🗑 │   │
│ └───┴──────────────────────┘   │
│ ⚠ Only 1 left — quantity updated │ (server re-validates on load)
│ Promo code [________] (Apply)  │
│ Subtotal            ₹13,600    │
│ Discount             −₹1,000   │
│ Shipping                Free   │
│ Total               ₹12,600    │
│ [ Checkout ][lime]             │
```

### Tablet / Desktop
Two columns: items list (left, 2/3), sticky summary card (right, 1/3).

Empty state: "Your bag is empty." + (Browse new arrivals).

---

## Checkout `/checkout` (sign-in required)

### Mobile — single column, sections in order
```
│ Checkout                       │
│ 1 Contact: email, phone        │
│ 2 Delivery address             │
│   ( ) saved address cards      │
│   (+ New address) form         │
│   ☐ Save this address          │
│ 3 Payment                      │
│   (●) Pay online — UPI, cards  │
│   ( ) Cash on delivery         │
│ Order summary (collapsible)    │
│ [ Pay ₹12,600 ][lime]          │  or "Place order" for COD
```
Steps are numbered because they are a real sequence.

### Tablet / Desktop
Form left (max 640px), sticky order summary right.

States: submitting (button spinner, disabled), stock error (inline banner listing the line + link to bag),
payment dismissed ("Payment not completed. Your items are held for 30 minutes." + Pay now).

---

## Order confirmation `/orders/[id]` (customer)
```
│ ✓ Order placed                │
│ ORD-261021-A1B2C3             │
│ Status tracker:               │
│ ● Placed ─ ● Confirmed ─ ○ Processing ─ ○ Shipped ─ ○ Delivered │  vertical on mobile, horizontal ≥ tablet
│ Payment: Paid / Pending (COD) │
│ Tracking: Delhivery DL123 ↗   │
│ Items · address · totals      │
│ (Cancel order) / (Request cancellation) / (Request return) │
```

---

## Account `/account`
Mobile: list rows (Profile, Addresses, Orders, Sign out). Tablet/desktop: left sub-nav + content.
- `/account` profile form + password change
- `/account/addresses` cards grid (1/2/3 cols) with edit/delete/make default
- `/account/orders` order list → `/orders/[id]`

## Auth `/login`, `/register`
Centered 400px card on all breakpoints; on desktop a split layout with a product image on the left half.

## Wishlist `/wishlist`
Same grid as listing. Stored per device (localStorage). Empty state: "Tap ♡ on a product to save it here."

## Content pages `/about`, `/contact`, `/privacy-policy`, `/terms`, `/shipping-policy`, `/return-policy`
Single text column (max 70ch). Contact adds store email/phone/address and a message form.

---

## Admin `/admin`

### Desktop (primary target)
```
┌──────────┬───────────────────────────────────────────────────────┐
│ STORE    │ Dashboard                                 Admin ▾     │
│ admin    │ ┌────────┐┌────────┐┌────────┐┌────────┐              │
│          │ │Orders  ││Sales   ││Pending ││Low     │              │
│ Dashboard│ │ 128    ││₹4.2L   ││ 6      ││stock 9 │              │
│ Orders   │ └────────┘└────────┘└────────┘└────────┘              │
│ Products │ Sales, last 14 days  ▁▂▅▃▆▇▅ (bar chart)              │
│ Categories│ Recent orders (table)       │ Low stock (table)     │
│ Inventory│                                                       │
│ Homepage │                                                       │
│ Coupons  │                                                       │
│ Customers│                                                       │
│ Reports  │                                                       │
│ Messages │                                                       │
│ Pages    │                                                       │
│ Settings │                                                       │
│ ← Store  │                                                       │
└──────────┴───────────────────────────────────────────────────────┘
```

### Tablet
Sidebar collapses to icons (64px). Tables scroll horizontally inside their card.

### Mobile
Sidebar becomes a sheet opened from a top-bar menu button. KPI cards 2×2. Tables become stacked rows.

### Admin screens
| Route | Content |
|---|---|
| `/admin/orders` | Search (number, email, name), filters (status, payment status, method), table, pagination |
| `/admin/orders/[id]` | Items, customer, address, totals, payment, timeline; actions: next valid status, ship (carrier + tracking), cancel (confirm dialog), start/complete refund, decline request |
| `/admin/products` | Search, status filter, table (image, name, SKU, category, price, stock, status) |
| `/admin/products/new`, `/[id]` | Form: details, pricing, images (upload, reorder, remove), variants table (size, colour, SKU, stock, low threshold), flags, status; Preview button |
| `/admin/categories` | Sortable list (↑/↓), active + show-in-nav toggles, edit dialog |
| `/admin/inventory` | Variant table with stock, low-stock filter, adjust dialog (± qty, reason, note), adjustment history |
| `/admin/homepage` | Banners (CRUD, reorder, active), collections (CRUD, products, show on home) |
| `/admin/coupons` | Coupon table + form dialog |
| `/admin/customers`, `/[id]` | Customer list with order count/spend; detail with orders |
| `/admin/reports` | Sales by day, top products, inventory value, low stock; CSV export |
| `/admin/messages` | Contact form submissions |
| `/admin/pages` | Edit policy/about pages |
| `/admin/settings` | Store name, logo, contact, currency, shipping fee, free-shipping threshold, COD rules, announcement |
