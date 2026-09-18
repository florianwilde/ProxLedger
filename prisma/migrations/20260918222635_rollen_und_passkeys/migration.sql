-- CreateEnum
CREATE TYPE "Rolle" AS ENUM ('ADMIN', 'TECHNIKER', 'KUNDE');

-- AlterTable
ALTER TABLE "Benutzer" ADD COLUMN     "kundeId" TEXT,
ADD COLUMN     "rolle" "Rolle" NOT NULL DEFAULT 'ADMIN';

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL,
    "benutzerId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "zaehler" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bezeichnung" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zuletztAm" TIMESTAMP(3),

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Passkey_credentialId_key" ON "Passkey"("credentialId");

-- CreateIndex
CREATE INDEX "Passkey_benutzerId_idx" ON "Passkey"("benutzerId");

-- CreateIndex
CREATE INDEX "Benutzer_kundeId_idx" ON "Benutzer"("kundeId");

-- AddForeignKey
ALTER TABLE "Benutzer" ADD CONSTRAINT "Benutzer_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_benutzerId_fkey" FOREIGN KEY ("benutzerId") REFERENCES "Benutzer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
