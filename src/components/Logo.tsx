/**
 * ProxLedger-Monogramm: ein P auf zwei Buchungslinien.
 * Varianten: "standard" (heller Grund), "sidebar" (dunkler Grund), "mono" (einfarbig für PDF/Rechnungen).
 */

export type LogoVariante = "standard" | "sidebar" | "mono";

interface LogoProps {
  variante?: LogoVariante;
  groesse?: number;
  className?: string;
  /** Für dekorative Verwendung neben dem Schriftzug. */
  titel?: string;
}

const FARBEN: Record<LogoVariante, { p: string; linien: string }> = {
  standard: { p: "#1E2A44", linien: "#17A2B8" },
  sidebar: { p: "#FFFFFF", linien: "#17A2B8" },
  mono: { p: "#1E2A44", linien: "#1E2A44" },
};

export function Logo({ variante = "standard", groesse = 40, className, titel }: LogoProps) {
  const farben = FARBEN[variante];
  return (
    <svg
      viewBox="0 0 48 48"
      width={groesse}
      height={groesse}
      className={className}
      role={titel ? "img" : "presentation"}
      aria-label={titel}
      aria-hidden={titel ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
    >
      {titel ? <title>{titel}</title> : null}
      <path
        fillRule="evenodd"
        d="M8 4h19a12 12 0 0 1 0 24H16v16H8zM16 11h10a5 5 0 0 1 0 10H16z"
        fill={farben.p}
      />
      <path d="M22 36h20M22 43h14" stroke={farben.linien} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/** Logo mit Schriftzug, wie in Sidebar und Login verwendet. */
export function LogoMitSchriftzug({
  variante = "standard",
  groesse = 36,
}: {
  variante?: LogoVariante;
  groesse?: number;
}) {
  return (
    <>
      <Logo variante={variante} groesse={groesse} className="brand-image opacity-100" titel="ProxLedger" />
      <span className="brand-text ms-2">ProxLedger</span>
    </>
  );
}
