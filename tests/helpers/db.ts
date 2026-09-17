import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import "dotenv/config";

const url = process.env.TEST_DATABASE_URL;

/** Datenbankgestützte Tests laufen nur, wenn eine Testdatenbank konfiguriert ist. */
export const datenbankVerfuegbar = Boolean(url);

export const testPrisma: PrismaClient = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url ?? "postgresql://localhost:5432/proxledger_test" }),
});

/** Leert alle Tabellen; Reihenfolge spielt dank CASCADE keine Rolle. */
export async function datenbankLeeren() {
  const tabellen = await testPrisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `;
  if (tabellen.length === 0) return;
  const liste = tabellen.map((t) => `"public"."${t.tablename}"`).join(", ");
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${liste} RESTART IDENTITY CASCADE`);
}
