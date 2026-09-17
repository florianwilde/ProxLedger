import type { NextConfig } from "next";

const SICHERHEITS_KOPFZEILEN = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS wirkt nur über HTTPS; hinter einem Reverse Proxy ist das der Normalfall.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Für das Container-Abbild: nur die tatsächlich benötigten Dateien mitnehmen.
  output: "standalone",
  // Die Agent-Skripte werden zur Laufzeit ausgeliefert und müssen daher mitgepackt werden.
  outputFileTracingIncludes: {
    "/install.sh": ["./agent/install.sh"],
    "/agent.sh": ["./agent/proxledger-agent.sh"],
  },
  async headers() {
    return [{ source: "/:pfad*", headers: SICHERHEITS_KOPFZEILEN }];
  },
};

export default nextConfig;
