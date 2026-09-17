import Link from "next/link";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { WarnregelFormular, type RegelAnzeige } from "@/components/alerts/WarnregelFormular";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { warnregelnSicherstellen } from "@/server/alerts/abgleich";
import { REGELN } from "@/server/alerts/regeln";

export const metadata = { title: "Warnregeln" };

const BESCHRIFTUNGEN: Record<string, string> = {
  tage: "Tage (mehrere Stufen mit Komma)",
  stunden: "Stunden",
};

export default async function WarnregelnSeite() {
  await warnregelnSicherstellen();
  const gespeichert = await prisma.warnregelEinstellung.findMany();
  const nachName = new Map(gespeichert.map((eintrag) => [eintrag.regel, eintrag]));

  const regeln: RegelAnzeige[] = REGELN.map((regel) => {
    const eintrag = nachName.get(regel.name);
    const werte = (eintrag?.schwellwerte ?? regel.standardSchwellwerte) as Record<string, unknown>;

    return {
      name: regel.name,
      beschreibung: regel.beschreibung,
      aktiv: eintrag?.aktiv ?? true,
      schwellwerte: Object.keys(regel.standardSchwellwerte).map((schluessel) => ({
        name: schluessel,
        beschriftung: BESCHRIFTUNGEN[schluessel] ?? schluessel,
        wert: Array.isArray(werte[schluessel])
          ? (werte[schluessel] as number[]).join(", ")
          : String(werte[schluessel] ?? ""),
      })),
    };
  });

  return (
    <>
      <ContentHeader titel="Warnregeln" brotkrumen={[{ titel: "Einstellungen" }, { titel: "Warnregeln" }]} />

      <div className="app-content">
        <div className="container-fluid">
          <Card titel="Regeln und Schwellwerte" rahmen="primary">
            <p className="text-body-secondary">
              Die Regeln laufen stündlich im Worker und zusätzlich nach jedem eingehenden Report. Eine Warnung
              wird nur einmal geöffnet und schließt sich selbst, sobald die Ursache behoben ist. Offene
              Warnungen stehen unter <Link href="/warnungen">Warnungen</Link>.
            </p>
            <WarnregelFormular regeln={regeln} />
          </Card>
        </div>
      </div>
    </>
  );
}
