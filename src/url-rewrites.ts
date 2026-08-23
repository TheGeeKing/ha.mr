/**
 * Site-specific URL rewrites applied before compression.
 * Each rule is a pattern plus an equivalent that still opens the same page.
 */

export type UrlRewriteRule = {
  pattern: RegExp;
  equivalent: string;
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
  }
];

function applyEquivalent(equivalent: string, match: RegExpMatchArray): string {
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
