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
  const fixtures = [
    ["https://www.example.com", "GUk6"],
    ["https://en.wikipedia.org/wiki/TypeScript", ":2*#@PxR,~@K?'RI."],
    ["https://example.photography/path", "[AuSmN6dOg"],
    ["http://amazon.com/product?id=42", "vHsdk9@O[3&_uF"]
  ];

  for (const [url, payload] of fixtures) {
    assert.equal(compress(url, outputAlphabetASCII), payload);
    assert.equal(decompress(payload, outputAlphabetASCII), url);
  }

  assert.equal(compress(fixtures[0][0], outputAlphabetQR), "1L3I+");
  assert.equal(compress(fixtures[0][0], outputAlphabetEmoji), "♐📯");
  assert.equal(decompress("1L3I+", outputAlphabetQR), fixtures[0][0]);
  assert.equal(decompress("♐📯", outputAlphabetEmoji), fixtures[0][0]);
});
