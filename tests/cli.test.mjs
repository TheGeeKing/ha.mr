import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPath = join(root, "dist", "node.js");
const runtimes = [
  {
    command: process.execPath,
    name: "Node",
    prefixArguments: [cliPath]
  }
];

if (process.env.HAMR_NATIVE_PATH) {
  runtimes.push({
    command: process.env.HAMR_NATIVE_PATH,
    name: "QuickJS",
    prefixArguments: []
  });
}

for (const runtime of runtimes) {
  const execute = (args) => execFileSync(
    runtime.command,
    [...runtime.prefixArguments, ...args],
    { encoding: "utf8" }
  ).trim();

  test(`${runtime.name} CLI compresses and decompresses ASCII links`, () => {
    const compressed = execute(["https://www.example.com"]);

    assert.equal(compressed, "http://ha.mr#GUk6");
    assert.equal(execute([compressed]), "https://www.example.com");
  });

  test(`${runtime.name} CLI compresses and decompresses QR links`, () => {
    const compressed = execute(["https://www.example.com", "qr"]);

    assert.equal(compressed, "HTTP://HA.MR/1L3I+");
    assert.equal(execute([compressed]), "https://www.example.com");
  });

  test(`${runtime.name} CLI round-trips Unicode URLs with query and hash data`, () => {
    const input = "https://example.com/%E2%9C%93?q=caf%C3%A9#r%C3%A9sum%C3%A9";
    const compressed = execute([input]);

    assert.equal(
      execute([compressed]),
      "https://example.com/%e2%9c%93?q=caf%c3%a9#r%c3%a9sum%c3%a9"
    );
  });

  test(`${runtime.name} CLI emits emoji payloads`, () => {
    assert.equal(
      execute(["https://www.example.com", "emoji"]),
      "http://ha.mr#♐📯"
    );
  });

  test(
    `${runtime.name} CLI decodes emoji payloads`,
    { skip: runtime.name === "QuickJS" && process.platform === "win32" },
    () => {
      assert.equal(execute(["http://ha.mr#♐📯"]), "https://www.example.com");
    }
  );

  test(`${runtime.name} CLI reports usage when input is missing`, () => {
    const result = spawnSync(runtime.command, runtime.prefixArguments, { encoding: "utf8" });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage: hamr/);
  });

  test(`${runtime.name} CLI rejects unknown alphabets`, () => {
    const result = spawnSync(
      runtime.command,
      [...runtime.prefixArguments, "https://www.example.com", "unknown"],
      { encoding: "utf8" }
    );

    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unknown alphabet "unknown"/);
  });
}
