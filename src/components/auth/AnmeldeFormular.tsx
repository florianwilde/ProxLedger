/**
 * Anmeldeformular. Es sendet ganz gewöhnlich an eine Route – dadurch funktioniert die
 * Anmeldung auch ohne JavaScript, und das Sitzungs-Cookie kommt mit einer normalen Antwort.
 */
export function AnmeldeFormular({ ziel }: { ziel: string }) {
  return (
    <form method="post" action="/api/auth/anmelden">
      <input type="hidden" name="ziel" value={ziel} />

      <div className="mb-3">
        <label className="form-label" htmlFor="email">
          E-Mail-Adresse
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="form-control"
          autoComplete="username"
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="passwort">
          Passwort
        </label>
        <input
          id="passwort"
          name="passwort"
          type="password"
          className="form-control"
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" className="btn btn-primary w-100 pl-touch-target">
        Anmelden
      </button>
    </form>
  );
}
