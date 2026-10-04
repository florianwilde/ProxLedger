-- Eigenbedarf: Kunden, die man selbst ist (#044).
-- Für sie gibt es keine Kundenrechnung – und damit auch keine Warnungen darüber und keine Marge.
ALTER TABLE "Kunde" ADD COLUMN "eigenbedarf" BOOLEAN NOT NULL DEFAULT false;
