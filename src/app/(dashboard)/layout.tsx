import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { kennzahlen, offeneAlerts, suchIndex } from "@/server/queries/hosts";

/**
 * Das Dashboard zeigt immer den aktuellen Datenbankstand; beim Bauen darf nichts
 * vorgerendert werden (sonst öffnet jeder Build-Worker eigene Datenbankverbindungen).
 */
export const dynamic = "force-dynamic";

const BENUTZER = "Florian";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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
        benutzer={BENUTZER}
      />
      <Sidebar
        hostsAnzahl={zahlen.hostsGesamt}
        offeneRechnungspunkte={zahlen.offeneRechnungspunkte}
        offeneWarnungen={zahlen.offeneAlerts}
        benutzer={BENUTZER}
      />
      <main className="app-main">{children}</main>
      <Footer />
    </div>
  );
}
