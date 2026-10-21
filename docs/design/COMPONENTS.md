# Components

Reusable UI built on shadcn/ui (`src/components/ui/*`) with the tokens from `DESIGN_SYSTEM.md`.
Storefront pieces live in `src/components/store`, admin pieces in `src/components/admin`.

## Primitives (shadcn, restyled through CSS variables)
`Button`, `Input`, `Textarea`, `Label`, `Select`, `Checkbox`, `Switch`, `Dialog`, `AlertDialog` (all destructive
confirmations), `Sheet` (mobile filters, admin mobile nav), `DropdownMenu`, `Table`, `Badge`, `Tabs`, `Skeleton`,
`Sonner` toasts.

Button variants used:
| Variant | Look | Use |
|---|---|---|
| `lime` | lime fill, ink text, pill | Primary purchase action (Add to bag, Checkout, Place order/Pay) |
| `default` | ink fill, white text, pill | Primary non-purchase action (Save, Sign in, Shop now on tile) |
| `secondary` | tile fill | Secondary actions |
| `outline` | hairline border | Tertiary, filters |
| `ghost` | none | Icon buttons in bars |
| `destructive` | red tint | Delete/cancel (always behind AlertDialog) |

## Storefront
| Component | Notes |
|---|---|
| `SiteHeader` | Responsive: greeting/logo + bag on mobile; logo + search + icons on tablet; full category nav on desktop. Categories come from DB (`showInNav`) |
| `BottomNav` | Mobile only floating pill; active tab expands with lime icon disc + label |
| `SearchBar` | GET form to `/shop?q=` (works without JS) |
| `CategoryChips` | Horizontal scroll, active chip ink with ✦ icon (as in reference) |
| `HeroBanner` | Ink panel, rotating admin banners, dots, reduced-motion aware |
| `ProductCard` | Tile image (4:5), wishlist heart, category label, name, price + struck list price, "Sold out" badge |
| `ProductGrid` | 2/3/4 responsive columns |
| `ProductRail` | Horizontal scroll row with snap |
| `FilterPanel` | Left rail on desktop, `Sheet` on mobile/tablet; writes URL params |
| `ProductDetail` | Gallery + thumbnails, colour swatches, size radio pills, stock message, add to bag, share. Shared by PDP and admin preview |
| `CartProvider` | Client context, localStorage persistence, server quote via `/api/cart/quote` |
| `CartLine`, `OrderSummary` | Quantity stepper bounded by available stock; summary uses server totals only |
| `CheckoutForm` | RHF + Zod; saved address picker; payment method radio; Razorpay script loader |
| `OrderTracker` | Status steps; cancelled state shown as a single red step |
| `WishlistButton` | localStorage, `aria-pressed` |
| `EmptyState` | Icon, sentence, one action |

## Admin
| Component | Notes |
|---|---|
| `AdminSidebar` | Grouped links, active state, collapses to sheet on mobile |
| `StatCard` | Label + value + optional note |
| `DataTable` | Server-rendered table with search/filter form + pagination links |
| `StatusBadge` | Order status / payment status colours (neutral greys + danger/warn; green only for Paid/Delivered) |
| `ProductForm` | Details, pricing, images (`ImageUploader`), `VariantEditor`, flags, status, preview |
| `ImageUploader` | Uploads to `/api/admin/uploads` (S3 in production), reorder, alt text |
| `StockAdjustDialog` | Delta, reason, note → `/api/admin/inventory/adjust` |
| `OrderActions` | Only offers transitions valid for the current status; ship form; refund actions; confirmations |
| `ConfirmButton` | Button + AlertDialog + fetch + toast + router refresh |
| `SalesChart` | Pure SVG bars, no chart library |
