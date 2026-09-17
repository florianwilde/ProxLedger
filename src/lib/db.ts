import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma-Client als Singleton. Im Entwicklungsmodus lädt Next.js Module neu,
 * ohne den Prozess zu beenden – ohne Singleton entstünden dabei immer neue Verbindungspools.
 */
declare global {
  var proxledgerPrisma: PrismaClient | undefined;
}

function erzeugeClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL ist nicht gesetzt. Beispielwerte stehen in .env.example.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma: PrismaClient = globalThis.proxledgerPrisma ?? erzeugeClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.proxledgerPrisma = prisma;
}
