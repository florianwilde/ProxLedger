/**
 * Ermittelt die Adresse, unter der das Dashboard **von außen** erreichbar ist.
 *
 * Im Container ist `request.url` die interne Adresse (`http://<container-id>:3000`). Eine Weiterleitung
 * dorthin führt im Browser ins Leere – genau das passierte nach der Anmeldung im Docker-Stapel.
 *
 * Reihenfolge: eingetragene Adresse → `APP_URL` → Kopfzeilen des Reverse Proxy → Anfrage selbst.
 * Die Kopfzeilen stehen bewusst hinter den konfigurierten Werten: Sie kommen vom Client und lassen
 * sich fälschen; für eine Weiterleitung auf die eigene Seite ist das unkritisch, als erste Wahl aber
 * unnötig.
 */
export function oeffentlicheBasis(request: Request, eingetragen?: string): URL {
  if (eingetragen) {
    try {
      return new URL(eingetragen);
    } catch {
      // Unbrauchbarer Eintrag: weiter mit den übrigen Quellen.
    }
  }

  if (process.env.APP_URL) {
    try {
      return new URL(process.env.APP_URL);
    } catch {
      // ebenso
    }
  }

  const gastgeber = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (gastgeber) {
    const schema = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    try {
      return new URL(`${schema}://${gastgeber}`);
    } catch {
      // ebenso
    }
  }

  return new URL(request.url);
}

/** Baut eine Adresse auf derselben Installation – für Weiterleitungen nach der Anmeldung. */
export function eigeneAdresse(request: Request, pfad: string, eingetragen?: string): URL {
  return new URL(pfad, oeffentlicheBasis(request, eingetragen));
}
