# Design system

Visual reference: Dribbble shot "Fashion Ecommerce App" (Eloxa Studio) — white canvas, soft grey product tiles,
black surfaces, pill-shaped controls, and one lime accent for the active/primary state.
The brief asks for a white, black and neutral-grey palette; lime is the only colour, and it is reserved.

## Principles

1. **Product first.** Photography sits on a quiet grey tile with generous radius. Nothing competes with it:
   no gradients, no drop shadows on cards, no decorative borders.
2. **One accent, one meaning.** Lime means "selected" or "the main thing to do next": active category chip,
   selected size, active bottom-nav tab, primary purchase CTA (Add to bag, Place order), discount figure in a banner.
   It never decorates. If two lime things compete on one screen, one of them is wrong.
3. **Pills for choices, rectangles for content.** Interactive controls (chips, size buttons, buttons, search,
   nav) are fully rounded. Content containers (images, banners, panels) use large but not full radius.
4. **Type does the hierarchy.** Size and weight, not colour, separate a product name from its category label.
5. **Admin is quieter.** Same tokens, no lime except the primary action; denser tables, smaller radius.

## Colour tokens

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#000000` | Primary text, primary dark surfaces (hero banner, selected chip, admin primary button) |
| `--paper` | `#FFFFFF` | Page background, text on ink |
| `--tile` | `#F2F2F2` | Product image tiles, search field, secondary buttons, skeletons |
| `--line` | `#E4E4E4` | Hairline borders on inputs, table rows, dividers |
| `--stone` | `#7A7A7A` | Secondary text: category labels, struck-through prices, helper text (4.6:1 on white) |
| `--lime` | `#B4F25C` | Accent: selected state and primary purchase CTA. Text on lime is always `--ink` (14.9:1) |
| `--danger` | `#D92D20` | Errors, destructive actions, out-of-stock |
| `--warn` | `#B54708` | Low-stock labels and admin alerts |

Contrast: `--stone` on `--paper` passes AA for body text. Never put white text on lime, never put lime text on white.

Implementation: tokens are CSS variables in `src/app/globals.css`, mapped to Tailwind colours
(`bg-tile`, `text-stone`, `bg-lime`, …) and to the shadcn variables (`--primary` = ink, `--muted` = tile).

## Typography

One family: **Urbanist** (Google Fonts, variable 400–800), loaded with `next/font`. Its geometric, slightly
rounded forms match the pill-heavy UI of the reference.

| Role | Mobile | Desktop | Weight | Tracking |
|---|---|---|---|---|
| Display (hero headline) | 32/36 | 64/64 | 700 | -0.03em |
| H1 (page title) | 26/32 | 40/44 | 700 | -0.02em |
| H2 (section: "Special for you") | 20/26 | 28/34 | 700 | -0.01em |
| H3 (product name on PDP) | 22/28 | 32/38 | 700 | -0.01em |
| Body | 15/24 | 16/26 | 400 | 0 |
| Product card name | 15/20 | 16/22 | 600 | 0 |
| Small / category label | 12/16 | 13/18 | 500 | 0 |
| Price | 16/20 | 18/22 | 700 | tabular-nums |

Rules: sentence case everywhere (no all-caps labels), body line length ≤ 70ch, prices always `tabular-nums`.

## Spacing, radius, elevation

- Spacing scale (Tailwind default 4px base). Page gutter: 16px mobile, 24px tablet, 40px desktop. Max content width 1280px.
- Section rhythm: 40px mobile, 64px desktop between home sections.
- Radius: `rounded-full` controls; `24px` image tiles and banners; `16px` panels/cards; `12px` inputs; admin cards `12px`.
- Elevation: none on cards. The only shadow is on floating elements (mobile bottom nav, sticky add-to-bag bar,
  dropdowns): `0 8px 24px rgb(0 0 0 / 0.08)`.

## Iconography

`lucide-react`, 20px, 1.75 stroke. Icon-only buttons are 44×44 minimum, circular, `--tile` or outlined, and
always carry an `aria-label`.

## Motion

- One orchestrated moment: the home hero banner cross-fades between banners (5s, paused on hover/focus,
  disabled with `prefers-reduced-motion`).
- Feedback motion only otherwise: bag count bump on add, sheet/drawer slide, chip selection fill (150ms).
- No scroll-triggered entrance animations.

## Breakpoints

| Name | Width | Grid | Navigation |
|---|---|---|---|
| Mobile | < 768px | 2 product columns, 12px gap | Top: greeting/logo + bag. Floating bottom pill nav (Home, Shop, Wishlist, Account) |
| Tablet | 768–1023px | 3 columns, 16px gap | Top bar with logo, search, icons. Category chips row. No bottom nav |
| Desktop | ≥ 1024px | 4 columns, 24px gap; filters in a left rail on listing pages | Full top nav with categories from admin, search, wishlist, account, bag |

## Accessibility floor

- Visible focus ring: 2px ink outline + 2px white offset on every interactive element.
- Touch targets ≥ 44px. Size/colour selectors are radio groups with labels; out-of-stock options are
  disabled *and* labelled "out of stock" for screen readers.
- Images have alt text from the admin (fallback: product name). Decorative images use empty alt.
- Forms: labels always visible, errors under the field and linked with `aria-describedby`.
- `prefers-reduced-motion` disables the hero rotation and transitions.

## Voice

Plain, short, active. Buttons say what happens: "Add to bag", "Place order", "Pay ₹1,598", "Save changes".
Empty states tell people what to do next ("Your bag is empty. Browse new arrivals."). Errors say what went wrong
and how to fix it, without apologising.
