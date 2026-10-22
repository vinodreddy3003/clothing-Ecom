import { CouponManager } from "@/components/admin/coupon-manager";
import { PageHeader, Panel } from "@/components/admin/ui";
import { db } from "@/lib/db";

export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Coupons" description="Codes customers enter in their bag. Usage counts are updated when orders are placed." />
      <Panel>
        <CouponManager
          coupons={coupons.map((c) => ({
            id: c.id, code: c.code, description: c.description, type: c.type, value: c.value, minSubtotal: c.minSubtotal,
            maxDiscount: c.maxDiscount, usageLimit: c.usageLimit, usedCount: c.usedCount,
            startsAt: c.startsAt?.toISOString() ?? null, endsAt: c.endsAt?.toISOString() ?? null, isActive: c.isActive,
          }))}
        />
      </Panel>
    </>
  );
}
