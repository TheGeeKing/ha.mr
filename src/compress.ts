import {
  domainDecode,
  domainEncode,
  pathDecode,
  pathEncode,
  sldDecode,
  sldEncode,
  sldList,
  tldDecode,
  tldEncode
} from "./compression-dictionaries.js";

/**
 * @file Implements link compression/decompression.
 */
const VERSION = 0;

// Growing subcategories of the full URL alphabet
// Each also includes the hyphen and underscore as common separators
const subalphabets: string[] = [
  // Numbers only
  "0123456789-_",
  // Uppercase only
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ-_",
  // Lowercase only
  "abcdefghijklmnopqrstuvwxyz-_",
  // Uppercase and numbers
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_",
  // Lowercase and numbers
  "abcdefghijklmnopqrstuvwxyz0123456789-_",
  // Uppercase and lowercase
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_",
  // Upercase, lowercase and numbers (base64)
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  // Full alphabet without slash character
  "!#$&'()*+,-.0123456789:;=?~@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]_abcdefghijklmnopqrstuvwxyz%"
];

/**
 * The following two functions convert between large numbers and strings.
 * The idea is that, instead of working in a fixed base such as binary or
 * whatever base the string is in, we can instead manipulate some number
 * as an arbitrary-precision data stream.
 *
 * For example, a value with 3 possible options requires about 1.6 bits.
 * In binary, that would round up to 2 bits, and in base-85 (for example),
 * it would round up to a whole character. If we instead use one shared
 * integer for the whole data stream, we can encode that value by:
 *  1. multiplying the number by 3; (number *= 3n)
 *  2. adding the encoded value (0, 1, or 2), (number += value)
 * and decode it by:
 *  1. reading the remainder when dividing by 3; (number % 3n)
 *  2. dividing the number by 3. (number /= 3n)
 */

/**
 * Encodes a number into a string of the given alphabet.
 * @param {BigInt} number Number to encode
 * @param {string[]} alphabet Ordered list of possible character sequences in output
 * @returns {string} String representing the input number
 */
function numberToString (number: bigint, alphabet: string[]): string {
  const alphabetSize = BigInt(alphabet.length);
  let string = "";

  while (number > 0) {
    number --;
    string += alphabet[Number(number % alphabetSize)];
    number /= alphabetSize;
  }

  return string;
}

/**
 * Decodes a string of the given alphabet into a number.
 * @param {string} string Input string containing sequences from `alphabet`
 * @param {string[]} alphabet Ordered list of possible character sequences in `string`
 * @returns {BigInt} Decoded number
 */
function stringToNumber (string: string, alphabet: string[]): bigint {
  const alphabetSize = BigInt(alphabet.length);
  let number = 0n;

  // Not all alphabets are 1 byte per character. For example, the emoji
  // alphabet includes some sequences that only make sense in specific
  // combinations. To account for this, we assume the alphabets are
  // ordered with the longest sequences first (they are), and find the
  // first entry that matches the current position in the string.
  while (string) {
    const digit = BigInt(alphabet.findIndex(c => string.endsWith(c)));
    if (digit < 0n) throw `Invalid character: "${string.at(-1)}"`;
    number *= alphabetSize;
    number += digit;
    number ++;
    const sequence = alphabet[Number(digit)];
    string = string.slice(0, -sequence.length);
  }

  return number;
}

/**
 * Encodes a binary sequence from a string into the number/data stream.
 * @param {BigInt} number Data stream to encode to
 * @param {string} sequence Binary sequence of "0"/"1" string characters
 * @returns {BigInt} Modified input number with binary sequence encoded
 */
function huffmanEncode (number: bigint, sequence: string): bigint {
  for (let i = sequence.length - 1; i >= 0; i --) {
    number <<= 1n;
    if (sequence[i] === "1") number ++;
  }
  return number;
}

/**
 * Decodes a string from the data stream using the given dictionary.
 * @param {BigInt} number Data stream to decode from
 * @param {object} lookup Dictionary of binary sequence -> output pairs
 * @returns {{newNumber: BigInt, digit: string}}
 *  Modified input number after decoding, output string
 */
