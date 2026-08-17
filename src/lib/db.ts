import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function hasHealthModels(client: PrismaClient | undefined) {
  return (
    typeof (client as { healthCheckIn?: { findMany?: unknown } } | undefined)
      ?.healthCheckIn?.findMany === "function"
  );
}

export function getDb() {
  const cached = globalForPrisma.prisma;
  if (cached && hasHealthModels(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({ adapter });

  if (!hasHealthModels(client)) {
    throw new Error(
      "Prisma client is missing health models. Run `npx prisma generate` and restart the dev server.",
    );
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}
