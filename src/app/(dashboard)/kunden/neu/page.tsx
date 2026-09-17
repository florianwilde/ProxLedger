import { ContentHeader } from "@/components/layout/ContentHeader";
import { KundeFormular } from "@/components/kunden/KundeFormular";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Kunde anlegen" };

export default function KundeNeuSeite() {
  return (
    <>
      <ContentHeader
        titel="Kunde anlegen"
        brotkrumen={[{ titel: "Kunden", href: "/kunden" }, { titel: "Neu" }]}
      />
      <div className="app-content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-8">
              <Card titel="Stammdaten" rahmen="primary">
                <KundeFormular />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
