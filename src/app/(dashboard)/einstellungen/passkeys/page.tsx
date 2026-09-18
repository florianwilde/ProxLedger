import { headers } from "next/headers";
import { PasskeyVerwaltung } from "@/components/auth/PasskeyVerwaltung";
import { ContentHeader } from "@/components/layout/ContentHeader";
import { oeffentlicheBasis } from "@/lib/adresse";
import { prisma } from "@/lib/db";
import { sitzungErforderlich } from "@/server/auth/sitzungspflicht";
import { passkeysMoeglich } from "@/server/auth/passkeys";
import { einstellungen } from "@/server/einstellungen";

export const metadata = { title: "Meine Passkeys" };
export const dynamic = "force-dynamic";

export default async function PasskeySeite() {
  const ich = await sitzungErforderlich();
  const { dashboardUrl } = await einstellungen();

  const [passkeys, kopfzeilen] = await Promise.all([
    prisma.passkey.findMany({
      where: { benutzerId: ich.benutzerId },
      orderBy: { erstelltAm: "desc" },
      select: { id: true, bezeichnung: true, erstelltAm: true, zuletztAm: true },
    }),
    headers(),
  ]);

  // Die Seite kennt die Anfrage nur über die Kopfzeilen; daraus entsteht dieselbe Adresse,
  // die auch die Passkey-Endpunkte verwenden.
  const basis = oeffentlicheBasis(new Request("http://platzhalter.invalid", { headers: kopfzeilen }), dashboardUrl);

  return (
    <>
      <ContentHeader
        titel="Meine Passkeys"
        brotkrumen={[{ titel: "Einstellungen" }, { titel: "Passkeys" }]}
      />
      <div className="app-content">
        <div className="container-fluid">
          <PasskeyVerwaltung
            passkeys={passkeys}
            moeglich={passkeysMoeglich(basis.origin)}
            adresse={basis.origin}
          />
        </div>
      </div>
    </>
  );
}
