// esbuild-Banner: stellt `require` in der ESM-Ausgabe bereit, damit eingebundene
// Pakete weiterhin CommonJS-Module wie `fs` laden können.
import { createRequire as __createRequire } from "node:module";
import { fileURLToPath as __fileURLToPath } from "node:url";
import { dirname as __dirname_fn } from "node:path";
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_fn(__filename);
