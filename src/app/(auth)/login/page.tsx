import Link from "next/link";
import { AnmeldeFormular } from "@/components/auth/AnmeldeFormular";
import { Logo } from "@/components/Logo";
import { oidcEinstellungen } from "@/server/auth/oidc";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anmelden" };

type SuchParameter = Promise<Record<string, string | string[] | undefined>>;

export default async function AnmeldeSeite({ searchParams }: { searchParams: SuchParameter }) {
  const roh = await searchParams;
  const einzeln = (wert: string | string[] | undefined) => (Array.isArray(wert) ? wert[0] : wert);
  const ziel = einzeln(roh.ziel) ?? "/";
  const fehler = einzeln(roh.fehler);
  const oidc = oidcEinstellungen();

  return (
    <main className="d-flex align-items-center justify-content-center min-vh-100 p-3">
      <div style={{ width: "min(24rem, 100%)" }}>
        <div className="text-center mb-4">
          <Logo groesse={64} titel="ProxLedger" />
          <h1 className="h4 mt-3 mb-1" style={{ fontWeight: 300 }}>
            ProxLedger
          </h1>
          <p className="text-body-secondary small mb-0">Proxmox Subscription Dashboard</p>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            {fehler ? (
              <div className="alert alert-danger py-2" role="alert">
                {fehler === "oidc" ? "Die Anmeldung über den Anbieter hat nicht geklappt." : fehler}
              </div>
            ) : null}

            {oidc ? (
              <>
                <Link
                  href={`/api/auth/oidc/start?ziel=${encodeURIComponent(ziel)}`}
                  className="btn btn-primary w-100 pl-touch-target mb-3"
                >
                  <i className="bi bi-box-arrow-in-right me-1" aria-hidden="true" />
                  Mit {oidc.bezeichnung} anmelden
                </Link>
                <div className="text-center text-body-secondary small mb-3">oder mit Passwort</div>
              </>
            ) : null}

            <AnmeldeFormular ziel={ziel} />
          </div>
        </div>

        <p className="text-center text-body-secondary small mt-3 mb-0">
          Der lokale Zugang bleibt auch dann nutzbar, wenn der Anmeldedienst ausfällt.
        </p>
      </div>
    </main>
  );
}
