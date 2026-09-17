import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SITZUNGS_COOKIE, sitzungLesen } from "@/lib/sitzung";
import { kennzahlen, offeneAlerts, suchIndex } from "@/server/queries/hosts";

/**
 * Das Dashboard zeigt immer den aktuellen Datenbankstand; beim Bauen darf nichts
 * vorgerendert werden (sonst öffnet jeder Build-Worker eigene Datenbankverbindungen).
 */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Der Schutz liegt in proxy.ts; hier wird zusätzlich geprüft, damit kein Zustand ohne Benutzer entsteht.
  const sitzung = await sitzungLesen((await cookies()).get(SITZUNGS_COOKIE)?.value);
  if (!sitzung) redirect("/login");

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
      />
      <Sidebar
        hostsAnzahl={zahlen.hostsGesamt}
        offeneRechnungspunkte={zahlen.offeneRechnungspunkte}
        offeneWarnungen={zahlen.offeneAlerts}
        benutzer={sitzung.name}
      />
      <main className="app-main">{children}</main>
      <Footer />
    </div>
  );
}
