// Prod DB helper using the generated Prisma client. Loads DATABASE_URL etc.
// from the temp prod env pull. Read/write per caller. Clean up after use.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function loadEnv(path = "C:/Users/Garrett/AppData/Local/Temp/gse-prod-check.env") {
  const txt = readFileSync(path, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

export function getDb() {
  loadEnv();
  const { PrismaClient } = require("@prisma/client");
  return new PrismaClient();
}
