import { readFileSync } from "node:fs";
import { validatePack } from "../../src/content/schema";
const file = process.argv[2] ?? "content/core/pack.json";
const result = validatePack(JSON.parse(readFileSync(file, "utf8")));
if (!result.pack) {
  console.error(result.errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `PASS ${result.pack.id}@${result.pack.version}: ${result.pack.characters.length} characters, ${result.pack.planets.length} planets; semantic validation only, art release review still required.`,
  );
