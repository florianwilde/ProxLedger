import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { sitzungErforderlich } from "@/server/auth/sitzungspflicht";
import { kennzahlen, offeneAlerts, suchIndex } from "@/server/queries/hosts";

/**
 * Das Dashboard zeigt immer den aktuellen Datenbankstand; beim Bauen darf nichts
 * vorgerendert werden (sonst öffnet jeder Build-Worker eigene Datenbankverbindungen).
 */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Der Schutz liegt in proxy.ts; hier wird zusätzlich geprüft, damit kein Zustand ohne Benutzer
  // entsteht – und weil hier Rolle und Kundenbindung herkommen.
  const sitzung = await sitzungErforderlich();

  const [zahlen, alerts, suche] = await Promise.all([kennzahlen(), offeneAlerts(), suchIndex()]);

  return (
    <div className="app-wrapper">
      <Header
        alerts={alerts.map((alert) => ({
          id: alert.id,
          titel: alert.titel,
          beschreibung: alert.beschreibung,
          schwere: alert.schwere,
          hostId: alert.hostId,
        }))}
        suchEintraege={suche}
        benutzer={sitzung.name}
        rolle={sitzung.rolle}
      />
      <Sidebar
        hostsAnzahl={zahlen.hostsGesamt}
        offeneRechnungspunkte={zahlen.offeneRechnungspunkte}
        offeneWarnungen={zahlen.offeneAlerts}
        benutzer={sitzung.name}
        rolle={sitzung.rolle}
      />
      <main className="app-main">{children}</main>
      <Footer />
    </div>
  );
}
