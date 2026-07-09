import { readFile, access } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PLACEHOLDER_PATTERNS = [/TODO/i, /TBD/i, /lorem ipsum/i, /\[PLACEHOLDER\]/i];

async function main() {
  const readme = await readFile(path.join(ROOT, "README.md"), "utf-8");

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(readme)) {
      console.error(`README.md contains a placeholder matching ${pattern}`);
      process.exitCode = 1;
    }
  }

  // Assumes single-candidate srcset (e.g. srcset="a.svg"), not comma-separated
  // multi-candidate syntax (e.g. srcset="a.svg 1x, a@2x.svg 2x"). This README's
  // srcsets are all single-candidate today; if that ever changes, this regex
  // will need to split on commas and check each candidate path.
  const assetRefs = [...readme.matchAll(/srcset="([^"]+)"|src="([^"]+)"/g)]
    .map((m) => m[1] ?? m[2])
    .filter((p): p is string => Boolean(p) && !p.startsWith("http"));

  for (const ref of assetRefs) {
    try {
      await access(path.join(ROOT, ref));
    } catch {
      console.error(`README.md references missing asset: ${ref}`);
      process.exitCode = 1;
    }
  }

  if (!process.exitCode) {
    console.log(`README.md OK — ${assetRefs.length} local asset references all resolve.`);
  }
}

main();
