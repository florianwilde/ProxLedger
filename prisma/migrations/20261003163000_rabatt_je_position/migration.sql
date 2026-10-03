-- Rabatt gehört an die Position, nicht an die Rechnung (#037).
--
-- Proxmox weist den Rabatt je Subscription-Key als eigene Zeile aus. Bei einer Sammelrechnung
-- über mehrere Hosts ließe sich ein Rabatt an der Rechnung keinem Host zuordnen – und die Marge
-- je Host wäre falsch.

ALTER TABLE "ProxmoxRechnungPosition" ADD COLUMN "rabatt" DECIMAL(12,2);

-- Vorhandene Rabatte von der Rechnung auf ihre Positionen verteilen, anteilig zum Nettobetrag.
-- Bei nur einer Position entspricht das genau dem bisherigen Wert.
UPDATE "ProxmoxRechnungPosition" AS p
SET "rabatt" = ROUND(r."rabatt" * p."nettoBetrag" / NULLIF(s."summe", 0), 2)
FROM "ProxmoxRechnung" AS r,
     (SELECT "rechnungId", SUM("nettoBetrag") AS "summe"
        FROM "ProxmoxRechnungPosition"
       GROUP BY "rechnungId") AS s
WHERE p."rechnungId" = r."id"
  AND s."rechnungId" = r."id"
  AND r."rabatt" IS NOT NULL;

-- Der Rechnungsbetrag ist ab jetzt die Summe der Positionen nach Abzug ihrer Rabatte.
UPDATE "ProxmoxRechnung" AS r
SET "nettoBetrag" = COALESCE((
      SELECT SUM(p."nettoBetrag" - COALESCE(p."rabatt", 0))
        FROM "ProxmoxRechnungPosition" AS p
       WHERE p."rechnungId" = r."id"
    ), r."nettoBetrag");

ALTER TABLE "ProxmoxRechnung" DROP COLUMN "rabatt";

-- Einkauf bei Proxmox läuft über Reverse Charge; 19 % war als Vorgabe irreführend.
ALTER TABLE "ProxmoxRechnung" ALTER COLUMN "ustSatz" SET DEFAULT 0.00;
