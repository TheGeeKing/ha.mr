import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("build contains every deployable artifact referenced by HTML", () => {
  const expectedFiles = [
    "404.html",
    "CNAME",
    "compression-dictionaries.js",
    "lean-qr.js",
    "main.js",
    "node.js"
  ];

  for (const file of expectedFiles) {
    assert.equal(existsSync(join(root, "dist", file)), true, `Missing dist/${file}`);
  }

  const html = readFileSync(join(root, "dist", "404.html"), "utf8");
  assert.doesNotMatch(html, /src="lean-qr\.js"/);
  assert.match(html, /src="\/main\.js"/);

  const main = readFileSync(join(root, "dist", "main.js"), "utf8");
  assert.match(main, /\.src="lean-qr\.js"/);
});

test("compression browser modules stay below the transfer-size budget", () => {
  const moduleNames = ["compress.js", "compression-dictionaries.js"];
  const gzipBytes = moduleNames.reduce((total, moduleName) => {
    const source = readFileSync(join(root, "dist", moduleName));
    return total + gzipSync(source, { level: 9 }).byteLength;
  }, 0);

  assert.ok(gzipBytes < 30_000, `Compression modules total ${gzipBytes} gzip bytes`);
});
