# Architecture

One Next.js (App Router) application serves the storefront, the admin dashboard and the JSON API.
One PostgreSQL database, accessed only through Prisma, is the single source of truth for both sides,
so an admin change is visible to customers on the next request.

```
Browser ──► Next.js (Node runtime)
              ├─ Server components: read Prisma directly (storefront + admin pages)
              ├─ Route handlers /api/*: every mutation (validated with Zod, authorised server-side)
              ├─ src/lib/services/*: business rules (orders, payments, inventory, pricing)
              └─ Prisma ──► PostgreSQL (RDS)
         ──► Razorpay Checkout (browser) ──► /api/payments/razorpay/verify (signature check)
Razorpay ──► /api/payments/razorpay/webhook (signature + event de-duplication)
Admin uploads ──► /api/admin/uploads ──► S3 ──► CloudFront ──► next/image
Scheduler ──► /api/cron/release-reservations (every 5 min)
```

## Folders

```
prisma/               schema.prisma, migrations/, seed.ts
scripts/              create-admin.mts
src/
  app/
    (store)/          storefront routes, shared header/footer/bottom-nav layout
    admin/            admin dashboard (layout enforces ADMIN role)
    api/              route handlers
    sitemap.ts robots.ts
  components/
    ui/               shadcn primitives
    store/            storefront components
    admin/            admin components
  lib/
    services/         orders.ts, inventory.ts, pricing.ts  ← business rules live here only
    auth.ts api.ts validators.ts db.ts razorpay.ts storage.ts settings.ts catalog.ts money.ts
tests/                vitest, runs against a real Postgres test database
docs/                 this file + design/
```

## Data model (summary)

See `prisma/schema.prisma` for fields. Money is stored as integer paise.

| Model | Purpose |
|---|---|
| User, Session, Address | Accounts (CUSTOMER / ADMIN), DB-backed sessions, saved addresses |
| Category | Admin-ordered, active flag, `showInNav` |
| Product, ProductImage, Variant | Product with DRAFT/PUBLISHED/ARCHIVED status; per size+colour variants with their own stock |
| StockAdjustment | Append-only ledger of every stock change (order, cancel, restock, correction) with `stockAfter` |
| Order, OrderItem, OrderEvent | Order with **separate** `status` and `paymentStatus`; items snapshot name/price/variant; event timeline |
| WebhookEvent | Processed Razorpay event IDs (idempotency) |
| Banner, Collection | Homepage content and promotional sections |
| Coupon | Percent/fixed codes with limits and dates |
| StoreSettings, Page | Store name, logo, contact, shipping/COD rules; editable policy pages |
| ContactMessage, AuditLog | Contact form inbox; record of admin actions |

## Business rules

**Only published products are purchasable.** `quoteCart` re-reads every line from the database; draft, archived,
deactivated variants or missing stock produce a line issue and block checkout. Client-sent prices are ignored.

**Stock workflow: deduct at order placement.**
- `placeOrder` runs one transaction: re-quote → coupon check-and-increment → create order → for each line
  `UPDATE variant SET stock = stock - q WHERE id = ? AND stock >= q`. Zero rows updated aborts the whole
  transaction, so concurrent buyers can never oversell.
- COD orders: stock deducted, order `PENDING`, payment `PENDING` until delivered (then `PAID`).
- Online orders: stock deducted and held for 30 minutes (`reservationExpiresAt`). The cron job cancels
  expired unpaid orders and restores their stock, after first asking Razorpay whether a payment was captured.
- Every change writes a `StockAdjustment` row.

**Restore once.** `cancelOrder` flips `stockRestored` with `WHERE stockRestored = false`; only the caller that wins
that update restores stock. Double clicks, admin + customer, or cron + webhook races can't restore twice.

**Duplicate orders.** Checkout sends a UUID `idempotencyKey` generated once per checkout page; it is unique in the DB.
Retries (or two racing submits) return the original order. Payment retries reuse the same Razorpay order.

**Payments.**
- An order becomes `PAID` only via (a) `/api/payments/razorpay/verify` after an HMAC-SHA256 signature check, or
  (b) the signed webhook, or (c) reconciliation against the Razorpay API. A frontend "success" alone does nothing.
- `markOrderPaid` is idempotent (conditional update on `paymentStatus IN (PENDING, FAILED)`).
- A payment that arrives after the order was cancelled sets `REFUND_PENDING` instead of reviving the order.
- `payment.failed` marks the attempt failed but keeps the reservation so the customer can retry.

**Order status transitions** (`ORDER_TRANSITIONS` in `services/orders.ts`):
```
PENDING → CONFIRMED | CANCELLED
CONFIRMED → PROCESSING | CANCELLED
PROCESSING → SHIPPED (carrier + tracking required) | CANCELLED
SHIPPED → DELIVERED
```
Online orders move PENDING → CONFIRMED automatically on payment. Payment status is independent:
`PENDING → PAID → REFUND_PENDING → REFUNDED`, or `PENDING → FAILED`.

**Cancellation and refunds.** Customers cancel directly while PENDING/CONFIRMED. For PROCESSING (cancellation) and
DELIVERED (return) they file a request; the admin approves (cancel / start refund) or declines. Cancelling a paid order
sets `REFUND_PENDING`; the admin completes the refund via the Razorpay API or records a manual reference.

