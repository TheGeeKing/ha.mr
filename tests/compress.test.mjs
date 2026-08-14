import assert from "node:assert/strict";
import { test } from "node:test";

import {
  outputAlphabetASCII,
  outputAlphabetEmoji,
  outputAlphabetQR
} from "../dist/alphabets.js";
import { compress, decompress } from "../dist/compress.js";

const roundTripCases = [
  ["https://www.example.com", "https://www.example.com"],
  [
    "http://example.com:8080/path/to/page?x=1&y=two#section",
    "http://example.com:8080/path/to/page?x=1&y=two#section"
  ],
  ["https://en.wikipedia.org/wiki/TypeScript", "https://en.wikipedia.org/wiki/TypeScript"],
  ["https://example.com/%E2%9C%93", "https://example.com/%e2%9c%93"],
  ["example.com/a-b_c", "http://example.com/a-b_c"]
];

const alphabets = [
  ["ASCII", outputAlphabetASCII],
  ["QR", outputAlphabetQR],
  ["emoji", outputAlphabetEmoji]
];

for (const [alphabetName, alphabet] of alphabets) {
  test(`${alphabetName} payloads round-trip representative URLs`, async (context) => {
    for (const [input, expected] of roundTripCases) {
      await context.test(input, () => {
        assert.equal(decompress(compress(input, alphabet), alphabet), expected);
      });
    }
  });
}

test("encoding remains compatible with existing payloads", () => {
  const url = "https://www.example.com";

  assert.equal(compress(url, outputAlphabetASCII), "GUk6");
  assert.equal(compress(url, outputAlphabetQR), "1L3I+");
  assert.equal(compress(url, outputAlphabetEmoji), "♐📯");

  assert.equal(decompress("GUk6", outputAlphabetASCII), url);
  assert.equal(decompress("1L3I+", outputAlphabetQR), url);
  assert.equal(decompress("♐📯", outputAlphabetEmoji), url);
});
