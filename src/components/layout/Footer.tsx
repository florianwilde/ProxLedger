import { APP_VERSION } from "@/lib/version";

export function Footer() {
  return (
    <footer className="app-footer bg-body">
      <div className="float-end d-none d-sm-inline">Prototyp mit Beispieldaten (#002)</div>
      <strong>ProxLedger</strong> · Version {APP_VERSION}
    </footer>
  );
}
