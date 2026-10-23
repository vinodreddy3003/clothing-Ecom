import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaUrl?: string };

// In dev the client is cached across hot reloads; recreate it if DATABASE_URL changed (.env edited while running).
if (globalForPrisma.prisma && globalForPrisma.prismaUrl !== process.env.DATABASE_URL) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaUrl = process.env.DATABASE_URL;
}
