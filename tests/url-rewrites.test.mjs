import assert from "node:assert/strict";
import { test } from "node:test";

import { rewriteUrl as rewriteUrlWithDetails, urlRewriteRules } from "../dist/url-rewrites.js";

function rewriteUrl(...arguments_) {
  const { droppedQueryParams: _droppedQueryParams, ...result } = rewriteUrlWithDetails(
    ...arguments_
  );
  return result;
}

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

test("rewriteUrl preserves functional parameters and reports removed parameters", () => {
  assert.deepEqual(
    rewriteUrlWithDetails(
      "https://www.youtube.com/watch?v=TOr1Vvji6jA&utm_source=share&t=10&t=20#details"
    ),
    {
      url: "https://youtu.be/TOr1Vvji6jA?t=10&t=20#details",
      rewritten: true,
      droppedQueryParams: [{ key: "utm_source", value: "share" }]
    }
  );
});

test("rewriteUrl preserves duplicate removed parameters for optional restoration", () => {
  assert.deepEqual(
    rewriteUrlWithDetails("https://www.amazon.com/dp/B077ZTBWV2?tag=first&th=1&tag=second#reviews"),
    {
      url: "http://amazon.com/dp/B077ZTBWV2?th=1#reviews",
      rewritten: true,
      droppedQueryParams: [
        { key: "tag", value: "first" },
        { key: "tag", value: "second" }
      ]
    }
  );
});

test("rewriteUrl keeps verified functional parameters for each supported platform", () => {
  const cases = [
    [
      "https://www.instagram.com/p/C8xYz1AbCdE/?img_index=2",
      "https://instagr.am/p/C8xYz1AbCdE?img_index=2"
    ],
    [
      "https://www.reddit.com/r/funny/comments/7n5lu/man_can_fly/?sort=new",
      "https://redd.it/7n5lu?sort=new"
    ],
    ["https://telegram.me/example_bot?start=payload", "https://t.me/example_bot?start=payload"],
    [
      "https://www.ebay.com/itm/Cool-Gadget/123456789012?var=987654321",
      "https://www.ebay.com/itm/123456789012?var=987654321"
    ],
    [
      "https://www.etsy.com/listing/123456789/cool-print?variation0=456",
      "https://www.etsy.com/listing/123456789?variation0=456"
    ],
    [
      "https://store.steampowered.com/app/730/Counter-Strike_2/?l=french&cc=fr",
      "https://store.steampowered.com/app/730?l=french&cc=fr"
    ],
    [
      "https://apps.apple.com/us/app/example/id310633997?ppid=custom-page",
      "https://apps.apple.com/app/id310633997?ppid=custom-page"
    ]
  ];

  for (const [input, expected] of cases) {
    assert.deepEqual(rewriteUrlWithDetails(input), {
      url: expected,
      rewritten: true,
      droppedQueryParams: []
    });
  }
});

