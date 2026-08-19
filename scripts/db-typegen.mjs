// Regenerate src/lib/supabase/database.types.ts from the linked Supabase
// project, always as UTF-8 without BOM.
//
// Why a script and not `supabase gen types ... > file`: on Windows the shell
// redirect (`>`) in PowerShell writes UTF-16 LE, which TypeScript/ESLint then
// choke on. This happened in two separate sessions despite notes — so the
// tool now owns the encoding instead of the shell. Run: `npm run db:typegen`.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("src/lib/supabase/database.types.ts");

// One command string + shell: true — npx is a .cmd shim on Windows, which
// Node can only launch through a shell (and spawnSync warns on array args).
const result = spawnSync("npx supabase gen types typescript --linked", {
  encoding: "utf8",
  shell: true,
  stdio: ["ignore", "pipe", "inherit"],
});

if (result.status !== 0) {
  console.error(`supabase gen types failed (exit ${result.status ?? "?"}).`);
  process.exit(result.status ?? 1);
}

const output = result.stdout;
if (!output || !output.includes("export type Database")) {
  console.error("Unexpected output from supabase gen types — file NOT written.");
  process.exit(1);
}

// Normalize to LF so the file matches the repo regardless of the CLI's host.
writeFileSync(OUT, output.replace(/\r\n/g, "\n"), { encoding: "utf8" });
console.log(`Wrote ${OUT} (UTF-8, ${output.length} chars).`);