function huffmanDecode (number: bigint, lookup: Record<string, string>): { newNumber: bigint; digit: string } {
  let sequence = "";
  do {
    sequence += number & 1n;
    number >>= 1n;
    if (sequence.length > 20) {
      throw `Huffman sequence too long: "${sequence}".`;
    }
  } while (!(sequence in lookup));
  return { newNumber: number, digit: lookup[sequence] };
}

/**
 * Converts a 128-bit integer to a compressed IPv6 address.
 * @param {BigInt} number 128-bit IPv6 value
 * @returns {string} IPv6 address without square brackets
 */
function numberToIPv6 (number: bigint): string {
  const hextets = [];

  for (let i = 0; i < 8; i ++) {
    hextets.unshift((number & 0xffffn).toString(16));
    number >>= 16n;
  }

  let bestStart = -1;
  let bestLength = 0;
  let start = -1;

  for (let i = 0; i <= hextets.length; i ++) {
    if (i < hextets.length && hextets[i] === "0") {
      if (start === -1) start = i;
    } else if (start !== -1) {
      const length = i - start;

      if (length > bestLength && length > 1) {
        bestStart = start;
        bestLength = length;
      }

      start = -1;
    }
  }

  if (bestStart === -1) return hextets.join(":");

  const left = hextets.slice(0, bestStart).join(":");
  const right = hextets.slice(bestStart + bestLength).join(":");

  return `${left}::${right}`;
}

/**
 * Converts an IPv6 address to its 128-bit integer representation.
 * @param {string} input IPv6 address without square brackets
 * @returns {BigInt} 128-bit IPv6 value
 */
function ipv6ToNumber (input: string): bigint {
  const halves = input.split("::");
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];

  const missing = 8 - left.length - right.length;
  const hextets = [
    ...left,
    ...Array(missing).fill("0"),
    ...right
  ];

  let number = 0n;

  for (const hextet of hextets) {
    number <<= 16n;
    number += BigInt(`0x${hextet || "0"}`);
  }

  return number;
}

/**
 * Compresses the input link and encodes it to the given alphabet.
 * @param {string} input Link to compress
 * @param {string[]} alphabet Output alphabet as array of characters/strings
 * @returns {string} Output payload (not a full link!)
 */
