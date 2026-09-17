import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma-Client als Singleton, der erst beim ersten Zugriff verbindet.
 * Verzögert, weil Next.js beim Bauen Module lädt, ohne dass `DATABASE_URL` gesetzt sein muss.
 * Der Client wird im Modul festgehalten – sonst entstünde bei jedem Zugriff ein neuer
 * Verbindungspool – und im Entwicklungsmodus zusätzlich global, damit Hot-Reloads ihn wiederverwenden.
 */
declare global {
  var proxledgerPrisma: PrismaClient | undefined;
}

let client: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (client) return client;
  if (globalThis.proxledgerPrisma) {
    client = globalThis.proxledgerPrisma;
    return client;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL ist nicht gesetzt. Beispielwerte stehen in .env.example.");
  }

  client = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 10 }) });
  if (process.env.NODE_ENV !== "production") globalThis.proxledgerPrisma = client;
  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_ziel, eigenschaft, empfaenger) {
    return Reflect.get(getPrisma(), eigenschaft, empfaenger);
  },
});
