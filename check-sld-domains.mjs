import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { Resolver } from "node:dns/promises";

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Common final labels tried after an SLD. Huffman SLDs are stored without the
 * last TLD (`en.wikipedia` + `org`, `bbc.co` + `uk`), so these reconstruct
 * likely hostnames. Most live names hit `.com` in the first wave.
 */
const IANA_TLD_LIST_URL = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";
const TLD_WAVES = [
  ["com"],
  ["org", "net"],
  [""],
  [
    "edu", "gov", "mil", "io", "uk", "au", "jp", "ca", "de", "co", "us",
    "fr", "it", "nl", "br", "in", "ru", "info", "me", "tv", "cc", "app",
    "dev", "ai", "ch", "se", "no", "es", "pl", "nz", "kr", "mx", "ie",
    "be", "at", "dk", "fi", "za", "id", "tw", "cn", "hk", "sg"
  ]
];

const { values: options } = parseArgs({
  options: {
    concurrency: { type: "string", default: "40" },
    timeout: { type: "string", default: "2500" },
    limit: { type: "string" },
    only: { type: "string" },
    json: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false }
  }
});

if (options.help) {
  console.log(`Usage: node check-sld-domains.mjs [options]

Check Huffman dictionary names: TLDs against the IANA root list,
and SLDs by reconstructing hostnames and resolving them in DNS.

Options:
  --concurrency <n>  Parallel DNS lookups (default: 40)
  --timeout <ms>     Per-lookup DNS timeout (default: 2500)
  --limit <n>        Only check the first n SLD names
  --only <sld|tld>   Run only one dictionary check
  --json             Print a JSON report
  -h, --help         Show this help
`);
  process.exit(0);
}

if (options.only !== undefined && options.only !== "sld" && options.only !== "tld") {
  throw new Error('--only must be "sld" or "tld"');
}

const concurrency = positiveInteger(options.concurrency, "--concurrency");
const timeoutMs = positiveInteger(options.timeout, "--timeout");
const limit = options.limit === undefined
  ? Infinity
  : positiveInteger(options.limit, "--limit");

const dictionaries = JSON.parse(
  readFileSync(join(root, "compression-dictionaries.json"), "utf8")
);
const slds = Object.keys(dictionaries.sld)
  .filter(Boolean)
  .slice(0, Number.isFinite(limit) ? limit : undefined);

const resolver = new Resolver({ timeout: timeoutMs, tries: 1 });
resolver.setServers(["1.1.1.1", "8.8.8.8"]);

const limitLookup = createLimiter(concurrency);
const resolvedHostnames = new Map();
const inflightLookups = new Map();
let completedLookups = 0;

async function main () {
  const report = {};
  if (options.only !== "sld") report.tld = await checkTlds();
  if (options.only !== "tld") report.sld = await checkSlds();

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (report.tld) printTldReport(report.tld);
  if (report.sld) {
    if (report.tld) console.log("");
    printSldReport(report.sld);
  }
}

async function checkTlds () {
  const iana = await readIanaTlds();
  const dictionaryTlds = Object.keys(dictionaries.tld);
  const fallbackCount = dictionaryTlds.filter(tld => tld === "").length;
  const tlds = dictionaryTlds.filter(Boolean);
  const notUseful = tlds.filter(tld => !iana.names.has(tld)).sort();
  const useful = tlds.filter(tld => iana.names.has(tld)).sort();
  const missingFromDictionary = [...iana.names]
    .filter(tld => !(tld in dictionaries.tld))
    .sort();
  const total = tlds.length;
  const notUsefulPercent = total === 0 ? 0 : (notUseful.length / total) * 100;

  return {
    total,
    fallbackCount,
    useful: useful.length,
    notUseful: notUseful.length,
    notUsefulPercent: Number(notUsefulPercent.toFixed(1)),
    notUsefulNames: notUseful,
    ianaCount: iana.names.size,
    ianaVersion: iana.version,
    missingFromDictionary
  };
}

