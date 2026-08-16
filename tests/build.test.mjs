import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("build contains every deployable artifact referenced by HTML", () => {
  const expectedFiles = [
    "index.html",
    "404.html",
    "CNAME",
    "main.js",
    "node.js",
    "qrcode.js"
  ];

  for (const file of expectedFiles) {
    assert.equal(existsSync(join(root, "dist", file)), true, `Missing dist/${file}`);
  }

  for (const htmlFile of ["index.html", "404.html"]) {
    const html = readFileSync(join(root, "dist", htmlFile), "utf8");
    assert.match(html, /src="\/qrcode\.js"/);
    assert.match(html, /src="\/main\.js"/);
  }
});
