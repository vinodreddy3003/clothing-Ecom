/**
 * Create or promote an admin account.
 *   npm run admin:create -- admin@yourstore.com "Full Name"
 * The password is read from ADMIN_PASSWORD (min 12 chars) so it never lands in shell history args.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [email, name = "Admin"] = process.argv.slice(2);
const password = process.env.ADMIN_PASSWORD ?? "";

if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Usage: ADMIN_PASSWORD="..." npm run admin:create -- admin@example.com "Full Name"');
  process.exit(1);
}
if (password.length < 12) {
  console.error("Set ADMIN_PASSWORD to at least 12 characters.");
  process.exit(1);
}

const db = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 12);
const user = await db.user.upsert({
  where: { email: email.toLowerCase() },
  update: { role: "ADMIN", passwordHash, isActive: true },
  create: { email: email.toLowerCase(), name, passwordHash, role: "ADMIN" },
});
await db.auditLog.create({ data: { action: "admin.create", entity: "User", entityId: user.id, data: { email: user.email } } });
console.log(`Admin ready: ${user.email}`);
await db.$disconnect();
