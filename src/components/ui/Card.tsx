import type { ReactNode } from "react";

type Rahmen = "primary" | "info" | "warning" | "danger" | "keiner";

const RAHMEN_KLASSE: Record<Rahmen, string> = {
  primary: "pl-card-outline-primary",
  info: "pl-card-outline-info",
  warning: "pl-card-outline-warning",
  danger: "pl-card-outline-danger",
  keiner: "",
};

interface CardProps {
  titel?: ReactNode;
  werkzeuge?: ReactNode;
  rahmen?: Rahmen;
  /** Ohne Innenabstand, z. B. für randlose Tabellen. */
  tabelle?: boolean;
  fuss?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({
  titel,
  werkzeuge,
  rahmen = "keiner",
  tabelle = false,
  fuss,
  className = "",
  children,
}: CardProps) {
  return (
    <div className={`card mb-4 shadow-sm ${RAHMEN_KLASSE[rahmen]} ${className}`}>
      {titel ? (
        <div className="card-header d-flex align-items-center justify-content-between">
          <h3 className="card-title">{titel}</h3>
          {werkzeuge ? <div className="card-tools d-flex gap-2">{werkzeuge}</div> : null}
        </div>
      ) : null}
      <div className={tabelle ? "card-body p-0 pl-table-card" : "card-body"}>{children}</div>
      {fuss ? <div className="card-footer">{fuss}</div> : null}
    </div>
  );
}
