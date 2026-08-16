import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPath = join(root, "dist", "standalone.js");

test("CLI compresses and decompresses ASCII links", () => {
  const compressed = execFileSync(process.execPath, [cliPath, "https://www.example.com"], {
    encoding: "utf8"
  }).trim();

  assert.equal(compressed, "http://ha.mr#GUk6");
  assert.equal(
    execFileSync(process.execPath, [cliPath, compressed], { encoding: "utf8" }).trim(),
    "https://www.example.com"
  );
});

test("CLI compresses and decompresses QR links", () => {
  const compressed = execFileSync(
    process.execPath,
    [cliPath, "https://www.example.com", "qr"],
    { encoding: "utf8" }
  ).trim();

  assert.equal(compressed, "HTTP://HA.MR/1L3I+");
  assert.equal(
    execFileSync(process.execPath, [cliPath, compressed], { encoding: "utf8" }).trim(),
    "https://www.example.com"
  );
});

test("CLI rejects unknown alphabets", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "https://www.example.com", "unknown"],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown alphabet "unknown"/);
});
