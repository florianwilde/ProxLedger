import Link from "next/link";

export type Farbton = "info" | "success" | "warning" | "danger" | "neutral" | "primary";

export const FARB_KLASSE: Record<Farbton, string> = {
  info: "pl-bg-info",
  success: "pl-bg-success",
  warning: "pl-bg-warning",
  danger: "pl-bg-danger",
  neutral: "pl-bg-neutral",
  primary: "pl-bg-primary",
};

interface SmallBoxProps {
  wert: number | string;
  text: string;
  zusatz?: string;
  icon: string;
  farbe: Farbton;
  href: string;
  linkText?: string;
}

export function SmallBox({ wert, text, zusatz, icon, farbe, href, linkText = "Mehr Infos" }: SmallBoxProps) {
  return (
    <div className={`small-box ${FARB_KLASSE[farbe]}`}>
      <div className="inner">
        <h3>{wert}</h3>
        <p className="mb-2">
          {text}
          {zusatz ? <small className="d-block">{zusatz}</small> : null}
        </p>
      </div>
      <i className={`bi ${icon} small-box-icon`} aria-hidden="true" />
      <Link href={href} className="small-box-footer pl-touch-target">
        {linkText} <i className="bi bi-arrow-right-circle" aria-hidden="true" />
      </Link>
    </div>
  );
}

interface InfoBoxProps {
  text: string;
  wert: string;
  icon: string;
  farbe: Farbton;
}

export function InfoBox({ text, wert, icon, farbe }: InfoBoxProps) {
  return (
    <div className="info-box shadow-sm mb-3 bg-body">
      <span className={`info-box-icon ${FARB_KLASSE[farbe]}`}>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </span>
      <div className="info-box-content">
        <span className="info-box-text">{text}</span>
        <span className="info-box-number">{wert}</span>
      </div>
    </div>
  );
}