test("rewriteUrl shortens YouTube watch URLs to youtu.be", () => {
  assert.deepEqual(rewriteUrl("https://www.youtube.com/watch?v=TOr1Vvji6jA"), {
    url: "https://youtu.be/TOr1Vvji6jA",
    rewritten: true
  });
  assert.deepEqual(
    rewriteUrl("https://m.youtube.com/watch?feature=share&v=TOr1Vvji6jA&list=PLxx"),
    {
      url: "https://youtu.be/TOr1Vvji6jA?list=PLxx",
      rewritten: true
    }
  );
  assert.deepEqual(rewriteUrl("https://www.youtube.com/watch?v=TOr1Vvji6jA&t=600"), {
    url: "https://youtu.be/TOr1Vvji6jA?t=600",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("https://www.youtube.com/watch?t=10m&v=TOr1Vvji6jA"), {
    url: "https://youtu.be/TOr1Vvji6jA?t=10m",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("https://www.youtube.com/watch?v=TOr1Vvji6jA&start=600"), {
    url: "https://youtu.be/TOr1Vvji6jA?start=600",
    rewritten: true
  });
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

test("rewriteUrl shortens Reddit posts to redd.it", () => {
  assert.deepEqual(
    rewriteUrl("https://www.reddit.com/r/funny/comments/7n5lu/man_can_fly/?utm_source=share"),
    {
      url: "https://redd.it/7n5lu",
      rewritten: true
    }
  );
  assert.deepEqual(rewriteUrl("https://redd.it/7n5lu"), {
    url: "https://redd.it/7n5lu",
    rewritten: false
  });
});

test("rewriteUrl shortens WhatsApp send links to wa.me", () => {
  assert.deepEqual(rewriteUrl("https://api.whatsapp.com/send?phone=15551234567"), {
    url: "https://wa.me/15551234567",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("https://api.whatsapp.com/send?phone=15551234567&text=Hi"), {
    url: "https://wa.me/15551234567?text=Hi",
    rewritten: true
  });
});

test("rewriteUrl shortens Telegram telegram.me to t.me", () => {
  assert.deepEqual(rewriteUrl("https://telegram.me/durov"), {
    url: "https://t.me/durov",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("https://t.me/durov"), {
    url: "https://t.me/durov",
    rewritten: false
  });
});

test("rewriteUrl shortens Facebook pages to fb.me", () => {
  assert.deepEqual(rewriteUrl("https://www.facebook.com/zuck?fbclid=IwAR"), {
    url: "https://fb.me/zuck",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("https://www.facebook.com/watch/?v=123"), {
    url: "https://www.facebook.com/watch/?v=123",
    rewritten: false
  });
  assert.deepEqual(rewriteUrl("https://fb.me/zuck"), {
    url: "https://fb.me/zuck",
    rewritten: false
  });
});

test("rewriteUrl shortens Dailymotion videos to dai.ly", () => {
  assert.deepEqual(rewriteUrl("https://www.dailymotion.com/video/x8abcd?playlist=p"), {
    url: "https://dai.ly/x8abcd?playlist=p",
    rewritten: true
  });
});

test("rewriteUrl shortens Twitch clips to clips.twitch.tv", () => {
  assert.deepEqual(rewriteUrl("https://www.twitch.tv/shroud/clip/CoolClip-abc"), {
    url: "https://clips.twitch.tv/CoolClip-abc",
    rewritten: true
  });
});

test("rewriteUrl shortens Stack Overflow question URLs", () => {
  assert.deepEqual(
    rewriteUrl("https://stackoverflow.com/questions/410485/what-is-the-alphanumeric-id"),
    {
      url: "https://stackoverflow.com/q/410485",
      rewritten: true
    }
  );
});

test("rewriteUrl shortens IMDb title URLs", () => {
  assert.deepEqual(rewriteUrl("https://www.imdb.com/title/tt0111161/?ref_=nv_sr"), {
    url: "https://www.imdb.com/title/tt0111161",
    rewritten: true
  });
});

test("rewriteUrl shortens eBay item URLs", () => {
  assert.deepEqual(rewriteUrl("https://www.ebay.com/itm/Cool-Gadget/123456789012?hash=item"), {
    url: "https://www.ebay.com/itm/123456789012",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("https://www.ebay.co.uk/itm/123456789012"), {
    url: "https://www.ebay.co.uk/itm/123456789012",
    rewritten: false
  });
});

test("rewriteUrl shortens Etsy listing URLs", () => {
  assert.deepEqual(rewriteUrl("https://www.etsy.com/listing/123456789/cool-print?ref=hp"), {
    url: "https://www.etsy.com/listing/123456789",
    rewritten: true
  });
});

test("rewriteUrl shortens Steam store app URLs", () => {
  assert.deepEqual(rewriteUrl("https://store.steampowered.com/app/730/Counter-Strike_2/"), {
    url: "https://store.steampowered.com/app/730",
    rewritten: true
  });
});

test("rewriteUrl shortens Goodreads book URLs", () => {
  assert.deepEqual(rewriteUrl("https://www.goodreads.com/book/show/3735293-the-giving-tree"), {
    url: "https://www.goodreads.com/book/show/3735293",
    rewritten: true
  });
});

test("rewriteUrl shortens App Store URLs to /app/id", () => {
  assert.deepEqual(
    rewriteUrl("https://apps.apple.com/us/app/whatsapp-messenger/id310633997?mt=8"),
    {
      url: "https://apps.apple.com/app/id310633997",
      rewritten: true
    }
  );
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

test("rewriteUrl applies a caller-supplied query allowlist", () => {
  const rules = [
    {
      pattern: /^https:\/\/news\.example\/p\/([a-z0-9]+)/,
      equivalent: "https://n.example/$1",
      preserveQueryParams: ["view"]
    }
  ];

  assert.deepEqual(
    rewriteUrlWithDetails("https://news.example/p/abc99?view=compact&utm=1", rules),
    {
      url: "https://n.example/abc99?view=compact",
      rewritten: true,
      droppedQueryParams: [{ key: "utm", value: "1" }]
    }
  );
});

test("rewriteUrl applies a caller-supplied equivalent builder", () => {
  const rules = [
    {
      pattern: /^https:\/\/news\.example\/p\/([a-z0-9]+)/,
      equivalent: (id) => `https://n.example/${id.toUpperCase()}`
    }
  ];

  assert.deepEqual(rewriteUrl("https://news.example/p/abc99", rules), {
    url: "https://n.example/ABC99",
    rewritten: true
  });
});

test("rewriteUrl shortens Flickr photo URLs to flic.kr", () => {
  assert.deepEqual(rewriteUrl("https://www.flickr.com/photos/johndoe/5169665786/in/photostream/"), {
    url: "https://flic.kr/p/8SPTwJ",
    rewritten: true
  });
  assert.deepEqual(rewriteUrl("https://flic.kr/p/8SPTwJ"), {
    url: "https://flic.kr/p/8SPTwJ",
    rewritten: false
  });
  assert.deepEqual(
    rewriteUrl("https://www.flickr.com/photos/12037949754@N01/albums/72157594162136485/"),
    {
      url: "https://www.flickr.com/photos/12037949754@N01/albums/72157594162136485/",
      rewritten: false
    }
  );
});
