-- CreateEnum
CREATE TYPE "Produkt" AS ENUM ('PVE', 'PBS', 'PMG');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'NOTFOUND', 'INVALID', 'EXPIRED', 'SUSPENDED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LaufzeitStatus" AS ENUM ('VORSCHLAG', 'BESTAETIGT');

-- CreateEnum
CREATE TYPE "AlertSchwere" AS ENUM ('INFO', 'WARNUNG', 'GEFAHR');

-- CreateEnum
CREATE TYPE "NotificationKanal" AS ENUM ('EMAIL', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('GESENDET', 'FEHLGESCHLAGEN', 'WARTEND');

-- CreateTable
CREATE TABLE "Kunde" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kundennummer" TEXT NOT NULL,
    "ansprechpartner" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "notizen" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kunde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Standort" (
    "id" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strasse" TEXT,
    "plz" TEXT,
    "ort" TEXT,
    "notizen" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Standort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Host" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "fqdn" TEXT,
    "kundeId" TEXT,
    "standortId" TEXT,
    "produkt" "Produkt" NOT NULL,
    "produktVersion" TEXT,
    "kernel" TEXT,
    "serverId" TEXT,
    "clusterName" TEXT,
    "nodeName" TEXT,
    "ips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sockets" INTEGER,
    "cpuModell" TEXT,
    "uptimeSekunden" BIGINT,
    "paketUpdates" INTEGER,
    "agentVersion" TEXT,
    "notizen" TEXT,
    "subKey" TEXT,
    "subStatus" "SubscriptionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "subLevel" TEXT,
    "subProduktname" TEXT,
    "subLizenzierteSockets" INTEGER,
    "subRegdate" DATE,
    "subNextduedate" DATE,
    "subChecktime" TIMESTAMP(3),
    "erstmalsGesehenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "letzterReportAm" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "farbe" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "erhobenAm" TIMESTAMP(3) NOT NULL,
    "empfangenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subStatus" "SubscriptionStatus" NOT NULL,
    "subKey" TEXT,
    "subNextduedate" DATE,
    "serverId" TEXT,
    "hostname" TEXT,
    "produktVersion" TEXT,
    "kernel" TEXT,
    "sockets" INTEGER,
    "paketUpdates" INTEGER,
    "agentVersion" TEXT,
    "ips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quellIp" TEXT,
    "rohdaten" JSONB NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionKeyHistorie" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ersteMeldung" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "letzteMeldung" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionKeyHistorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerIdHistorie" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "ersteMeldung" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "letzteMeldung" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerIdHistorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Laufzeit" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "start" DATE NOT NULL,
    "ende" DATE NOT NULL,
    "status" "LaufzeitStatus" NOT NULL DEFAULT 'VORSCHLAG',
    "notizen" TEXT,
    "proxmoxPositionId" TEXT,
    "kundenPositionId" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Laufzeit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProxmoxRechnung" (
    "id" TEXT NOT NULL,
    "nummer" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "faelligAm" DATE,
    "nettoBetrag" DECIMAL(12,2) NOT NULL,
    "ustSatz" DECIMAL(5,2) NOT NULL DEFAULT 19.00,
    "rabatt" DECIMAL(12,2),
    "zahlungsart" TEXT,
    "bezahlt" BOOLEAN NOT NULL DEFAULT false,
    "bezahltAm" DATE,
    "notizen" TEXT,
    "anhangId" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProxmoxRechnung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProxmoxRechnungPosition" (
    "id" TEXT NOT NULL,
    "rechnungId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "menge" INTEGER NOT NULL DEFAULT 1,
    "nettoBetrag" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ProxmoxRechnungPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kundenrechnung" (
    "id" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "erstellt" BOOLEAN NOT NULL DEFAULT false,
    "nummer" TEXT,
    "datum" DATE,
    "nettoBetrag" DECIMAL(12,2),
    "ustSatz" DECIMAL(5,2) NOT NULL DEFAULT 19.00,
    "bezahlt" BOOLEAN NOT NULL DEFAULT false,
    "bezahltAm" DATE,
    "notizen" TEXT,
    "anhangId" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kundenrechnung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KundenrechnungPosition" (
    "id" TEXT NOT NULL,
    "rechnungId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "menge" INTEGER NOT NULL DEFAULT 1,
    "nettoBetrag" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "KundenrechnungPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anhang" (
    "id" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimeTyp" TEXT NOT NULL,
    "groesse" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anhang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentToken" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "praefix" TEXT NOT NULL,
    "bezeichnung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "letzteNutzungAm" TIMESTAMP(3),
    "widerrufenAm" TIMESTAMP(3),

    CONSTRAINT "AgentToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "praefix" TEXT NOT NULL,
    "bezeichnung" TEXT,
    "gueltigBis" TIMESTAMP(3),
    "maxNutzungen" INTEGER,
    "nutzungen" INTEGER NOT NULL DEFAULT 0,
    "kundeId" TEXT,
    "standortId" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "widerrufenAm" TIMESTAMP(3),

    CONSTRAINT "EnrollmentToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "regel" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "schwere" "AlertSchwere" NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "hostId" TEXT,
    "kundeId" TEXT,
    "laufzeitId" TEXT,
    "geoeffnetAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quittiertAm" TIMESTAMP(3),
    "erledigtAm" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benachrichtigung" (
    "id" TEXT NOT NULL,
    "alertId" TEXT,
    "kanal" "NotificationKanal" NOT NULL,
    "empfaenger" TEXT NOT NULL,
    "betreff" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'WARTEND',
    "fehler" TEXT,
    "versendetAm" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Benachrichtigung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarnregelEinstellung" (
    "id" TEXT NOT NULL,
    "regel" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "schwellwerte" JSONB NOT NULL DEFAULT '{}',
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarnregelEinstellung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benachrichtigungskanal" (
    "id" TEXT NOT NULL,
    "typ" "NotificationKanal" NOT NULL,
    "name" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "konfiguration" JSONB NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benachrichtigungskanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benutzer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwortHash" TEXT,
    "oidcSubject" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "letzterLoginAm" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benutzer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEintrag" (
    "id" TEXT NOT NULL,
    "benutzerId" TEXT,
    "aktion" TEXT NOT NULL,
    "entitaet" TEXT NOT NULL,
    "entitaetId" TEXT,
    "aenderung" JSONB,
    "ipAdresse" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEintrag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Einstellung" (
    "schluessel" TEXT NOT NULL,
    "wert" JSONB NOT NULL,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Einstellung_pkey" PRIMARY KEY ("schluessel")
);

-- CreateTable
CREATE TABLE "_HostTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_HostTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kunde_kundennummer_key" ON "Kunde"("kundennummer");

-- CreateIndex
CREATE INDEX "Kunde_name_idx" ON "Kunde"("name");

-- CreateIndex
CREATE INDEX "Standort_kundeId_idx" ON "Standort"("kundeId");

-- CreateIndex
CREATE UNIQUE INDEX "Host_agentId_key" ON "Host"("agentId");

-- CreateIndex
CREATE INDEX "Host_kundeId_idx" ON "Host"("kundeId");

-- CreateIndex
CREATE INDEX "Host_standortId_idx" ON "Host"("standortId");

-- CreateIndex
CREATE INDEX "Host_hostname_idx" ON "Host"("hostname");

-- CreateIndex
CREATE INDEX "Host_serverId_idx" ON "Host"("serverId");

-- CreateIndex
CREATE INDEX "Host_subKey_idx" ON "Host"("subKey");

-- CreateIndex
CREATE INDEX "Host_subNextduedate_idx" ON "Host"("subNextduedate");

-- CreateIndex
CREATE INDEX "Host_subStatus_idx" ON "Host"("subStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reportId_key" ON "Report"("reportId");

-- CreateIndex
CREATE INDEX "Report_hostId_erhobenAm_idx" ON "Report"("hostId", "erhobenAm");

-- CreateIndex
CREATE INDEX "Report_empfangenAm_idx" ON "Report"("empfangenAm");

-- CreateIndex
CREATE INDEX "SubscriptionKeyHistorie_key_idx" ON "SubscriptionKeyHistorie"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionKeyHistorie_hostId_key_key" ON "SubscriptionKeyHistorie"("hostId", "key");

-- CreateIndex
CREATE INDEX "ServerIdHistorie_serverId_idx" ON "ServerIdHistorie"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerIdHistorie_hostId_serverId_key" ON "ServerIdHistorie"("hostId", "serverId");

-- CreateIndex
CREATE UNIQUE INDEX "Laufzeit_proxmoxPositionId_key" ON "Laufzeit"("proxmoxPositionId");

-- CreateIndex
CREATE UNIQUE INDEX "Laufzeit_kundenPositionId_key" ON "Laufzeit"("kundenPositionId");

-- CreateIndex
CREATE INDEX "Laufzeit_ende_idx" ON "Laufzeit"("ende");

-- CreateIndex
CREATE INDEX "Laufzeit_key_idx" ON "Laufzeit"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Laufzeit_hostId_start_key" ON "Laufzeit"("hostId", "start");

-- CreateIndex
CREATE UNIQUE INDEX "ProxmoxRechnung_nummer_key" ON "ProxmoxRechnung"("nummer");

-- CreateIndex
CREATE INDEX "ProxmoxRechnung_bezahlt_faelligAm_idx" ON "ProxmoxRechnung"("bezahlt", "faelligAm");

-- CreateIndex
CREATE INDEX "ProxmoxRechnung_datum_idx" ON "ProxmoxRechnung"("datum");

-- CreateIndex
CREATE INDEX "ProxmoxRechnungPosition_rechnungId_idx" ON "ProxmoxRechnungPosition"("rechnungId");

-- CreateIndex
CREATE UNIQUE INDEX "Kundenrechnung_nummer_key" ON "Kundenrechnung"("nummer");

-- CreateIndex
CREATE INDEX "Kundenrechnung_kundeId_idx" ON "Kundenrechnung"("kundeId");

-- CreateIndex
CREATE INDEX "Kundenrechnung_erstellt_bezahlt_idx" ON "Kundenrechnung"("erstellt", "bezahlt");

-- CreateIndex
CREATE INDEX "KundenrechnungPosition_rechnungId_idx" ON "KundenrechnungPosition"("rechnungId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentToken_tokenHash_key" ON "AgentToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AgentToken_hostId_idx" ON "AgentToken"("hostId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentToken_tokenHash_key" ON "EnrollmentToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_fingerprint_key" ON "Alert"("fingerprint");

-- CreateIndex
CREATE INDEX "Alert_erledigtAm_idx" ON "Alert"("erledigtAm");

-- CreateIndex
CREATE INDEX "Alert_hostId_idx" ON "Alert"("hostId");

-- CreateIndex
CREATE INDEX "Alert_kundeId_idx" ON "Alert"("kundeId");

-- CreateIndex
CREATE INDEX "Alert_regel_idx" ON "Alert"("regel");

-- CreateIndex
CREATE INDEX "Benachrichtigung_alertId_idx" ON "Benachrichtigung"("alertId");

-- CreateIndex
CREATE INDEX "Benachrichtigung_erstelltAm_idx" ON "Benachrichtigung"("erstelltAm");

-- CreateIndex
CREATE UNIQUE INDEX "WarnregelEinstellung_regel_key" ON "WarnregelEinstellung"("regel");

-- CreateIndex
CREATE UNIQUE INDEX "Benutzer_email_key" ON "Benutzer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Benutzer_oidcSubject_key" ON "Benutzer"("oidcSubject");

-- CreateIndex
CREATE INDEX "AuditEintrag_entitaet_entitaetId_idx" ON "AuditEintrag"("entitaet", "entitaetId");

-- CreateIndex
CREATE INDEX "AuditEintrag_erstelltAm_idx" ON "AuditEintrag"("erstelltAm");

-- CreateIndex
CREATE INDEX "_HostTags_B_index" ON "_HostTags"("B");

-- AddForeignKey
ALTER TABLE "Standort" ADD CONSTRAINT "Standort_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "Standort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionKeyHistorie" ADD CONSTRAINT "SubscriptionKeyHistorie_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerIdHistorie" ADD CONSTRAINT "ServerIdHistorie_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laufzeit" ADD CONSTRAINT "Laufzeit_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laufzeit" ADD CONSTRAINT "Laufzeit_proxmoxPositionId_fkey" FOREIGN KEY ("proxmoxPositionId") REFERENCES "ProxmoxRechnungPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laufzeit" ADD CONSTRAINT "Laufzeit_kundenPositionId_fkey" FOREIGN KEY ("kundenPositionId") REFERENCES "KundenrechnungPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProxmoxRechnung" ADD CONSTRAINT "ProxmoxRechnung_anhangId_fkey" FOREIGN KEY ("anhangId") REFERENCES "Anhang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProxmoxRechnungPosition" ADD CONSTRAINT "ProxmoxRechnungPosition_rechnungId_fkey" FOREIGN KEY ("rechnungId") REFERENCES "ProxmoxRechnung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kundenrechnung" ADD CONSTRAINT "Kundenrechnung_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kundenrechnung" ADD CONSTRAINT "Kundenrechnung_anhangId_fkey" FOREIGN KEY ("anhangId") REFERENCES "Anhang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundenrechnungPosition" ADD CONSTRAINT "KundenrechnungPosition_rechnungId_fkey" FOREIGN KEY ("rechnungId") REFERENCES "Kundenrechnung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentToken" ADD CONSTRAINT "AgentToken_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentToken" ADD CONSTRAINT "EnrollmentToken_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentToken" ADD CONSTRAINT "EnrollmentToken_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "Standort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_laufzeitId_fkey" FOREIGN KEY ("laufzeitId") REFERENCES "Laufzeit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Benachrichtigung" ADD CONSTRAINT "Benachrichtigung_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEintrag" ADD CONSTRAINT "AuditEintrag_benutzerId_fkey" FOREIGN KEY ("benutzerId") REFERENCES "Benutzer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HostTags" ADD CONSTRAINT "_HostTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HostTags" ADD CONSTRAINT "_HostTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
