import { ContentHeader } from "@/components/layout/ContentHeader";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Benachrichtigungen" };

export default function BenachrichtigungenSeite() {
  return (
    <>
      <ContentHeader
        titel="Benachrichtigungen"
        brotkrumen={[{ titel: "Einstellungen" }, { titel: "Benachrichtigungen" }]}
      />
      <div className="app-content">
        <div className="container-fluid">
          <Card titel="E-Mail und Webhook" rahmen="primary">
            <p className="text-body-secondary mb-0">
              SMTP (Microsoft 365), Webhooks und die tägliche Zusammenfassung werden in #012 umgesetzt.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
