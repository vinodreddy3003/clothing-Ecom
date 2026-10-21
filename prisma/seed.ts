/* Demo data for development. Run: npm run db:seed (idempotent: clears catalog/content, keeps nothing else). */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;
const rs = (rupees: number) => rupees * 100;

const APPAREL = ["S", "M", "L", "XL", "XXL"];
const KIDS = ["2-3Y", "4-5Y", "6-7Y", "8-9Y"];
const ONE = ["One size"];

type Seed = {
  name: string;
  category: "men" | "women" | "kids" | "accessories";
  price: number;
  sale?: number;
  images: string[];
  colors: [string, string][];
  sizes?: string[];
  description: string;
  flags?: ("featured" | "new" | "best")[];
  status?: "DRAFT" | "PUBLISHED";
};

const products: Seed[] = [
  { name: "Essential Crew Tee", category: "men", price: 999, sale: 799, images: ["1521572163474-6864f9cf17ab", "1529374255404-311a2a4f1fd9"], colors: [["White", "#f5f5f5"], ["Black", "#111111"]], description: "A heavyweight 220 GSM cotton tee with a clean crew neck and a straight, easy fit. Pre-shrunk so it keeps its shape wash after wash.", flags: ["featured", "best"] },
  { name: "Relaxed Pullover Hoodie", category: "men", price: 2499, sale: 1999, images: ["1556821840-3a63f95609a7"], colors: [["Heather grey", "#9a9a9a"], ["Black", "#111111"]], description: "Brushed-back fleece hoodie with a roomy hood, kangaroo pocket and ribbed cuffs. Relaxed through the body for easy layering.", flags: ["featured", "best"] },
  { name: "Rust Bomber Jacket", category: "men", price: 4999, images: ["1591047139829-d91aecb6caea"], colors: [["Rust", "#b5653f"]], description: "Lightweight bomber in a soft-sheen shell with a full zip, rib-knit collar and hem. The transitional layer for cool evenings.", flags: ["new"] },
  { name: "Moto Leather Jacket", category: "men", price: 8999, sale: 7499, images: ["1551028719-00167b16eac5", "1520975954732-35dd22299614"], colors: [["Black", "#111111"]], description: "Classic asymmetric-zip biker jacket in buttery faux leather with snap lapels, zip cuffs and a quilted lining.", flags: ["featured"] },
  { name: "Contrast Ringer Tee", category: "men", price: 1199, images: ["1622519407650-3df9883f76a5"], colors: [["Black", "#111111"]], description: "Soft jersey tee with contrast ringer trims at the neck and sleeves. Slightly cropped sleeve for a sharper look.", flags: ["new"] },
  { name: "Chambray Dot Shirt", category: "men", price: 1799, images: ["1596755094514-f87e34085b2c"], colors: [["Chambray", "#6b86a8"]], description: "Breathable cotton chambray with a fine white dot print, button-down front and a chest pocket." },
  { name: "Classic Oxford Shirt", category: "men", price: 1999, images: ["1602810318383-e386cc2a3ccf"], colors: [["White", "#f5f5f5"], ["Burgundy", "#6e1f2f"], ["Slate", "#5f6b7a"]], description: "Oxford-weave cotton shirt with a button-down collar and a tailored fit that works tucked or untucked.", flags: ["best"] },
  { name: "Tailored Navy Blazer", category: "men", price: 9999, sale: 8499, images: ["1617137968427-85924c800a22"], colors: [["Navy", "#1f2a44"]], description: "Single-breasted blazer in a wool-blend twill with notch lapels, half lining and a slim, modern cut." },
  { name: "Washed Pink Sweatshirt", category: "men", price: 1899, images: ["1516826957135-700dedea698c"], colors: [["Washed pink", "#e8c9c9"]], description: "Garment-dyed crewneck sweatshirt with a lived-in wash and dropped shoulders.", flags: ["new"] },
  { name: "Black Utility Shirt", category: "men", price: 2199, images: ["1507680434567-5739c80be1ac"], colors: [["Black", "#111111"]], description: "Structured cotton twill shirt with concealed placket and clean seams. Dresses up or down." },
  { name: "Original Graphic Tee", category: "men", price: 1299, images: ["1576566588028-4147f3842f27"], colors: [["Stone", "#d9d2c5"]], description: "Relaxed-fit cotton tee with a bold front graphic print and a soft hand-feel." },
  { name: "Peace Bones Graphic Tee", category: "men", price: 1299, sale: 999, images: ["1503341455253-b2e723bb3dbb", "1503342217505-b0a15ec3261c"], colors: [["Black", "#111111"]], description: "Unisex black tee with a white skeleton-hand print. Cut for a relaxed fit.", flags: ["best"] },
  { name: "Heavyweight Crew Sweatshirt", category: "men", price: 2299, images: ["1620799140408-edc6dcb6d633"], colors: [["Optic white", "#fafafa"]], description: "Dense 400 GSM loopback cotton sweatshirt with a boxy fit and ribbed hem." },
  { name: "Everyday Black Tee", category: "men", price: 899, images: ["1618517351616-38fb9c5210c6", "1583743814966-8936f5b7be1a"], colors: [["Black", "#111111"]], description: "The tee you reach for every day. Combed cotton, slim through the body, longer at the back.", flags: ["featured"] },

  { name: "Flowing Red Maxi Dress", category: "women", price: 3499, sale: 2799, images: ["1595777457583-95e059d581b8"], colors: [["Red", "#c8102e"]], description: "Floor-length maxi in fluid georgette with a fitted bodice and a full, swishing skirt.", flags: ["featured", "best"] },
  { name: "Powder Blue Wrap Dress", category: "women", price: 3299, images: ["1539008835657-9e8e9680c956"], colors: [["Powder blue", "#a9c1d9"]], description: "Wrap-front maxi dress with a tie waist and a thigh-high slit. Light, breezy and made for holidays.", flags: ["new"] },
  { name: "Denim Button Dress", category: "women", price: 2599, images: ["1591369822096-ffd140ec948f"], colors: [["Mid wash", "#6f8fb3"]], description: "Short-sleeve denim shirt dress with a button-through front, chest pockets and a gathered waist.", flags: ["featured"] },
  { name: "Floral Sundress", category: "women", price: 2299, sale: 1899, images: ["1496747611176-843222e1e57c"], colors: [["Ivory floral", "#f1ece4"]], description: "Lightweight viscose sundress in an ivory floral print with flutter sleeves.", flags: ["new"] },
  { name: "Olive Utility Jacket", category: "women", price: 3999, images: ["1544022613-e87ca75a784a"], colors: [["Olive", "#5b5e3a"]], description: "Cotton canvas field jacket with four patch pockets, a drawcord waist and a relaxed shape.", flags: ["best"] },
  { name: "Blush Long Coat", category: "women", price: 6999, sale: 5599, images: ["1485462537746-965f33f7f6a7"], colors: [["Blush", "#e3b7b0"]], description: "Wool-blend longline coat with notch lapels, single-button closure and welt pockets.", flags: ["featured"] },
  { name: "Orange Crew Sweater", category: "women", price: 2199, images: ["1578587018452-892bacefd3f2"], colors: [["Tangerine", "#f07d1a"]], description: "Soft-touch knit crewneck in a bright tangerine. Relaxed fit with ribbed trims." },
  { name: "Colour-block Knit Sweater", category: "women", price: 2799, images: ["1475180098004-ca77a66827be"], colors: [["Ivory/Rust", "#e9dccb"]], description: "Chunky knit sweater with a graphic colour-block front and dropped shoulders.", flags: ["new"] },
  { name: "Striped Wide-leg Trousers", category: "women", price: 2499, images: ["1509631179647-0177331693ae"], colors: [["Black/White", "#222222"]], description: "High-waisted wide-leg trousers in a bold vertical stripe with a side zip." },
  { name: "Knit Fringe Poncho", category: "women", price: 1999, images: ["1434389677669-e08b4cac3105"], colors: [["Cream", "#efe6d2"]], description: "Open-knit poncho with a V-neck and fringe hem. Throw it over anything.", sizes: ONE },
  { name: "Lounge Jogger", category: "women", price: 1699, images: ["1594633312681-425c7b97ccd1"], colors: [["Blush", "#e7c3b8"]], description: "Fluid jersey joggers with a paper-bag waist, cuffed ankles and side pockets." },
  { name: "Sunshine Sweatsuit", category: "women", price: 3299, sale: 2699, images: ["1515886657613-9f3515b0c78f"], colors: [["Sunshine", "#f2c230"]], description: "Matching hoodie and jogger set in a brushed fleece. Sold as a set.", flags: ["featured"] },
  { name: "Ribbed Turtleneck Top", category: "women", price: 1599, images: ["1550639525-c97d455acf70"], colors: [["Black", "#111111"]], description: "Fine-rib turtleneck with long sleeves and a close fit. The base layer for every outfit.", status: "DRAFT" },

  { name: "Kids Navy Cardigan", category: "kids", price: 1499, images: ["1519238263530-99bdd11df2ea"], colors: [["Navy", "#1f2a44"]], sizes: KIDS, description: "Soft cotton-knit cardigan with contrast trim and easy buttons for little hands.", flags: ["new"] },
  { name: "Kids Everyday Tee", category: "kids", price: 899, sale: 699, images: ["1503944583220-79d8926ad5e2"], colors: [["Grey", "#b5b5b5"], ["White", "#f5f5f5"]], sizes: KIDS, description: "Pure cotton tee in an easy fit. Built for playgrounds and washing machines.", flags: ["best"] },

  { name: "Canvas Daypack", category: "accessories", price: 2499, images: ["1553062407-98eeb64c6a62"], colors: [["Navy", "#1f2a44"]], sizes: ONE, description: "Water-resistant canvas backpack with a padded 15\" laptop sleeve and a front zip pocket.", flags: ["featured"] },
  { name: "Washed Denim Cap", category: "accessories", price: 799, images: ["1521369909029-2afed882baee"], colors: [["Washed grey", "#6b6b6b"]], sizes: ONE, description: "Six-panel cotton cap with a garment-washed finish and an adjustable strap." },
  { name: "White Trucker Cap", category: "accessories", price: 699, images: ["1588850561407-ed78c282e89b"], colors: [["White", "#fafafa"]], sizes: ONE, description: "Foam-front trucker cap with breathable mesh back and a snap closure.", flags: ["new"] },
  { name: "Top-handle Bag", category: "accessories", price: 5999, sale: 4999, images: ["1584917865442-de89df76afd3"], colors: [["Scarlet", "#c8102e"]], sizes: ONE, description: "Structured top-handle bag in smooth faux leather with a polished turn-lock and detachable strap.", flags: ["featured", "best"] },
  { name: "Round Metal Sunglasses", category: "accessories", price: 1499, images: ["1511499767150-a48a237f0083"], colors: [["Gold/Green", "#c9a74a"]], sizes: ONE, description: "Lightweight round metal frames with UV400 green lenses and adjustable nose pads." },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const code = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();

// Deterministic "random" stock so seeds are reproducible, with some low and sold-out variants.
let seed = 7;
const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const stockFor = () => {
  const r = rand();
  return r < 0.08 ? 0 : r < 0.2 ? 1 + Math.floor(rand() * 3) : 6 + Math.floor(rand() * 30);
};

const pages: Record<string, [string, string]> = {
  about: ["About us", `## Made for everyday wear

We started with a simple idea: well-made basics and statement pieces at honest prices. Every product is designed in-house and made with mills and workshops we visit ourselves.

## What we care about

Fabric that lasts, fits that are true to size, and clear information about every product, so you can buy once and wear it for years.`],
  contact: ["Contact us", `Questions about an order, sizing or returns? Write to us using the form or reach us on the email and phone number below. We reply within one working day, Monday to Saturday.`],
  "privacy-policy": ["Privacy policy", `## What we collect

When you create an account or place an order we collect your name, email, phone number and delivery address. Payments are processed by Razorpay; we never see or store your card, UPI or bank details.

## How we use it

To deliver your orders, send order updates, and respond to your messages. We don't sell your data.

## Cookies

We use one essential cookie to keep you signed in. Your bag and wishlist are stored on your device.

## Your choices

You can update your profile and addresses in your account, or email us to delete your account.`],
  terms: ["Terms and conditions", `## Orders

An order is confirmed when payment is received (online) or when we confirm it (cash on delivery). We may cancel an order if an item becomes unavailable or a pricing error occurs; any payment will be refunded in full.

## Prices

All prices are in Indian rupees and include GST. Shipping charges are shown at checkout before you pay.

## Accounts

You're responsible for keeping your password safe. Contact us immediately if you notice unauthorised activity.`],
  "shipping-policy": ["Shipping policy", `## Delivery times

Orders are dispatched within 1–2 working days. Delivery takes 3–7 working days depending on your PIN code.

## Charges

Shipping is free on orders above the threshold shown at checkout. Below that, a flat shipping fee applies.

## Tracking

Once your order ships you'll see the carrier and tracking number on your order page.`],
  "return-policy": ["Return policy", `## 7-day returns

Unworn items with tags attached can be returned within 7 days of delivery. Request a return from your order page.

## Refunds

Online payments are refunded to the original payment method within 5–7 working days after we receive the item. Cash on delivery orders are refunded by bank transfer or UPI.

## Non-returnable items

Innerwear, socks and items marked final sale can't be returned.`],
};

async function main() {
  await db.$transaction([
    db.collectionProduct.deleteMany(),
    db.collection.deleteMany(),
    db.banner.deleteMany(),
    db.stockAdjustment.deleteMany(),
    db.orderEvent.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.productImage.deleteMany(),
    db.variant.deleteMany(),
    db.product.deleteMany(),
    db.category.deleteMany(),
    db.coupon.deleteMany(),
  ]);

  await db.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: "Noir & Lime",
      tagline: "Everyday clothing, made to last.",
      email: "hello@noirlime.example",
      phone: "+91 98765 43210",
      address: "21 Residency Road, Bengaluru, Karnataka 560025",
      shippingFee: rs(99),
      freeShippingThreshold: rs(1999),
      codEnabled: true,
      codMaxTotal: rs(10000),
      announcement: "Free shipping on orders over ₹1,999",
    },
  });

  const cats = await Promise.all(
    [
      ["Women", "women", "1595777457583-95e059d581b8"],
      ["Men", "men", "1618517351616-38fb9c5210c6"],
      ["Kids", "kids", "1503944583220-79d8926ad5e2"],
      ["Accessories", "accessories", "1584917865442-de89df76afd3"],
    ].map(([name, slug, image], i) =>
      db.category.create({ data: { name, slug, imageUrl: img(image), sortOrder: i, description: `Shop ${name.toLowerCase()}'s clothing and essentials.` } }),
    ),
  );
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  const created: { id: string; slug: string; category: string }[] = [];
  for (const [i, p] of products.entries()) {
    const slug = slugify(p.name);
    const sku = `${code(p.category)}-${String(i + 1).padStart(3, "0")}`;
    const sizes = p.sizes ?? (p.category === "kids" ? KIDS : APPAREL);
    const product = await db.product.create({
      data: {
        name: p.name,
        slug,
        sku,
        description: p.description,
        categoryId: catId[p.category],
        price: rs(p.price),
        salePrice: p.sale ? rs(p.sale) : null,
        status: p.status ?? "PUBLISHED",
        publishedAt: p.status === "DRAFT" ? null : new Date(Date.now() - (products.length - i) * 864e5),
        isFeatured: p.flags?.includes("featured") ?? false,
        isNewArrival: p.flags?.includes("new") ?? false,
        isBestSeller: p.flags?.includes("best") ?? false,
        images: { create: p.images.map((id, k) => ({ url: img(id), alt: `${p.name}${k ? ` view ${k + 1}` : ""}`, sortOrder: k })) },
        variants: {
          create: p.colors.flatMap(([color, colorHex]) =>
            sizes.map((size) => ({
              sku: `${sku}-${code(color)}-${size.replace(/[^A-Za-z0-9]/g, "")}`.toUpperCase(),
              size,
              color,
              colorHex,
              stock: stockFor(),
            })),
          ),
        },
      },
      include: { variants: true },
    });
    await db.stockAdjustment.createMany({
      data: product.variants.map((v) => ({ variantId: v.id, delta: v.stock, stockAfter: v.stock, reason: "INITIAL" as const, note: "Seed" })),
    });
    created.push({ id: product.id, slug, category: p.category });
  }

  await db.banner.createMany({
    data: [
      { title: "Super sale discount up to 50%", subtitle: "Hoodies, dresses and jackets at their lowest prices of the season.", ctaLabel: "Shop now", ctaHref: "/shop?sort=discount", imageUrl: img("1515886657613-9f3515b0c78f"), sortOrder: 0 },
      { title: "New arrivals for the cooler days", subtitle: "Bombers, knits and layers, just in.", ctaLabel: "See what's new", ctaHref: "/shop?sort=new", imageUrl: img("1490481651871-ab68de25d43d"), sortOrder: 1 },
      { title: "Denim, done right", subtitle: "Dresses and shirts in washes you'll wear on repeat.", ctaLabel: "Shop denim", ctaHref: "/shop?q=denim", imageUrl: img("1604176354204-9268737828e4"), sortOrder: 2 },
    ],
  });

  const bySlug = (slugs: string[]) => created.filter((c) => slugs.includes(c.slug));
  await db.collection.create({
    data: {
      name: "Weekend layers",
      slug: "weekend-layers",
      description: "Hoodies, knits and jackets for slow Saturdays.",
      imageUrl: img("1562157873-818bc0726f68"),
      sortOrder: 0,
      products: {
        create: bySlug(["relaxed-pullover-hoodie", "colour-block-knit-sweater", "rust-bomber-jacket", "olive-utility-jacket", "washed-pink-sweatshirt", "orange-crew-sweater"]).map((p, i) => ({ productId: p.id, sortOrder: i })),
      },
    },
  });
  await db.collection.create({
    data: {
      name: "Summer dresses",
      slug: "summer-dresses",
      description: "Light fabrics and easy shapes for warm days.",
      imageUrl: img("1539008835657-9e8e9680c956"),
      sortOrder: 1,
      products: {
        create: bySlug(["flowing-red-maxi-dress", "powder-blue-wrap-dress", "denim-button-dress", "floral-sundress"]).map((p, i) => ({ productId: p.id, sortOrder: i })),
      },
    },
  });

  await db.coupon.createMany({
    data: [
      { code: "WELCOME10", description: "10% off your first order (up to ₹500)", type: "PERCENT", value: 10, maxDiscount: rs(500) },
      { code: "FLAT500", description: "₹500 off orders over ₹3,999", type: "FIXED", value: rs(500), minSubtotal: rs(3999) },
    ],
  });

  for (const [slug, [title, content]] of Object.entries(pages)) {
    await db.page.upsert({ where: { slug }, update: {}, create: { slug, title, content } });
  }

  // Development accounts. Production admins are created with `npm run admin:create`.
  if (process.env.NODE_ENV !== "production") {
    const adminHash = await bcrypt.hash("Admin@12345", 12);
    await db.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: { email: "admin@example.com", name: "Store Admin", passwordHash: adminHash, role: "ADMIN" },
    });
    await db.user.upsert({
      where: { email: "customer@example.com" },
      update: {},
      create: { email: "customer@example.com", name: "Alex Kumar", phone: "9876543210", passwordHash: await bcrypt.hash("Customer@123", 12) },
    });
  }

  console.log(`Seeded ${products.length} products, ${cats.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
