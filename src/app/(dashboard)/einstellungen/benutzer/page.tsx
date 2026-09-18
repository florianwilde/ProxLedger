import { BenutzerVerwaltung } from "@/components/einstellungen/BenutzerVerwaltung";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { Callout } from "@/components/ui/Callout";
import { prisma } from "@/lib/db";
import { sitzungErforderlich } from "@/server/auth/sitzungspflicht";

export const metadata = { title: "Benutzer" };
export const dynamic = "force-dynamic";

export default async function BenutzerSeite() {
  const ich = await sitzungErforderlich("verwaltung");

  const [benutzer, kunden] = await Promise.all([
    prisma.benutzer.findMany({
      orderBy: [{ rolle: "asc" }, { name: "asc" }],
      include: { kunde: { select: { name: true } }, _count: { select: { passkeys: true } } },
    }),
    prisma.kunde.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const zeilen = benutzer.map((eintrag) => ({
    id: eintrag.id,
    email: eintrag.email,
    name: eintrag.name,
    rolle: eintrag.rolle,
    kundeId: eintrag.kundeId,
    kundeName: eintrag.kunde?.name ?? null,
    aktiv: eintrag.aktiv,
    hatPasswort: eintrag.passwortHash !== null,
    hatOidc: eintrag.oidcSubject !== null,
    passkeys: eintrag._count.passkeys,
    letzterLoginAm: eintrag.letzterLoginAm,
  }));

  return (
    <>
      <ContentHeader
        titel="Benutzer"
        brotkrumen={[{ titel: "Einstellungen" }, { titel: "Benutzer" }]}
      />
      <div className="app-content">
        <div className="container-fluid">
          <Callout farbe="info" titel="Rollen">
            <strong>Administrator</strong> darf alles, auch Benutzer und Systemeinstellungen.{" "}
            <strong>Techniker</strong> darf alles Fachliche, aber keine Benutzer anlegen.{" "}
            <strong>Kunde</strong> sieht nur die Hosts und Rechnungen des eigenen Kunden – ohne
            Einkaufspreise – und darf Notizen schreiben sowie Warnungen quittieren.
          </Callout>

          <BenutzerVerwaltung benutzer={zeilen} kunden={kunden} ichId={ich.benutzerId} />
        </div>
      </div>
    </>
  );
}
