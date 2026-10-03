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
/**
 * Lausch-Adressen taugen nicht als Ziel für einen Browser: `0.0.0.0` heißt „alle Schnittstellen“.
 * Steht so etwas in der Konfiguration, wird es übergangen statt eine unerreichbare Seite zu bauen.
 */
const UNBRAUCHBAR = new Set(["0.0.0.0", "::", "[::]", "", "0"]);

function brauchbar(adresse: string | undefined): URL | null {
  if (!adresse) return null;
  try {
    const ergebnis = new URL(adresse);
    return UNBRAUCHBAR.has(ergebnis.hostname) ? null : ergebnis;
  } catch {
    return null;
  }
}

export function oeffentlicheBasis(request: Request, eingetragen?: string): URL {
  const ausEinstellung = brauchbar(eingetragen);
  if (ausEinstellung) return ausEinstellung;

  const ausUmgebung = brauchbar(process.env.APP_URL);
  if (ausUmgebung) return ausUmgebung;

  const gastgeber = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (gastgeber) {
    const schema = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    const ausKopfzeile = brauchbar(`${schema}://${gastgeber}`);
    if (ausKopfzeile) return ausKopfzeile;
  }

  return new URL(request.url);
}

/** Baut eine Adresse auf derselben Installation – für Weiterleitungen nach der Anmeldung. */
export function eigeneAdresse(request: Request, pfad: string, eingetragen?: string): URL {
  return new URL(pfad, oeffentlicheBasis(request, eingetragen));
}

/**
 * Dasselbe für Server Actions und Seiten, die keine `Request` zur Hand haben.
 *
 * Nötig, weil Next.js eine Weiterleitung aus einer Server Action serverseitig absolut macht – und
 * dafür die Adresse nimmt, auf die der Server lauscht. Im Container ist das `0.0.0.0` (oder der
 * Containername); im Browser landet man damit auf einer Seite, die es nicht gibt.
 */
export async function eigenerPfad(pfad: string, eingetragen?: string): Promise<string> {
  let kopfzeilen: Headers;
  try {
    const { headers } = await import("next/headers");
    kopfzeilen = await headers();
  } catch {
    // Außerhalb einer Anfrage (Tests, Skripte) gibt es keine Kopfzeilen – dann bleibt der Pfad relativ.
    return pfad;
  }

  // Die Anfrage selbst gibt es hier nicht; eine leere mit den echten Kopfzeilen genügt.
  const basis = oeffentlicheBasis(new Request("http://platzhalter.invalid", { headers: kopfzeilen }), eingetragen);
  return new URL(pfad, basis).toString();
}
