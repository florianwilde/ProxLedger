import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma-Client als Singleton, der erst beim ersten Zugriff verbindet.
 * Das ist wichtig, weil Next.js beim Bauen Module lädt, ohne dass `DATABASE_URL` gesetzt sein muss.
 * Im Entwicklungsmodus verhindert der globale Zwischenspeicher, dass jeder Hot-Reload
 * einen neuen Verbindungspool öffnet.
 */
declare global {
  var proxledgerPrisma: PrismaClient | undefined;
}

function erzeugeClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL ist nicht gesetzt. Beispielwerte stehen in .env.example.");
  }
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  if (process.env.NODE_ENV !== "production") globalThis.proxledgerPrisma = client;
  return client;
}

export function getPrisma(): PrismaClient {
  return globalThis.proxledgerPrisma ?? erzeugeClient();
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_ziel, eigenschaft, empfaenger) {
    return Reflect.get(getPrisma(), eigenschaft, empfaenger);
  },
});
