import assert from "node:assert/strict";
import { test } from "node:test";

import { rewriteUrl, urlRewriteRules } from "../dist/url-rewrites.js";

test("rewriteUrl leaves unmatched URLs unchanged", () => {
  assert.deepEqual(rewriteUrl("https://www.example.com/path?x=1"), {
    url: "https://www.example.com/path?x=1",
    rewritten: false
  });
  assert.deepEqual(rewriteUrl("http://amazon.com/product?id=42"), {
    url: "http://amazon.com/product?id=42",
    rewritten: false
  });
});

test("rewriteUrl shortens YouTube watch URLs to youtu.be", () => {
  assert.deepEqual(rewriteUrl("https://www.youtube.com/watch?v=TOr1Vvji6jA"), {
    url: "https://youtu.be/TOr1Vvji6jA",
    rewritten: true
  });
  assert.deepEqual(
    rewriteUrl("https://m.youtube.com/watch?feature=share&v=TOr1Vvji6jA&list=PLxx"),
    {
      url: "https://youtu.be/TOr1Vvji6jA",
      rewritten: true
    }
  );
  assert.deepEqual(rewriteUrl("youtube.com/watch?v=TOr1Vvji6jA"), {
    url: "https://youtu.be/TOr1Vvji6jA",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("https://youtu.be/TOr1Vvji6jA"), {
    url: "https://youtu.be/TOr1Vvji6jA",
    rewritten: false
  });
});

test("rewriteUrl shortens Amazon product URLs to /dp/{ASIN}", () => {
  const longAmazon =
    "https://smile.amazon.com/TOPJIN-Lovely-Stuffed-Vegetable-Carrot/dp/B077ZTBWV2/ref=sr_1_6?keywords=carrot+plush&qid=1563782964&s=gateway&sr=8-6";

  assert.deepEqual(rewriteUrl(longAmazon), {
    url: "http://amazon.com/dp/B077ZTBWV2",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("https://www.amazon.co.uk/dp/B077ZTBWV2"), {
    url: "http://amazon.com/dp/B077ZTBWV2",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("http://amazon.com/dp/B077ZTBWV2"), {
    url: "http://amazon.com/dp/B077ZTBWV2",
    rewritten: false
  });
});

test("rewriteUrl shortens Instagram URLs to instagr.am", () => {
  assert.deepEqual(rewriteUrl("https://www.instagram.com/p/C8xYz1AbCdE/?igsh=TOKEN"), {
    url: "https://instagr.am/p/C8xYz1AbCdE",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("https://www.instagram.com/reel/DAbCdEfGhIj/"), {
    url: "https://instagr.am/reel/DAbCdEfGhIj",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("instagram.com/natgeo"), {
    url: "https://instagr.am/natgeo",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("https://instagr.am/p/C8xYz1AbCdE"), {
    url: "https://instagr.am/p/C8xYz1AbCdE",
    rewritten: false
  });
  assert.deepEqual(rewriteUrl("https://www.instagram.com/direct/t/178412345"), {
    url: "https://www.instagram.com/direct/t/178412345",
    rewritten: false
  });
  assert.deepEqual(rewriteUrl("https://ig.me/m/natgeo"), {
    url: "https://ig.me/m/natgeo",
    rewritten: false
  });
});

test("rewriteUrl applies a caller-supplied pattern and equivalent", () => {
  const rules = [
    {
      pattern: /^https:\/\/news\.example\/p\/([a-z0-9]+)/,
      equivalent: "https://n.example/$1"
    }
  ];

  assert.deepEqual(rewriteUrl("https://news.example/p/abc99?utm=1", rules), {
    url: "https://n.example/abc99",
    rewritten: true
  });
  assert.equal(urlRewriteRules.length > 0, true);
});
