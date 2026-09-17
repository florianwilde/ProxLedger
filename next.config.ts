import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Die Agent-Skripte werden zur Laufzeit ausgeliefert und müssen daher mitgepackt werden.
  outputFileTracingIncludes: {
    "/install.sh": ["./agent/install.sh"],
    "/agent.sh": ["./agent/proxledger-agent.sh"],
  },
};

export default nextConfig;
