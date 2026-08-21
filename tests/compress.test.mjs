import assert from "node:assert/strict";
import { test } from "node:test";

import { outputAlphabetASCII, outputAlphabetEmoji, outputAlphabetQR } from "../dist/alphabets.js";
import { compress, decompress } from "../dist/compress.js";

const roundTripCases = [
  ["https://www.example.com", "https://www.example.com"],
  [
    "http://example.com:8080/path/to/page?x=1&y=two#section",
    "http://example.com:8080/path/to/page?x=1&y=two#section"
  ],
  ["https://en.wikipedia.org/wiki/TypeScript", "https://en.wikipedia.org/wiki/TypeScript"],
  ["https://example.com/%E2%9C%93", "https://example.com/%e2%9c%93"],
  ["example.com/a-b_c", "http://example.com/a-b_c"],
  ["https://example.com/a%2Fb", "https://example.com/a%2fb"],
  ["https://example.com?q=a%26b", "https://example.com?q=a%26b"],
  ["https://example.com?q=a%3Db", "https://example.com?q=a%3db"],
  ["https://example.com?token=a=b", "https://example.com?token=a=b"],
  ["https://example.com?q=hello+world", "https://example.com?q=hello+world"],
  ["https://example.com/path?empty=&x=1&empty=", "https://example.com/path?empty=&x=1&empty="],
  [
    "https://example.com/a%3Fb%23c?redirect=https%3A%2F%2Fother.example%2Fa%3Fb%3Dc%26d%3De#done",
    "https://example.com/a%3fb%23c?redirect=https%3a%2f%2fother.example%2fa%3fb%3dc%26d%3de#done"
  ],
  ["https://example.com/path#section?x=y&z", "https://example.com/path#section?x=y&z"],
  ["https://[2001:db8::1]/path", "https://[2001:db8::1]/path"],
  ["https://my-site.example.com", "https://my-site.example.com"],
  ["https://a1b2.example.com", "https://a1b2.example.com"],
  ["https://xn--mnchen-3ya.example.com", "https://xn--mnchen-3ya.example.com"],
  ["https://münchen.example.com", "https://xn--mnchen-3ya.example.com"]
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

test("compression rejects unsupported and malformed URLs", () => {
  const invalidUrls = [
    "ftp://example.com/file",
    "mailto:user@example.com",
    "https://user:password@example.com",
    "http://"
  ];

  for (const url of invalidUrls) {
    assert.throws(() => compress(url, outputAlphabetASCII));
  }
});

test("compression rejects hostnames with illegal DNS characters", () => {
  const invalidHosts = [
    "https://under_score.example.com/",
    "https://star*host.example.com/",
    "https://bang!host.example.com/",
    "https://dollar$host.example.com/",
    "https://ampersand&host.example.com/",
    "https://foo%21bar.example.com/",
    "https://-leading.example.com/",
    "https://trailing-.example.com/"
  ];

  for (const url of invalidHosts) {
    assert.throws(() => compress(url, outputAlphabetASCII), {
      name: "Error",
      message: /invalid hostname/i
    });
  }
});

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
