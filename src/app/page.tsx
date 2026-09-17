import { APP_VERSION } from "@/lib/version";

export default function Home() {
  return (
    <main className="container py-5">
      <h1>ProxLedger</h1>
      <p className="text-body-secondary">Proxmox Subscription Dashboard · Version {APP_VERSION}</p>
    </main>
  );
}
