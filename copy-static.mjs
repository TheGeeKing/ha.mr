import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });

const files = [
  ["index.html", "index.html"],
  ["404.html", "404.html"],
  ["CNAME", "CNAME"]
];

for (const [from, to] of files) {
  copyFileSync(join(root, from), join(dist, to));
}