export function compress (input: string, alphabet: string[]): string {
  let number = 1n;

  const hasProtocol = /^[A-Za-z][A-Za-z\d+.-]*:/.test(input);
  const url = new URL(hasProtocol ? input : `http://${input}`);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }

  if (url.username || url.password) {
    throw new Error("Credentials in URLs are not supported");
  }

  let hostname = url.hostname.toLowerCase();
  const isIPv6 = hostname.startsWith("[") && hostname.endsWith("]");
  const port = BigInt(url.port);
  const lastLabel = hostname.split(".").at(-1)?.toLowerCase();
  const tld = !isIPv6 && hostname.includes(".") && lastLabel ? lastLabel : "";

  if (tld && tld in tldEncode) {
    hostname = hostname.split(".").slice(0, -1).join(".");
  }

  const isHTTPS = url.protocol === "https:";
  const hasWWW = !isIPv6 && url.hostname.toLowerCase().startsWith("www.");
  if (hasWWW) hostname = hostname.slice(4);

  const knownSLD = !isIPv6 ? sldList.find(c => hostname.endsWith(c)) || "" : "";
  const subdomain = hostname.slice(0, -knownSLD.length);

  // Read URL path, split it into segments
  let path = url.pathname;

  // Remove "index" suffixes, encoded separately later
  const hasIndexHTML = path.endsWith("/index.html");
  const hasIndexPHP = path.endsWith("/index.php");
  if (hasIndexHTML) path = path.slice(0, -11);
  else if (hasIndexPHP) path = path.slice(0, -10);

  // The seperable parts of a path/query are split into segments with
  // their position/role in the link noted. This lets us pick optimal
  // character sets for individual segments and enables us to encode
  // only the transitions between segments. As-is, the system's a bit
  // clumsy, but it works.
  const pathSegments = path.split("/")
    .filter(c => c.length)
    .map(c => ({ type: "path", value: c }));

  // Add search/query parameters to path segments
  const queryParams = url.search
    ? url.search.slice(1)
      .split("=")
      .flatMap(segment => segment.split("&"))
      .map(value => ({ type: "query", value }))
    : [];
  pathSegments.push(...queryParams);

  // Add hash value to path segments
  if (url.hash && url.hash.length > 1) {
    pathSegments.push({ type: "hash", value: url.hash.slice(1) });
  }

  // Normalize path segment encoding while preserving escaped reserved characters
  const reservedEscape = /(%(?:23|24|26|2B|2C|2F|3A|3B|3D|3F|40))/gi;

  for (const segment of pathSegments) {
    segment.value = segment.value
      .split(reservedEscape)
      .map((part, index) =>
        index % 2 === 1
          ? part
          : encodeURI(decodeURI(part))
      )
      .join("");
  }

  // Encode path following domain segment-by-segment, using best algorithm for each
  let lastSegmentType = pathSegments.at(-1)?.type;
  let queryParamIndex = 0;
  for (let j = pathSegments.length - 1; j >= 0; j --) {
    const segment = pathSegments[j];
    const firstIteration = j === pathSegments.length - 1;
    if (!firstIteration && queryParamIndex % 2 !== 1) {
      // Indicate change of segment type (path -> param -> hash)
      //   First bit indicates that a change is happening,
      //   second bit indicates whether we're skipping straight to the hash.
      number <<= 1n;
      if (lastSegmentType === "hash" && segment.type === "query") {
        number ++;
      } else if (lastSegmentType === "hash" && segment.type === "path") {
        number ++; // Second bit is 1
        number <<= 1n;
        number ++;
      } else if (lastSegmentType !== segment.type) {
        // Second bit is 0
        number <<= 1n;
        number ++;
      }
      lastSegmentType = segment.type;
    }
    if (segment.type === "query") {
      queryParamIndex ++;
    }
    // Look for smallest subalphabet that fits this path segment
    let subalphabetIndex = -1;
    let subalphabet = null;
    for (let i = 0; i < subalphabets.length; i ++) {
      if (!Array.from(segment.value).some(c => !subalphabets[i].includes(c))) {
        subalphabet = subalphabets[i];
        subalphabetIndex = i;
        break;
      }
    }
    // Compute number after Huffman coding
    let huffmanNumber = firstIteration ? number : huffmanEncode(number, pathEncode["#"]);
    for (let i = segment.value.length - 1; i >= 0; i --) {
      if (segment.value[i - 2] === "%") {
        const byte = parseInt(segment.value.slice(i - 1, i + 1), 16);
        huffmanNumber *= 256n;
        huffmanNumber += BigInt(byte);
        huffmanNumber = huffmanEncode(huffmanNumber, pathEncode["%"]);
        i -= 2;
      } else {
        if (segment.value[i] === "~") {
          /**
           * HACK HACK HACK!!!
           * Our Huffman tree is missing the tilde character (whoops!)
           * It's too late to change it now without bumping the version
           * number, and that currently costs 1 bit. Tildes are so rare
           * that it makes more sense to %-encode them instead.
           */
          huffmanNumber *= 256n;
          huffmanNumber += BigInt(126);
          huffmanNumber = huffmanEncode(huffmanNumber, pathEncode["%"]);
        } else {
          huffmanNumber = huffmanEncode(huffmanNumber, pathEncode[segment.value[i]]);
        }
      }
    }
    // Encode segment variant as 0
    // (We're adding +1 here to introduce 0 as a special value indicating Huffman)
    huffmanNumber *= BigInt(subalphabets.length + 1);
    // If no subalphabet fits this segment, Huffman is the only option.
    // Encoding a character missing from the subalphabet would produce the
    // value 0, which the decoder treats as the end of the segment.
    if (!subalphabet) {
      number = huffmanNumber;
      continue;
    }
    // Compute number after encoding with chosen subalphabet
    const subalphabetLength = BigInt(subalphabet.length + 1);
    let subalphabetNumber = firstIteration ? number : number * subalphabetLength;
    for (let i = segment.value.length - 1; i >= 0; i--) {
      subalphabetNumber *= subalphabetLength;
      subalphabetNumber += BigInt(subalphabet.indexOf(segment.value[i]) + 1);
    }
    // Encode segment variant as subalphabet index + 1
    subalphabetNumber *= BigInt(subalphabets.length + 1);
    subalphabetNumber += BigInt(subalphabetIndex + 1);
    // Compare candidate numbers, pick smallest one
    if (huffmanNumber < subalphabetNumber) {
      number = huffmanNumber;
    } else {
      number = subalphabetNumber;
    }
  }

  // Encode type of first path segment
  if (pathSegments.length > 0) {
    number *= 3n;
    if (pathSegments[0].type === "query") {
      number += 1n;
    } else if (pathSegments[0].type === "hash") {
      number += 2n;
    }
  }

  // Encode IPv6 literal, SLD + subdomain, or full hostname
  if (isIPv6) {
    const ipv6Number = ipv6ToNumber(hostname.slice(1, -1));

    number <<= 128n;
    number += ipv6Number;

    // An END as the first hostname symbol marks an IPv6 literal.
    number = huffmanEncode(number, domainEncode["END"]);
  } else if (!knownSLD) {
    // Write stopping token only if path follows
    if (pathSegments.length > 0) number = huffmanEncode(number, domainEncode["END"]);
    for (let i = hostname.length - 1; i >= 0; i --) {
      number = huffmanEncode(number, domainEncode[hostname[i]]);
    }
  } else {
    // Encode subdomain
    if (subdomain) {
      // Write stopping token only if path follows
      if (pathSegments.length > 0) number = huffmanEncode(number, domainEncode["END"]);
      for (let i = subdomain.length - 1; i >= 0; i--) {
        number = huffmanEncode(number, domainEncode[subdomain[i]]);
      }
    }
    // Encode Huffman code of known SLD
    number = huffmanEncode(number, sldEncode[knownSLD]);
  }

  // Indicate presence of known SLD and optional subdomain
  if (knownSLD) {
    number <<= 1n;
    if (subdomain) number += 1n;
  }
  number <<= 1n;
  if (knownSLD) number += 1n;

  // Encode "index.html"/"index.php" suffix
  number <<= 1n;
  if (hasIndexPHP) number += 1n;
  if (hasIndexHTML || hasIndexPHP) {
    number <<= 1n;
    number += 1n;
  }
  // Encode protocol
  number <<= 1n;
  if (isHTTPS) number += 1n;
  // Encode "www." prefix
  number <<= 1n;
  if (hasWWW) number += 1n;
  // Encode TLD
  number = huffmanEncode(number, tldEncode[tld] || tldEncode[""] || "");
  // Encode port number
  if (port) {
    number *= 65536n;
    number += port;
  }
  number <<= 1n;
  if (port) number += 1n;

  // Encode version number
  for (let i = 0; i < VERSION; i ++) {
    number <<= 1n;
    number += 1n;
  }
  number <<= 1n;

  return numberToString(number, alphabet);
}

