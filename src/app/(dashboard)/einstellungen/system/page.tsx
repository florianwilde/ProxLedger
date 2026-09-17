import { ContentHeader } from "@/components/layout/ContentHeader";
import { Card } from "@/components/ui/Card";
import { APP_VERSION } from "@/lib/version";

export const metadata = { title: "System" };

export default function SystemSeite() {
  return (
    <>
      <ContentHeader titel="System" brotkrumen={[{ titel: "Einstellungen" }, { titel: "System" }]} />
      <div className="app-content">
        <div className="container-fluid">
          <Card titel="Systeminformationen" rahmen="primary">
            <dl className="row mb-0">
              <dt className="col-4 fw-normal text-body-secondary">Version</dt>
              <dd className="col-8">{APP_VERSION}</dd>
              <dt className="col-4 fw-normal text-body-secondary">Datenquelle</dt>
              <dd className="col-8">Beispieldaten (Prototyp, #002)</dd>
              <dt className="col-4 fw-normal text-body-secondary">Warnregeln</dt>
              <dd className="col-8">Konfigurierbar ab #011</dd>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
