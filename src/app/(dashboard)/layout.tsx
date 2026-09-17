import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { hosts } from "@/mock/data";
import { dashboardKennzahlen, offeneAlerts } from "@/mock/queries";
import { suchIndex } from "@/mock/suchindex";

const BENUTZER = "Florian";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const kennzahlen = dashboardKennzahlen();

  return (
    <div className="app-wrapper">
      <Header alerts={offeneAlerts()} suchEintraege={suchIndex()} benutzer={BENUTZER} />
      <Sidebar
        hostsAnzahl={hosts.length}
        offeneRechnungspunkte={kennzahlen.offeneRechnungspunkte}
        benutzer={BENUTZER}
      />
      <main className="app-main">{children}</main>
      <Footer />
    </div>
  );
}
