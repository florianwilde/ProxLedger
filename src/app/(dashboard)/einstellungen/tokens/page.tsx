import { ContentHeader } from "@/components/layout/ContentHeader";
import { Card } from "@/components/ui/Card";
import { CopyableCode } from "@/components/ui/CopyableCode";

export const metadata = { title: "Agent-Tokens" };

export default function TokensSeite() {
  return (
    <>
      <ContentHeader
        titel="Agent-Tokens"
        brotkrumen={[{ titel: "Einstellungen" }, { titel: "Agent-Tokens" }]}
      />
      <div className="app-content">
        <div className="container-fluid">
          <Card titel="Agent installieren" rahmen="primary">
            <p>
              Auf dem Proxmox-Host als root ausführen. Der Enrollment-Token gilt bis zum angegebenen Datum und
              kann mehrfach verwendet werden.
            </p>
            <pre className="bg-body-secondary p-3 rounded">
              <code className="pl-mono">
                curl -fsSL https://proxledger.example.de/install.sh | bash -s -- --token plx_e_BEISPIEL
              </code>
            </pre>
            <CopyableCode wert="plx_e_BEISPIEL" />
          </Card>
          <Card titel="Vorhandene Tokens" rahmen="info">
            <p className="text-body-secondary mb-0">
              Ausgabe, Ablauf und Widerruf von Enrollment- und Host-Tokens folgen in #006.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
