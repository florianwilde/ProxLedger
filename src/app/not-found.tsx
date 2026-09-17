import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NichtGefunden() {
  return (
    <main className="container py-5 text-center">
      <Logo groesse={64} titel="ProxLedger" />
      <h1 className="h3 mt-3">Seite nicht gefunden</h1>
      <p className="text-body-secondary">Die aufgerufene Adresse gibt es nicht.</p>
      <Link href="/" className="btn btn-primary">
        Zum Dashboard
      </Link>
    </main>
  );
}