/**
 * Decodes and decompresses the payload assuming the given alphabet and
 * produces a full link.
 * @param {string} input Compressed payload
 * @param {string[]} alphabet Ordered alphabet used by payload
 * @returns {string} Full link containing payload contents.
 */
export function decompress (input: string, alphabet: string[]): string {
  let number = stringToNumber(input, alphabet);

  // Version number - currently unused
  let version = 0;
  while (number & 1n) {
    version ++;
    number >>= 1n;
  }
  number >>= 1n;

  // Decode port number
  const hasPort = number & 1n;
  number >>= 1n;
  let port;
  if (hasPort) {
    port = number % 65536n;
    number /= 65536n;
  }
  // Decode TLD
  const tldDecodeResult = huffmanDecode(number, tldDecode);
  number = tldDecodeResult.newNumber;
  const tld = tldDecodeResult.digit;
  // Decode "www." prefix
  const hasWWW = number & 1n;
  number >>= 1n;
  // Decode protocol
  const isHTTPS = number & 1n;
  number >>= 1n;
  // Decode "index.html"/"index.php" suffix
  let indexSuffix = "";
  if (number & 1n) {
    number >>= 1n;
    if (number & 1n) {
      indexSuffix = "/index.php";
    } else {
      indexSuffix = "/index.html";
    }
  }
  number >>= 1n;
  // Determine domain format
  const hasKnownSLD = number & 1n;
  number >>= 1n;
  let hasSubdomain = false;
  if (hasKnownSLD) {
    hasSubdomain = Boolean(number & 1n);
    number >>= 1n;
  }

  let domain = "";
  let subdomain = "";
  let path = "";

  if (hasKnownSLD) {
    const sldDecodeResult = huffmanDecode(number, sldDecode);
    number = sldDecodeResult.newNumber;
    domain = sldDecodeResult.digit;
    if (hasSubdomain) {
      while (number > 1n) {
        const { newNumber, digit } = huffmanDecode(number, domainDecode);
        number = newNumber;
        if (digit === "END") break;
        subdomain += digit;
      }
    }
  } else {
    const { newNumber, digit } = huffmanDecode(number, domainDecode);
    number = newNumber;

    if (digit === "END") {
      const ipv6Number = number & ((1n << 128n) - 1n);
      number >>= 128n;

      domain = `[${numberToIPv6(ipv6Number)}]`;
    } else {
      domain += digit;

      while (number > 1n) {
        const nextDigit = huffmanDecode(number, domainDecode);
        number = nextDigit.newNumber;
        if (nextDigit.digit === "END") break;
        domain += nextDigit.digit;
      }
    }
  }

  const segmentTypes = ["path", "query", "hash"] as const;
  let currentSegmentType = segmentTypes[Number(number % 3n)] ?? "path";
  number /= 3n;

  let queryParamIndex = 0;

  while (number > 1n) {
    if (currentSegmentType === "path") {
      path += "/";
    } else if (currentSegmentType === "hash") {
      path += "#";
    } else {
      if (queryParamIndex % 2) {
        path += "=";
      } else if (queryParamIndex === 0) {
        path += "?";
      } else {
        path += "&";
      }
      queryParamIndex ++;
    }
    // Get path segment variant
    const variant = Number(number % BigInt(subalphabets.length + 1));
    number /= BigInt(subalphabets.length + 1);
    // Variant 0 is Huffman code, rest are subalphabets
    if (variant === 0) {
      while (number > 1n) {
        const { newNumber, digit } = huffmanDecode(number, pathDecode);
        number = newNumber;
        if (digit === "#" && currentSegmentType !== "hash") break;
        path += digit;
        if (digit === "%") {
          const byte = number % 256n;
          path += byte.toString(16).padStart(2, "0");
          number /= 256n;
        }
      }
    } else {
      const subalphabet = subalphabets[variant - 1];
      const subalphabetLength = BigInt(subalphabet.length + 1);
      while (number > 1n) {
        const index = Number(number % subalphabetLength);
        number /= subalphabetLength;
        if (index === 0) break;
        path += subalphabet[index - 1];
      }
    }
    // Handle changing between path segment types, unless we're in the
    // middle of decoding a query parameter key/value pair, in which
    // case switching to the hash value doesn't make sense.
    if (queryParamIndex % 2) continue;
    if (number & 1n) { // Changing segment type?
      if (currentSegmentType === "path") {
        number >>= 1n;
        if (number & 1n) { // Skipping to hash?
          currentSegmentType = "hash";
        } else {
          currentSegmentType = "query";
        }
      } else {
        currentSegmentType = "hash";
      }
    }
    number >>= 1n;
  }

  const pathSplitIndex = path.search(/[?#]/);
  const pathBeforeQuery = pathSplitIndex === -1 ? path : path.slice(0, pathSplitIndex);
  const pathFromQuery = pathSplitIndex === -1 ? "" : path.slice(pathSplitIndex);

  let output = ""
    + (isHTTPS ? "https://" : "http://")
    + (hasWWW ? "www." : "")
    + subdomain
    + domain
    + (tld ? "." + tld : "")
    + (hasPort ? ":" + port : "")
    + pathBeforeQuery
    + indexSuffix
    + pathFromQuery;

  return output;
}
