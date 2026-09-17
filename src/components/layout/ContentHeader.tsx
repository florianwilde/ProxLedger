import Link from "next/link";
import type { ReactNode } from "react";

export interface Brotkrume {
  titel: string;
  href?: string;
}

/** Inhaltskopf: Seitentitel links, Breadcrumb rechts (AdminLTE-Standard). */
export function ContentHeader({
  titel,
  brotkrumen = [],
  aktion,
}: {
  titel: string;
  brotkrumen?: Brotkrume[];
  aktion?: ReactNode;
}) {
  return (
    <div className="app-content-header">
      <div className="container-fluid">
        <div className="row align-items-center">
          <div className="col-sm-6 d-flex align-items-center gap-3">
            <h1 className="pl-page-title">{titel}</h1>
            {aktion}
          </div>
          <div className="col-sm-6">
            <nav aria-label="Brotkrumen">
              <ol className="breadcrumb float-sm-end mb-0">
                <li className="breadcrumb-item">
                  <Link href="/">Start</Link>
                </li>
                {brotkrumen.map((k, i) => (
                  <li
                    key={`${k.titel}-${i}`}
                    className={`breadcrumb-item ${i === brotkrumen.length - 1 ? "active" : ""}`}
                    aria-current={i === brotkrumen.length - 1 ? "page" : undefined}
                  >
                    {k.href ? <Link href={k.href}>{k.titel}</Link> : k.titel}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