async function readIanaTlds () {
  const response = await fetch(IANA_TLD_LIST_URL, {
    signal: AbortSignal.timeout(Math.max(timeoutMs, 15_000))
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch IANA TLD list: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split(/\r?\n/);
  const version = lines.find(line => line.startsWith("#"))?.replace(/^#\s*/, "") || "";
  const names = new Set(
    lines
      .filter(line => line && !line.startsWith("#"))
      .map(line => line.trim().toLowerCase())
  );
  if (names.size === 0) throw new Error("IANA TLD list was empty");
  return { names, version };
}

async function checkSlds () {
  const remaining = new Set(slds);
  const useful = new Map();

  logProgress(remaining.size, slds.length);

  for (const suffixes of TLD_WAVES) {
    if (remaining.size === 0) break;

    await Promise.all([...remaining].map(async sld => {
      const hostname = await findResolvingHostname(sld, suffixes);
      if (!hostname) return;
      useful.set(sld, hostname);
      remaining.delete(sld);
      logProgress(remaining.size, slds.length);
    }));

    logProgress(remaining.size, slds.length);
  }

  process.stderr.write("\n");

  const notUseful = [...remaining].sort();
  const usefulEntries = [...useful.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sld, hostname]) => ({ sld, hostname }));
  const total = slds.length;
  const notUsefulPercent = total === 0 ? 0 : (notUseful.length / total) * 100;

  return {
    total,
    useful: usefulEntries.length,
    notUseful: notUseful.length,
    notUsefulPercent: Number(notUsefulPercent.toFixed(1)),
    usefulNames: usefulEntries,
    notUsefulNames: notUseful
  };
}

function printTldReport (report) {
  console.log(`Huffman TLD dictionary: ${report.total} names`);
  if (report.fallbackCount) {
    console.log(`Empty fallback symbol:  ${report.fallbackCount} (not a TLD; used when the hostname TLD is unknown)`);
  }
  console.log(`IANA root list:         ${report.ianaCount} (${report.ianaVersion})`);
  console.log(`Useful (still in IANA): ${report.useful} (${(100 - report.notUsefulPercent).toFixed(1)}%)`);
  console.log(`Not useful:             ${report.notUseful} (${report.notUsefulPercent.toFixed(1)}%)`);

  if (report.notUsefulNames.length > 0) {
    console.log("\nNot useful TLDs:");
    for (const tld of report.notUsefulNames) {
      console.log(`  ${tld}`);
    }
  }

  if (report.missingFromDictionary.length === 0) return;

  console.log("\nIANA TLDs missing from the dictionary:");
  for (const tld of report.missingFromDictionary) {
    console.log(`  ${tld}`);
  }
}

function printSldReport (report) {
  console.log(`Huffman SLD dictionary: ${report.total} names`);
  console.log(`Useful (DNS resolves):  ${report.useful} (${(100 - report.notUsefulPercent).toFixed(1)}%)`);
  console.log(`Not useful:             ${report.notUseful} (${report.notUsefulPercent.toFixed(1)}%)`);

  if (report.notUsefulNames.length === 0) return;

  console.log("\nNot useful names:");
  for (const sld of report.notUsefulNames) {
    console.log(`  ${sld}`);
  }
}

async function findResolvingHostname (sld, suffixes) {
  const tried = new Set();
  for (const suffix of suffixes) {
    const hostname = hostnameFor(sld, suffix);
    if (!hostname || tried.has(hostname)) continue;
    tried.add(hostname);
    const address = await limitLookup(() => lookupAddress(hostname));
    if (address) return hostname;
  }
  return "";
}

function hostnameFor (sld, suffix) {
  if (!suffix) return sld;
  if (sld === suffix || sld.endsWith(`.${suffix}`)) return sld;
  return `${sld}.${suffix}`;
}

async function lookupAddress (hostname) {
  if (resolvedHostnames.has(hostname)) return resolvedHostnames.get(hostname);
  if (inflightLookups.has(hostname)) return inflightLookups.get(hostname);

  const lookup = (async () => {
    try {
      try {
        const [address] = await resolver.resolve4(hostname);
        resolvedHostnames.set(hostname, address);
        return address;
      } catch {
        const [address] = await resolver.resolve6(hostname);
        resolvedHostnames.set(hostname, address);
        return address;
      }
    } catch {
      resolvedHostnames.set(hostname, "");
      return "";
    } finally {
      completedLookups++;
      inflightLookups.delete(hostname);
    }
  })();

  inflightLookups.set(hostname, lookup);
  return lookup;
}

function logProgress (remaining, total) {
  const checked = total - remaining;
  process.stderr.write(
    `\rChecked ${checked}/${total} SLDs (${completedLookups} DNS lookups)`
  );
}

function createLimiter (max) {
  let active = 0;
  const queue = [];

  const dequeue = () => {
    if (active >= max || queue.length === 0) return;
    active++;
    const { run, resolve, reject } = queue.shift();
    Promise.resolve()
      .then(run)
      .then(resolve, reject)
      .finally(() => {
        active--;
        dequeue();
      });
  };

  return function limit (run) {
    return new Promise((resolve, reject) => {
      queue.push({ run, resolve, reject });
      dequeue();
    });
  };
}

function positiveInteger (value, flag) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