## Security

- Sessions: random 256-bit token in an `httpOnly`, `secure`, `SameSite=Lax` cookie; only its SHA-256 hash is stored.
- Passwords: bcrypt (cost 12).
- Authorisation: `requireAdmin()` / `requireUser()` in every route handler, `requireAdminPage()` in the admin layout.
  Middleware only does a fast redirect. Customer data queries are always scoped by `userId`.
- CSRF: SameSite cookies plus an Origin check on every non-GET API request (`route()` wrapper).
- Validation: Zod schemas in `lib/validators.ts`, shared by forms and handlers.
- Rate limits: login, register, checkout, contact form (in-memory; move to Redis when scaling out).
- Uploads: admin-only, JPEG/PNG/WebP/AVIF verified by magic bytes, 5 MB max, random server-side names.
- Secrets only in environment variables. Security headers in `next.config.ts`.
- Admin actions and stock changes are written to `AuditLog` / `StockAdjustment`.

## Routes

### Storefront pages
| Path | Notes |
|---|---|
| `/` | Banners, category chips, featured, new arrivals, best sellers, collections |
| `/shop` | Search + filters via query: `q, category, min, max, size, inStock, sort(new|price-asc|price-desc|discount), page` |
| `/category/[slug]` | Listing pre-filtered by category |
| `/collections/[slug]` | Collection listing |
| `/product/[slug]` | Product detail (published only, else 404) |
| `/cart`, `/checkout`, `/orders/[id]` | Bag, checkout (signed in), confirmation + tracking |
| `/login`, `/register` | Auth |
| `/account`, `/account/addresses`, `/account/orders` | Profile, addresses, order history |
| `/wishlist` | Device-local wishlist |
| `/about`, `/contact`, `/privacy-policy`, `/terms`, `/shipping-policy`, `/return-policy` | `Page` content |

### Customer API
| Method & path | Body / result |
|---|---|
| `POST /api/auth/register` | `registerSchema` → signs in |
| `POST /api/auth/login` | `loginSchema` → signs in, returns `{ role }` |
| `POST /api/auth/logout` | |
| `PATCH /api/account/profile` | `profileSchema` |
| `POST /api/account/password` | `passwordChangeSchema` |
| `GET/POST /api/account/addresses`, `PATCH/DELETE /api/account/addresses/[id]` | `addressSchema` |
| `POST /api/cart/quote` | `cartSchema` → `{ lines, totals, coupon, hasIssues }` from `quoteCart` |
| `GET /api/products/variants?ids=` | Live variant info for wishlist/cart rehydration |
| `POST /api/checkout` | `checkoutSchema` → `{ order, razorpay? }` |
| `GET /api/orders/[id]/payment` | Razorpay Checkout options for pay/retry |
| `POST /api/orders/[id]/cancel` | `cancelRequestSchema` → cancel or file request |
| `POST /api/payments/razorpay/verify` | Signature check → mark paid |
| `POST /api/payments/razorpay/webhook` | Razorpay events |
| `POST /api/contact` | `contactSchema` |
| `POST /api/cron/release-reservations` | Bearer `CRON_SECRET` |

### Admin API (all `requireAdmin()`, all audited)
| Method & path | Purpose |
|---|---|
| `POST /api/admin/uploads` | multipart `file` → `{ url }` |
| `POST /api/admin/products`, `PATCH/DELETE /api/admin/products/[id]` | `productSchema`; DELETE archives (or hard-deletes a never-ordered draft) |
| `POST /api/admin/categories`, `PATCH /api/admin/categories/[id]`, `POST /api/admin/categories/reorder` | |
| `POST /api/admin/inventory/adjust` | `stockAdjustSchema` |
| `PATCH /api/admin/orders/[id]/status` | `orderStatusSchema` |
| `POST /api/admin/orders/[id]/refund` | `{ action: "start" | "complete", reference?, note? }` |
| `POST /api/admin/orders/[id]/dismiss-request` | |
| `POST/PATCH/DELETE /api/admin/banners[/id]`, `POST /api/admin/banners/reorder` | |
| `POST/PATCH/DELETE /api/admin/collections[/id]` | |
| `POST/PATCH/DELETE /api/admin/coupons[/id]` | |
| `PATCH /api/admin/settings` | `settingsSchema` |
| `PATCH /api/admin/pages/[slug]` | `pageSchema` |
| `PATCH /api/admin/messages/[id]` | mark read |
| `PATCH /api/admin/customers/[id]` | activate/deactivate |
| `GET /api/admin/reports/export?type=sales|inventory` | CSV |

## Caching

Storefront pages are dynamic (`force-dynamic` on data pages) so publishes, price and stock changes show immediately.
When traffic grows, switch listing pages to `revalidateTag` from the admin write handlers; the write paths are already
centralised in `/api/admin/*`.

## Extending later

- Multiple warehouses: add `Warehouse` and `StockLevel(variantId, warehouseId)`; the conditional-decrement pattern stays.
- Variant-level prices: add nullable `Variant.price` and update `effectivePrice`.
- Emails: hook into `OrderEvent` creation (one place) and send via SES.
- Search: swap the Prisma `contains` query in `lib/catalog.ts` for Postgres full-text or OpenSearch.
