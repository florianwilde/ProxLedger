import type { Metadata, Viewport } from "next";
import { Source_Sans_3 } from "next/font/google";
import "admin-lte/dist/css/adminlte.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "ProxLedger", template: "%s · ProxLedger" },
  description: "Dashboard für den Subscription-Status aller Proxmox-Hosts",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E2A44",
};

/**
 * Setzt das gespeicherte Farbschema, bevor der Browser zeichnet
 * (verhindert Aufblitzen des hellen Designs).
 */
const THEMA_SKRIPT = `(function(){try{var t=localStorage.getItem("pl-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.bsTheme=t;}catch(e){document.documentElement.dataset.bsTheme="light";}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" data-bs-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEMA_SKRIPT }} />
      </head>
      <body className={`${sourceSans.className} layout-fixed sidebar-expand-lg`}>{children}</body>
    </html>
  );
}
