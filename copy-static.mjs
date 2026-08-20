import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });

copyFileSync(join(root, "docs/CNAME"), join(dist, "CNAME"));

let html = readFileSync(join(root, "docs/404.html"), "utf8");
html = html.replace(/<style>([\s\S]*?)<\/style>/, (_match, css) => {
  const { code } = transformSync(css, { loader: "css", minify: true });
  return `<style>${code.trim()}</style>`;
});
html = html.replace(/>\s+</g, "><").trim();
writeFileSync(join(dist, "404.html"), html);
