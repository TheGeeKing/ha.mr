/**
 * Site-specific URL rewrites applied before compression.
 * Each rule is a pattern plus an equivalent that still opens the same page.
 * String equivalents use `$1`-style captures; builders receive those captures as arguments.
 */

export type UrlRewriteEquivalent = string | ((...captures: string[]) => string);

export type UrlRewriteRule = {
  pattern: RegExp;
  equivalent: UrlRewriteEquivalent;
};

export type UrlRewriteResult = {
  url: string;
  rewritten: boolean;
};

export const urlRewriteRules: UrlRewriteRule[] = [
  {
    pattern:
      /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*?&)?v=([\w-]{11})(?:[&#].*)?$/i,
    equivalent: "https://youtu.be/$1"
  },
  {
    pattern:
      /^(?:https?:\/\/)?(?:www\.|smile\.)?amazon\.[^/?#]+\/(?:[^/?#]+\/)*dp\/([A-Z0-9]{10})(?:[/?#].*)?$/i,
    equivalent: "http://amazon.com/dp/$1"
  },
  {
    pattern:
      /^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/(?!direct(?:\/|$))([^?#]+?)\/?(?:[?#].*)?$/i,
    equivalent: "https://instagr.am/$1"
  },
  {
    pattern:
      /^(?:https?:\/\/)?(?:www\.|old\.|np\.|new\.|m\.)?reddit\.com\/(?:r\/[^/]+\/)?comments\/([a-z0-9]+)(?:[/?#].*)?$/i,
    equivalent: "https://redd.it/$1"
  },
  {
    pattern:
      /^(?:https?:\/\/)?(?:api\.|web\.)?whatsapp\.com\/send\?(?:[^#]*?&)?phone=(?:\+|%2B)?(\d+)(?:[&#].*)?$/i,
    equivalent: "https://wa.me/$1"
  },
  {
    pattern: /^(?:https?:\/\/)?(?:www\.)?telegram\.me\/([^?#]+?)\/?(?:[?#].*)?$/i,
    equivalent: "https://t.me/$1"
  },
  {
    pattern:
      /^(?:https?:\/\/)?(?:www\.|m\.|web\.)?facebook\.com\/(?!watch|reels?|groups|marketplace|events|login|share|messages|gaming|stories|photos|videos|pages|people|search|hashtag|live|ads|privacy|help|settings|permalink\.php|photo\.php|profile\.php|video\.php)([A-Za-z0-9.]+)\/?(?:[?#].*)?$/i,
    equivalent: "https://fb.me/$1"
  },
  {
    pattern: /^(?:https?:\/\/)?(?:www\.)?dailymotion\.com\/video\/([a-z0-9]+)(?:[/_?#].*)?$/i,
    equivalent: "https://dai.ly/$1"
  },
  {
    pattern:
      /^(?:https?:\/\/)?(?:www\.|m\.)?twitch\.tv\/[^/?#]+\/clip\/([A-Za-z0-9_-]+)(?:[/?#].*)?$/i,
    equivalent: "https://clips.twitch.tv/$1"
  },
  {
    pattern: /^(?:https?:\/\/)?(?:www\.)?stackoverflow\.com\/questions\/(\d+)(?:[/?#].*)?$/i,
    equivalent: "https://stackoverflow.com/q/$1"
  },
  {
    pattern: /^(?:https?:\/\/)?(?:www\.)?imdb\.com\/title\/(tt\d+)(?:[/?#].*)?$/i,
    equivalent: "https://www.imdb.com/title/$1"
  },
  {
    pattern:
      /^(?:https?:\/\/)?((?:www\.)?ebay\.[^/?#]+)\/itm\/(?:[^/]+\/)?(\d{8,13})(?:[/?#].*)?$/i,
    equivalent: "https://$1/itm/$2"
  },
  {
    pattern: /^(?:https?:\/\/)?(?:www\.)?etsy\.com(?:\/[a-z]{2})?\/listing\/(\d+)(?:[/?#].*)?$/i,
    equivalent: "https://www.etsy.com/listing/$1"
  },
  {
    pattern: /^(?:https?:\/\/)?store\.steampowered\.com\/app\/(\d+)(?:\/[^/?#]*)?(?:[/?#].*)?$/i,
    equivalent: "https://store.steampowered.com/app/$1"
  },
  {
    pattern: /^(?:https?:\/\/)?(?:www\.)?goodreads\.com\/book\/show\/(\d+)(?:[/?#.-].*)?$/i,
    equivalent: "https://www.goodreads.com/book/show/$1"
  },
  {
    pattern:
      /^(?:https?:\/\/)?(?:apps|itunes)\.apple\.com\/(?:[a-z]{2}(?:-[a-z]+)?\/)?app(?:\/[^/]+)?\/id(\d+)(?:[/?#].*)?$/i,
    equivalent: "https://apps.apple.com/app/id$1"
  },
  {
    pattern: /^(?:https?:\/\/)?(?:www\.|m\.)?flickr\.com\/photos\/[^/]+\/(\d+)(?:[/?#].*)?$/i,
    equivalent: (photoId) => "https://flic.kr/p/" + encode58(photoId)
  }
];

/** Flickr's base58 alphabet for flic.kr photo short URLs (no 0/O/I/l). */
const FLICKR_BASE58 = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

function encode58(value: string): string {
  let remaining = BigInt(value);
  if (remaining === 0n) return FLICKR_BASE58[0];

  const base = BigInt(FLICKR_BASE58.length);
  let encoded = "";
  while (remaining > 0n) {
    encoded = FLICKR_BASE58[Number(remaining % base)] + encoded;
    remaining /= base;
  }
  return encoded;
}

function applyEquivalent(equivalent: UrlRewriteEquivalent, match: RegExpMatchArray): string {
  if (typeof equivalent === "function") {
    return equivalent(...match.slice(1));
  }
  return equivalent.replaceAll(/\$(\d+)/g, (_whole, index: string) => match[Number(index)] ?? "");
}

/**
 * Returns a shorter equivalent URL when a rewrite rule matches.
 * Unmatched input is returned unchanged. Pass `rules` to add or override the table.
 */
export function rewriteUrl(
  input: string,
  rules: readonly UrlRewriteRule[] = urlRewriteRules
): UrlRewriteResult {
  const candidates = [input];
  if (!/^[A-Za-z][A-Za-z\d+.-]*:/.test(input)) {
    candidates.push(`http://${input}`);
  }

  for (const candidate of candidates) {
    for (const rule of rules) {
      const match = candidate.match(rule.pattern);
      if (!match) continue;
      const url = applyEquivalent(rule.equivalent, match);
      if (url === input) continue;
      return { url, rewritten: true };
    }
  }

  return { url: input, rewritten: false };
}
