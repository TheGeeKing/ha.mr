import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  domainEncode,
  pathEncode,
  sldEncode,
  tldEncode
} from "../dist/compression-dictionaries.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDictionaries = JSON.parse(
  readFileSync(join(root, "compression-dictionaries.json"), "utf8")
);

test("packed Huffman dictionaries preserve every source mapping", () => {
  assert.deepEqual(tldEncode, sourceDictionaries.tld);
  assert.deepEqual(sldEncode, sourceDictionaries.sld);
  assert.deepEqual(domainEncode, sourceDictionaries.domain);
  assert.deepEqual(pathEncode, sourceDictionaries.path);
});
