# Noir & Lime — clothing e-commerce

A complete clothing store: customer storefront, secure admin dashboard, inventory with variant-level stock,
Razorpay online payments and cash on delivery, built as one Next.js application on PostgreSQL.

- **Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS v4 + shadcn/ui, PostgreSQL + Prisma,
  React Hook Form + Zod, Razorpay, Amazon S3 + CloudFront, Vitest.
- **Docs:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (data model, business rules, routes, security),
  [`docs/design/DESIGN_SYSTEM.md`](docs/design/DESIGN_SYSTEM.md), [`docs/design/SCREENS.md`](docs/design/SCREENS.md)
  (mobile / tablet / desktop wireframes), [`docs/design/COMPONENTS.md`](docs/design/COMPONENTS.md).

## Features

**Storefront:** home with admin-managed banners, featured, new arrivals, best sellers and collections; category
navigation; search, sort and filters (category, price, size, availability); product pages with size/colour
variants and live stock; bag with server-validated prices and stock; coupons; checkout with saved addresses;
Razorpay or cash on delivery; order tracking; cancellation and return requests; account, addresses and order
history; wishlist; About, Contact and policy pages; sitemap, robots.txt, structured data.

**Admin (`/admin`):** dashboard KPIs and sales chart; products with images, variants, flags, draft/publish/archive
and preview; categories with ordering and navigation control; inventory with low-stock alerts and audited stock
adjustments; orders with search, filters, validated status transitions, shipment tracking, cancellations and
refunds; homepage banners and collections; coupons; customers; reports with CSV export; contact messages; editable
policy pages; store settings (name, logo, contact, shipping charges, COD rules, announcement).

## Requirements

- Node.js 22+
- PostgreSQL 14+ (16 recommended)

## Local setup

```bash
npm install                       # also runs prisma generate
cp .env.example .env              # then edit DATABASE_URL
createdb clothing_ecom            # or create it in your Postgres tool
npm run db:migrate                # applies prisma/migrations
npm run db:seed                   # demo catalogue, banners, coupons, pages, dev accounts
npm run dev                       # http://localhost:3000
```

Development accounts created by the seed (not created when `NODE_ENV=production`):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `Admin@12345` |
| Customer | `customer@example.com` | `Customer@123` |

Demo coupons: `WELCOME10` (10% up to ₹500), `FLAT500` (₹500 off over ₹3,999).

Without Razorpay keys the store runs with cash on delivery only; the online payment option is hidden.
Without S3 settings, admin uploads are saved to `public/uploads`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | yes | Public URL for canonical links, sitemap, Open Graph |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | for online payments | API keys (server only) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | for online payments | Same key ID, exposed to Razorpay Checkout |
| `RAZORPAY_WEBHOOK_SECRET` | for online payments | Verifies webhook signatures |
| `CRON_SECRET` | yes in production | Bearer token for `/api/cron/release-reservations` |
| `AWS_REGION`, `S3_BUCKET` | production | Product image storage |
| `NEXT_PUBLIC_CDN_URL` | production | CloudFront URL that serves the bucket |

Never commit `.env`. In AWS, store these in Secrets Manager / SSM Parameter Store and inject them into the container.

## Database

```bash
npm run db:migrate      # dev: create/apply migrations after editing prisma/schema.prisma
npm run db:deploy       # production: apply committed migrations only
npm run db:seed         # demo data (clears catalogue, orders, banners, coupons)
npx prisma studio       # browse data
```

## Creating an admin

```bash
ADMIN_PASSWORD='a-long-unique-password' npm run admin:create -- owner@yourstore.com "Owner Name"
```

Creates the user, or promotes an existing customer and resets their password. The action is written to the audit log.

## Tests

Critical purchase workflows are tested against a real PostgreSQL database, because the guarantees (no
overselling, single stock restore, idempotent payments) are enforced by SQL conditional updates.

```bash
createdb clothing_ecom_test
echo 'DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/clothing_ecom_test"' > .env.test
npx dotenv -e .env.test -- prisma migrate deploy
npm test
```

