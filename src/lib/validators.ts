import { z } from "zod";

// Shared by client forms (react-hook-form) and route handlers. Money fields are in paise.

const trimmed = (max: number) => z.string().trim().max(max);
const required = (label: string, max = 200) => trimmed(max).min(1, `${label} is required`);
const slug = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
const money = z.coerce.number().int("Use whole paise").min(0, "Can't be negative").max(100_000_000);
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{8,15}$/, "Enter a valid phone number");
const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || v.startsWith("/") || /^https:\/\//.test(v), "Use an https:// URL or a /path")
  .optional()
  .nullable()
  .transform((v) => v || null);

export const registerSchema = z.object({
  name: required("Name", 100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(128),
});

export const profileSchema = z.object({
  name: required("Name", 100),
  phone: phone.nullish().or(z.literal("")).transform((v) => v || null),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "Use at least 8 characters").max(128),
});

export const addressSchema = z.object({
  fullName: required("Full name", 100),
  phone,
  line1: required("Address", 200),
  line2: trimmed(200).nullish().transform((v) => v || null),
  city: required("City", 100),
  state: required("State", 100),
  postalCode: z.string().trim().regex(/^[0-9]{6}$/, "Enter a 6-digit PIN code"),
  country: trimmed(60).default("India"),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const cartLineSchema = z.object({
  variantId: z.string().min(1).max(50),
  quantity: z.number().int().min(1).max(10),
});
export const cartSchema = z.object({
  items: z.array(cartLineSchema).max(50),
  couponCode: trimmed(40).optional(),
});

export const checkoutSchema = z.object({
  items: z.array(cartLineSchema).min(1, "Your bag is empty").max(50),
  address: addressSchema,
  email: z.string().trim().toLowerCase().email(),
  paymentMethod: z.enum(["RAZORPAY", "COD"]),
  couponCode: trimmed(40).optional(),
  saveAddress: z.boolean().default(false),
  idempotencyKey: z.string().uuid(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const razorpayVerifySchema = z.object({
  orderId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const contactSchema = z.object({
  name: required("Name", 100),
  email: z.string().trim().email("Enter a valid email"),
  message: required("Message", 2000),
});

export const cancelRequestSchema = z.object({
  reason: required("Reason", 500),
});

// ---------- Admin ----------

export const variantSchema = z.object({
  id: z.string().optional(),
  size: required("Size", 20),
  color: required("Colour", 40),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1a1a1a"),
  sku: required("SKU", 60),
  stock: z.coerce.number().int().min(0, "Can't be negative"), // only used when creating a variant
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
  isActive: z.boolean().default(true),
});

export const productSchema = z
  .object({
    name: required("Name", 150),
    slug,
    sku: required("SKU", 60),
    description: required("Description", 5000),
    categoryId: z.string().min(1, "Choose a category"),
    price: money.refine((v) => v > 0, "Price must be more than zero"),
    salePrice: money.optional().nullable().transform((v) => (v ? v : null)),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    isFeatured: z.boolean(),
    isNewArrival: z.boolean(),
    isBestSeller: z.boolean(),
    images: z
      .array(z.object({ url: z.string().min(1).max(1000), alt: trimmed(200).default("") }))
      .max(12, "Up to 12 images"),
    variants: z.array(variantSchema).max(100),
  })
  .refine((p) => p.salePrice == null || p.salePrice < p.price, {
    path: ["salePrice"],
    message: "Sale price must be lower than the price",
  })
  .refine((p) => p.status !== "PUBLISHED" || (p.images.length > 0 && p.variants.length > 0), {
    path: ["status"],
    message: "Add at least one image and one variant before publishing",
  })
  .refine((p) => new Set(p.variants.map((v) => `${v.size}|${v.color}`.toLowerCase())).size === p.variants.length, {
    path: ["variants"],
    message: "Each size and colour combination must be unique",
  });
export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: required("Name", 80),
  slug,
  description: trimmed(500).nullish().transform((v) => v || null),
  imageUrl: optionalUrl,
  isActive: z.boolean(),
  showInNav: z.boolean(),
});

export const reorderSchema = z.object({ ids: z.array(z.string()).min(1).max(500) });

export const stockAdjustSchema = z.object({
  variantId: z.string().min(1),
  delta: z.coerce
    .number()
    .int()
    .refine((v) => v !== 0, "Change can't be zero")
    .refine((v) => Math.abs(v) <= 10_000, "Too large"),
  reason: z.enum(["RESTOCK", "MANUAL_CORRECTION", "DAMAGED", "RETURNED"]),
  note: trimmed(300).optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  note: trimmed(500).optional(),
  carrier: trimmed(80).optional(),
  trackingNumber: trimmed(80).optional(),
  trackingUrl: optionalUrl,
});

export const refundSchema = z.object({
  reference: trimmed(120).optional(),
});

export const bannerSchema = z.object({
  title: required("Title", 120),
  subtitle: trimmed(200).nullish().transform((v) => v || null),
  ctaLabel: trimmed(40).nullish().transform((v) => v || null),
  ctaHref: optionalUrl,
  imageUrl: required("Image", 1000),
  isActive: z.boolean(),
});

export const collectionSchema = z.object({
  name: required("Name", 100),
  slug,
  description: trimmed(500).nullish().transform((v) => v || null),
  imageUrl: optionalUrl,
  showOnHome: z.boolean(),
  isActive: z.boolean(),
  productIds: z.array(z.string()).max(48),
});

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,20}$/, "3–20 letters or numbers"),
    description: trimmed(200).nullish().transform((v) => v || null),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.coerce.number().int().min(1),
    minSubtotal: money.default(0),
    maxDiscount: money.optional().nullable().transform((v) => v || null),
    usageLimit: z.coerce.number().int().min(1).optional().nullable().or(z.literal("").transform(() => null)),
    startsAt: z.coerce.date().optional().nullable().or(z.literal("").transform(() => null)),
    endsAt: z.coerce.date().optional().nullable().or(z.literal("").transform(() => null)),
    isActive: z.boolean(),
  })
  .refine((c) => c.type !== "PERCENT" || c.value <= 90, { path: ["value"], message: "Percent can't exceed 90" });

export const settingsSchema = z.object({
  storeName: required("Store name", 80),
  tagline: trimmed(160).nullish().transform((v) => v || null),
  logoUrl: optionalUrl,
  email: z.string().trim().email().nullish().or(z.literal("")).transform((v) => v || null),
  phone: trimmed(20).nullish().transform((v) => v || null),
  address: trimmed(300).nullish().transform((v) => v || null),
  currency: z.enum(["INR"]), // Razorpay settlement currency; extend when multi-currency is needed
  shippingFee: money,
  freeShippingThreshold: money.optional().nullable().transform((v) => v || null),
  codEnabled: z.boolean(),
  codMaxTotal: money.optional().nullable().transform((v) => v || null),
  announcement: trimmed(160).nullish().transform((v) => v || null),
});

export const pageSchema = z.object({
  title: required("Title", 120),
  content: required("Content", 50_000),
});
