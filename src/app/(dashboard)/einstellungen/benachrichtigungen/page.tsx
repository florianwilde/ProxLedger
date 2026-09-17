import { ContentHeader } from "@/components/layout/ContentHeader";
import {
  EmailFormular,
  WebhookFormular,
  type EmailWerte,
  type WebhookWerte,
} from "@/components/benachrichtigungen/KanalFormulare";
import { Badge } from "@/components/ui/Badges";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { formatDatumZeit } from "@/lib/format";
import {
  kanalLoeschen,
  testSenden,
  zusammenfassungJetztSenden,
  zusammenfassungSpeichern,
} from "@/server/actions/benachrichtigungen";
import type { EmailKonfiguration, WebhookKonfiguration } from "@/server/notifications/kanaele";

export const metadata = { title: "Benachrichtigungen" };

export default async function BenachrichtigungenSeite() {
  const [kanaele, protokoll, einstellung] = await Promise.all([
    prisma.benachrichtigungskanal.findMany({ orderBy: { erstelltAm: "asc" } }),
    prisma.benachrichtigung.findMany({ orderBy: { erstelltAm: "desc" }, take: 20 }),
    prisma.einstellung.findUnique({ where: { schluessel: "zusammenfassung" } }),
  ]);

  const emailKanal = kanaele.find((kanal) => kanal.typ === "EMAIL");
  const webhookKanal = kanaele.find((kanal) => kanal.typ === "WEBHOOK");
  const emailKonfiguration = emailKanal?.konfiguration as unknown as EmailKonfiguration | undefined;
  const webhookKonfiguration = webhookKanal?.konfiguration as unknown as WebhookKonfiguration | undefined;
  const zeitraum = (einstellung?.wert as { zeitraum?: string } | null)?.zeitraum ?? "aus";

  const emailWerte: EmailWerte = {
    id: emailKanal?.id ?? null,
    name: emailKanal?.name ?? "E-Mail",
    aktiv: emailKanal?.aktiv ?? true,
    host: emailKonfiguration?.host ?? "",
    port: emailKonfiguration?.port ?? 587,
    benutzer: emailKonfiguration?.benutzer ?? "",
    absender: emailKonfiguration?.absender ?? "",
    empfaenger: emailKonfiguration?.empfaenger?.join(", ") ?? "",
    passwortGesetzt: Boolean(emailKonfiguration?.passwort),
  };

  const webhookWerte: WebhookWerte = {
    id: webhookKanal?.id ?? null,
    name: webhookKanal?.name ?? "Webhook",
    aktiv: webhookKanal?.aktiv ?? true,
    url: webhookKonfiguration?.url ?? "",
    geheimnisGesetzt: Boolean(webhookKonfiguration?.geheimnis),
  };

  return (
    <>
      <ContentHeader
        titel="Benachrichtigungen"
        brotkrumen={[{ titel: "Einstellungen" }, { titel: "Benachrichtigungen" }]}
      />

      <div className="app-content">
        <div className="container-fluid">
          <Card
            titel="E-Mail (SMTP)"
            rahmen="primary"
            werkzeuge={
              emailKanal ? (
                <div className="d-flex gap-2">
                  <form action={testSenden}>
                    <input type="hidden" name="id" value={emailKanal.id} />
                    <button type="submit" className="btn btn-sm btn-outline-primary">
                      Test senden
                    </button>
                  </form>
                  <form action={kanalLoeschen}>
                    <input type="hidden" name="id" value={emailKanal.id} />
                    <button type="submit" className="btn btn-sm btn-outline-danger">
                      Entfernen
                    </button>
                  </form>
                </div>
              ) : null
            }
          >
            <p className="text-body-secondary">
              Für Microsoft 365: Server <span className="pl-mono">smtp.office365.com</span>, Port 587,
              Benutzer und Absender identisch mit dem Postfach. Das Passwort wird in der Datenbank gespeichert
              und nie wieder angezeigt.
            </p>
            <EmailFormular werte={emailWerte} />
          </Card>

          <Card
            titel="Webhook"
            rahmen="info"
            werkzeuge={
              webhookKanal ? (
                <div className="d-flex gap-2">
                  <form action={testSenden}>
                    <input type="hidden" name="id" value={webhookKanal.id} />
                    <button type="submit" className="btn btn-sm btn-outline-primary">
                      Test senden
                    </button>
                  </form>
                  <form action={kanalLoeschen}>
                    <input type="hidden" name="id" value={webhookKanal.id} />
                    <button type="submit" className="btn btn-sm btn-outline-danger">
                      Entfernen
                    </button>
                  </form>
                </div>
              ) : null
            }
          >
            <p className="text-body-secondary">
              Verschickt JSON mit Betreff, Text und strukturierten Feldern – damit lassen sich Matrix, Zabbix
              oder Home Assistant anbinden.
            </p>
            <WebhookFormular werte={webhookWerte} />
          </Card>

          <Card titel="Zusammenfassung" rahmen="info">
            <form action={zusammenfassungSpeichern} className="row g-2 align-items-end">
              <div className="col-md-4">
                <label className="form-label" htmlFor="zeitraum">
                  Regelmäßige Übersicht
                </label>
                <select id="zeitraum" name="zeitraum" className="form-select" defaultValue={zeitraum}>
                  <option value="aus">aus</option>
                  <option value="taeglich">täglich um 07:00 Uhr</option>
                  <option value="woechentlich">wöchentlich, montags um 07:00 Uhr</option>
                </select>
              </div>
              <div className="col-md-3">
                <button type="submit" className="btn btn-primary w-100">
                  Speichern
                </button>
              </div>
            </form>

            <form action={zusammenfassungJetztSenden} className="mt-3">
              <input
                type="hidden"
                name="zeitraum"
                value={zeitraum === "woechentlich" ? "woechentlich" : "taeglich"}
              />
              <button type="submit" className="btn btn-outline-secondary btn-sm">
                Zusammenfassung jetzt senden
              </button>
            </form>
          </Card>

          <Card titel="Versandprotokoll" rahmen="info" tabelle>
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th scope="col">Zeitpunkt</th>
                    <th scope="col">Weg</th>
                    <th scope="col">Empfänger</th>
                    <th scope="col">Betreff</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {protokoll.map((eintrag) => (
                    <tr key={eintrag.id}>
                      <td className="small">{formatDatumZeit(eintrag.erstelltAm)}</td>
                      <td>{eintrag.kanal === "EMAIL" ? "E-Mail" : "Webhook"}</td>
                      <td className="small">{eintrag.empfaenger}</td>
                      <td className="small">{eintrag.betreff ?? "–"}</td>
                      <td>
                        {eintrag.status === "GESENDET" ? (
                          <Badge farbe="success">Gesendet</Badge>
                        ) : eintrag.status === "FEHLGESCHLAGEN" ? (
                          <>
                            <Badge farbe="danger">Fehlgeschlagen</Badge>
                            <div className="small text-body-secondary">{eintrag.fehler}</div>
                          </>
                        ) : (
                          <Badge farbe="neutral">Wartend</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {protokoll.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-body-secondary py-4">
                        Noch nichts versendet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
