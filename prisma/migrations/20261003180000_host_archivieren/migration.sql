-- Hosts stilllegen, statt sie zu löschen (#041).
-- Ein stillgelegter Host verschwindet aus Listen, Zahlen und Warnungen; seine Laufzeiten und
-- Rechnungen bleiben erhalten, weil sie zur Buchhaltung gehören.
ALTER TABLE "Host" ADD COLUMN "archiviertAm" TIMESTAMP(3);
CREATE INDEX "Host_archiviertAm_idx" ON "Host"("archiviertAm");
