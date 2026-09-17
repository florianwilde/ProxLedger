import type { ReactNode } from "react";

type CalloutFarbe = "warning" | "danger" | "info";

const STIL: Record<CalloutFarbe, { rand: string; icon: string }> = {
  warning: { rand: "var(--pl-warning)", icon: "bi-exclamation-triangle-fill" },
  danger: { rand: "var(--pl-danger)", icon: "bi-x-octagon-fill" },
  info: { rand: "var(--pl-info)", icon: "bi-info-circle-fill" },
};

export function Callout({
  farbe = "warning",
  titel,
  children,
  aktion,
}: {
  farbe?: CalloutFarbe;
  titel: string;
  children: ReactNode;
  aktion?: ReactNode;
}) {
  const stil = STIL[farbe];
  return (
    <div
      className="card bg-body shadow-sm mb-4 d-flex flex-row align-items-center gap-3 p-3"
      style={{ borderLeft: `5px solid ${stil.rand}` }}
      role="note"
    >
      <i className={`bi ${stil.icon} fs-4`} style={{ color: stil.rand }} aria-hidden="true" />
      <div className="flex-grow-1">
        <strong>{titel}</strong>
        <div className="small text-body-secondary">{children}</div>
      </div>
      {aktion}
    </div>
  );
}

/** Fortschrittsbalken, z. B. für den Rechnungsstatus je Kunde. */
export function ProgressBar({ prozent, beschriftung }: { prozent: number; beschriftung?: string }) {
  const farbe =
    prozent === 100 ? "var(--pl-success)" : prozent >= 50 ? "var(--pl-warning)" : "var(--pl-danger)";
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={prozent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={beschriftung}
      style={{ height: "0.75rem" }}
    >
      <div className="progress-bar" style={{ width: `${prozent}%`, backgroundColor: farbe }} />
    </div>
  );
}