Covered: server-side pricing, shipping and coupon rules; stock deduction and the stock ledger; insufficient stock;
unpublished products; idempotent checkout under concurrent double submit; no overselling under concurrent buyers;
coupon usage limits; single stock restoration under concurrent cancels; customer cancellation requests; order status
transitions and shipping requirements; COD collection on delivery; payment verification idempotency; reservation
expiry; late payment → refund; reconciliation of captured payments; Razorpay signature verification; manual stock
adjustments.

CI (`.github/workflows/ci.yml`) runs type checks, lint, tests and a production build against Postgres 16.

## Razorpay setup

1. Create API keys in Razorpay Dashboard → Account & Settings → API Keys (test mode first).
2. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
3. Add a webhook: URL `https://YOUR_DOMAIN/api/payments/razorpay/webhook`, events `payment.captured`,
   `payment.failed`, `order.paid`; set a secret and put it in `RAZORPAY_WEBHOOK_SECRET`.
4. Enable automatic capture in Razorpay payment settings.

Payment flow: checkout creates the order and holds stock → Razorpay order created → customer pays →
browser sends the signed response to `/verify` → server checks the HMAC signature and marks the order paid.
The webhook does the same independently, so a closed browser tab still confirms the order. Unpaid online
orders release their stock after 30 minutes. Test with Razorpay test cards/UPI in test mode; the app never
simulates a successful payment.

## Deployment on AWS

A small, low-cost setup that covers HTTPS, secrets and backups:

| Piece | Service |
|---|---|
| App container | **AWS App Runner** (simplest) or ECS Fargate behind an Application Load Balancer |
| HTTPS | App Runner custom domain (managed certificate), or ACM certificate on the ALB |
| Database | **Amazon RDS for PostgreSQL** (db.t4g.micro/small), automated backups with 7–14 day retention, deletion protection on, encryption at rest, in a private subnet |
| Images | **S3** bucket (private, Block Public Access on) + **CloudFront** with Origin Access Control |
| Secrets | **Secrets Manager** or SSM Parameter Store → container environment |
| Scheduled job | **EventBridge Scheduler** → API destination `POST /api/cron/release-reservations` every 5 minutes with `Authorization: Bearer $CRON_SECRET` |
| Logs | CloudWatch Logs (App Runner/ECS default) |

Steps:

1. **RDS:** create a PostgreSQL 16 instance; enable automated backups and deletion protection. Note the connection URL.
2. **S3 + CloudFront:** create a bucket; create a CloudFront distribution with the bucket as origin using OAC; set
   `S3_BUCKET`, `AWS_REGION`, `NEXT_PUBLIC_CDN_URL`. Give the app's IAM role `s3:PutObject` on `arn:aws:s3:::BUCKET/products/*`.
3. **Image:** build and push to ECR:
   ```bash
   docker build \
     --build-arg NEXT_PUBLIC_SITE_URL=https://yourstore.com \
     --build-arg NEXT_PUBLIC_CDN_URL=https://dxxxx.cloudfront.net \
     --build-arg NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx \
     -t clothing-ecom .
   docker tag clothing-ecom:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/clothing-ecom:latest
   docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/clothing-ecom:latest
   ```
   `NEXT_PUBLIC_*` values are baked in at build time; server secrets are injected at runtime.
4. **App Runner:** create a service from the ECR image, port 3000, with a VPC connector to reach RDS, the
   environment variables/secrets above and an instance role for S3. The container runs `prisma migrate deploy`
   on start, then the server.
5. **Domain:** add your custom domain in App Runner (or point Route 53 to the ALB); HTTPS is enforced and
   HSTS is sent in production.
6. **Admin:** run `npm run admin:create` once against the production database (from a bastion/Cloud Shell
   with `DATABASE_URL` set), then sign in at `/admin`.
7. **Razorpay:** switch to live keys and register the production webhook URL.
8. **Scheduler:** create the EventBridge schedule for the reservation release job.

Production checklist: live Razorpay keys and webhook, `CRON_SECRET` set, seed **not** run, admin created, RDS
backups verified with a test restore, CloudFront serving images, policies and contact details updated in
Admin → Pages and Settings.

## Scaling later

The app is a single deployable on purpose. Rate limiting is in memory (move it to Redis/ElastiCache when running
more than one instance). See "Extending later" in `docs/ARCHITECTURE.md` for warehouses, variant pricing, emails
and search.
