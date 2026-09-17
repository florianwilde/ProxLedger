import "dotenv/config";

// Tests laufen immer gegen die Testdatenbank, nie gegen die Entwicklungsdatenbank.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
