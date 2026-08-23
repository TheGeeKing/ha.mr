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
  const execute = (args) =>
    execFileSync(runtime.command, [...runtime.prefixArguments, ...args], {
      encoding: "utf8"
    }).trim();

  test(`${runtime.name} CLI compresses and decompresses ASCII links`, () => {
    const compressed = execute(["https://www.example.com"]);

    assert.equal(compressed, "http://ha.mr#GUk6");
    assert.equal(execute([compressed]), "https://www.example.com");
  });

  test(`${runtime.name} CLI compresses hosts that only start with ha.mr`, () => {
    const compressed = execute(["http://ha.mrock.com"]);

    assert.match(compressed, /^http:\/\/ha\.mr#./);
    assert.equal(execute([compressed]), "http://ha.mrock.com");
  });

  test(`${runtime.name} CLI compresses the ha.mr site URL instead of decoding it`, () => {
    const compressed = execute(["https://ha.mr/"]);

    assert.notEqual(compressed, "http://l.us");
    assert.match(compressed, /^http:\/\/ha\.mr#./);
    assert.equal(execute([compressed]), "https://ha.mr");
  });

  test(`${runtime.name} CLI compresses and decompresses QR links`, () => {
    const compressed = execute(["https://www.example.com", "qr"]);

    assert.equal(compressed, "HTTP://HA.MR/1L3I+");
    assert.equal(execute([compressed]), "https://www.example.com");
  });

  test(`${runtime.name} CLI round-trips QR payloads containing slashes`, () => {
    const compressed = execute(["https://example.com/13", "qr"]);

    assert.equal(compressed, "HTTP://HA.MR/O/M*PY:");
    assert.equal(execute([compressed]), "https://example.com/13");
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
    assert.equal(execute(["https://www.example.com", "emoji"]), "http://ha.mr#♐📯");
  });

  test(`${runtime.name} CLI decodes emoji payloads`, {
    skip: runtime.name === "QuickJS" && process.platform === "win32"
  }, () => {
    assert.equal(execute(["http://ha.mr#♐📯"]), "https://www.example.com");
  });

  test(`${runtime.name} CLI rewrites YouTube watch URLs before compressing`, () => {
    const compressed = execute(["https://www.youtube.com/watch?v=TOr1Vvji6jA"]);

    assert.match(compressed, /^http:\/\/ha\.mr#./);
    assert.equal(execute([compressed]), "https://youtu.be/TOr1Vvji6jA");
  });

  test(`${runtime.name} CLI rewrites Amazon product URLs before compressing`, () => {
    const compressed = execute([
      "https://smile.amazon.com/TOPJIN-Lovely-Stuffed-Vegetable-Carrot/dp/B077ZTBWV2/ref=sr_1_6?keywords=carrot+plush&qid=1563782964&s=gateway&sr=8-6"
    ]);

    assert.equal(execute([compressed]), "http://amazon.com/dp/B077ZTBWV2");
  });

  test(`${runtime.name} CLI --lossless skips native website shortening`, () => {
    const input = "https://www.youtube.com/watch?v=TOr1Vvji6jA";
    const compressed = execute([input, "--lossless"]);

    assert.match(compressed, /^http:\/\/ha\.mr#./);
    assert.equal(execute([compressed]), input);
  });

  test(`${runtime.name} CLI reports usage when input is missing`, () => {
    const result = spawnSync(runtime.command, runtime.prefixArguments, { encoding: "utf8" });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage: hamr/);
    assert.match(result.stderr, /--lossless/);
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
