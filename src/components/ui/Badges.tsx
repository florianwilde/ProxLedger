import { formatDatum, formatTageBis, tageBis } from "@/lib/format";
import { STATUS_TEXT } from "@/mock/queries";
import type { SubscriptionStatus } from "@/mock/types";
import { FARB_KLASSE, type Farbton } from "./SmallBox";

export function Badge({ farbe, children }: { farbe: Farbton; children: React.ReactNode }) {
  return <span className={`badge ${FARB_KLASSE[farbe]}`}>{children}</span>;
}

const STATUS_FARBE: Record<SubscriptionStatus, Farbton> = {
  active: "success",
  notfound: "neutral",
  invalid: "danger",
  expired: "danger",
  suspended: "warning",
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge farbe={STATUS_FARBE[status]}>{STATUS_TEXT[status]}</Badge>;
}

/** Ablaufdatum mit Ampel: rot unter 14 Tagen, gelb unter 30 Tagen, sonst Info. */
export function AblaufBadge({ datum, heute }: { datum: string | null; heute: Date }) {
  if (!datum) return <Badge farbe="neutral">–</Badge>;
  const tage = tageBis(datum, heute);
  const farbe: Farbton = tage === null || tage < 14 ? "danger" : tage < 30 ? "warning" : "info";
  return (
    <span className="d-inline-flex align-items-center gap-2">
      <Badge farbe={farbe}>{formatDatum(datum)}</Badge>
      <small className="text-body-secondary">{formatTageBis(tage)}</small>
    </span>
  );
}

export function EinkaufBadge({ bezahlt }: { bezahlt: boolean | null }) {
  if (bezahlt === null) return <Badge farbe="neutral">Keine Rechnung</Badge>;
  return bezahlt ? <Badge farbe="success">Bezahlt</Badge> : <Badge farbe="danger">Offen</Badge>;
}

export function VerkaufBadge({ erstellt, bezahlt }: { erstellt: boolean; bezahlt: boolean }) {
  if (!erstellt) return <Badge farbe="danger">Fehlt</Badge>;
  return bezahlt ? <Badge farbe="success">Bezahlt</Badge> : <Badge farbe="warning">Erstellt</Badge>;
}

export function KeineMeldungBadge() {
  return (
    <span className="badge pl-bg-warning ms-2" title="Der Host hat sich länger als 48 Stunden nicht gemeldet">
      <i className="bi bi-wifi-off me-1" aria-hidden="true" />
      Keine Meldung
    </span>
  );
}
