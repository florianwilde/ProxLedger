import { SystemFormular } from "@/components/einstellungen/SystemFormular";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { Card } from "@/components/ui/Card";
import { APP_VERSION } from "@/lib/version";
import { einstellungen } from "@/server/einstellungen";

export const metadata = { title: "System" };

export default async function SystemSeite() {
  const werte = await einstellungen();

  return (
    <>
      <ContentHeader titel="System" brotkrumen={[{ titel: "Einstellungen" }, { titel: "System" }]} />
      <div className="app-content">
        <div className="container-fluid">
          <SystemFormular werte={werte} appUrl={process.env.APP_URL ?? ""} />

          <Card titel="Systeminformationen" rahmen="keiner">
            <dl className="row mb-0">
              <dt className="col-4 fw-normal text-body-secondary">Version</dt>
              <dd className="col-8">{APP_VERSION}</dd>
              <dt className="col-4 fw-normal text-body-secondary">Zeitzone des Servers</dt>
              <dd className="col-8">{Intl.DateTimeFormat().resolvedOptions().timeZone}</dd>
              <dt className="col-4 fw-normal text-body-secondary">Nur in der Umgebung</dt>
              <dd className="col-8">
                <code>APP_SECRET</code> und <code>DATABASE_URL</code> – beide werden gebraucht, bevor
                die Datenbank gelesen werden kann.
              </dd>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
