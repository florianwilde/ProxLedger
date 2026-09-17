import type { MetadataRoute } from "next";

/** Angaben für den Startbildschirm, wenn das Dashboard als Verknüpfung abgelegt wird. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ProxLedger – Proxmox Subscription Dashboard",
    short_name: "ProxLedger",
    description: "Subscription-Status aller Proxmox-Hosts im Blick",
    lang: "de",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F6F9",
    theme_color: "#1E2A44",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
