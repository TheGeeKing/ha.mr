import { outputAlphabetASCII, outputAlphabetEmoji, outputAlphabetQR } from "./alphabets.js";
import { compress, decompress } from "./compress.js";
import {
  CORRECTION_LEVELS,
  type CorrectionFit,
  type CorrectionLetter,
  type CorrectionNotch,
  correctionNotchesFromFits,
  pickCorrectionNotchIndex
} from "./qr-correction-notches.js";
import { rewriteUrl, type UrlRewriteResult } from "./url-rewrites.js";

let domain = window.location.hostname;
if (domain !== "ha.mr" && domain !== "www.ha.mr") {
  console.log(
    `This page is intended to be used on the ha.mr domain. You are currently on ${domain}.`
  );
}
const webPort = window.location.port;
if (webPort && webPort !== "80" && webPort !== "443") {
  domain += `:${webPort}`;
}

type SettingName = "emoji" | "qr";

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

const settings: Record<SettingName, boolean> = {
  emoji: false,
  qr: false
};

const settingsElements: Record<SettingName, string> = {
  emoji: "#settings-emoji",
  qr: "#settings-qr"
};

for (const setting of Object.keys(settingsElements) as SettingName[]) {
  const element = requiredElement<HTMLInputElement>(settingsElements[setting]);
  settings[setting] = element.checked;
  element.addEventListener("change", () => {
    settings[setting] = element.checked;
    updateOutput();
  });
}

function countSymbols(string: string, alphabet: string[]): number {
  let count = 0;
  while (string) {
    const symbol = alphabet.find((c) => string.endsWith(c));
    string = string.slice(0, symbol ? -symbol.length : -1);
    count++;
  }
  return count;
}

const inputLinkElement = requiredElement<HTMLInputElement>("#input-link");
const outputLinkElement = requiredElement<HTMLAnchorElement>("#output-link");
const outputRatioElement = requiredElement<HTMLElement>("#output-ratio");
const queryWarningElement = requiredElement<HTMLElement>("#query-warning");
const rewriteWarningElement = requiredElement<HTMLDetailsElement>("#rewrite-warning");
const rewriteToElement = requiredElement<HTMLElement>("#rewrite-to");
const keepLosslessElement = requiredElement<HTMLButtonElement>("#keep-lossless");

const qrCodeCanvas = requiredElement<HTMLCanvasElement>("#qrcode");
const qrCodeCorrectionLevelContainer = requiredElement<HTMLElement>("#qr-correct-level-container");
const qrCodeCorrectionLevelElement = requiredElement<HTMLInputElement>("#qr-correct-level");
const qrCodeCorrectionLevelTicks = requiredElement<HTMLElement>("#qr-correct-level-ticks");

let requestedCorrectionFloor: CorrectionLetter = "M";
let correctionNotches: CorrectionNotch[] = [];

qrCodeCorrectionLevelElement.addEventListener("input", () => {
  const notch = correctionNotches[Number(qrCodeCorrectionLevelElement.value)];
  if (notch) {
    requestedCorrectionFloor = notch.level;
  }
  updateOutput();
});

let qrCodeLibraryPromise: Promise<typeof import("lean-qr")> | undefined;
let outputRevision = 0;
let preferLossless = false;
let losslessForInput = "";

function qrVersionFromSize(size: number): number {
  return (size - 17) / 4;
}

function correctionNotchesForPayload(
  qrCodeLibrary: typeof import("lean-qr"),
  qrCodeLink: string
): CorrectionNotch[] {
  const encoded = qrCodeLibrary.mode.alphaNumeric(qrCodeLink);
  const fits: CorrectionFit[] = [];
  for (const level of CORRECTION_LEVELS) {
    try {
      const qrCode = qrCodeLibrary.generate(encoded, {
        minVersion: 1,
        maxVersion: 40,
        minCorrectionLevel: qrCodeLibrary.correction[level],
        maxCorrectionLevel: qrCodeLibrary.correction[level]
      });
      fits.push({ level, version: qrVersionFromSize(qrCode.size) });
    } catch {
      // This exact correction level cannot encode the payload.
    }
  }
  return correctionNotchesFromFits(fits);
}

function syncCorrectionLevelControl(notches: CorrectionNotch[], selectedIndex: number): void {
  correctionNotches = notches;
  qrCodeCorrectionLevelElement.min = "0";
  qrCodeCorrectionLevelElement.max = String(Math.max(notches.length - 1, 0));
  qrCodeCorrectionLevelElement.step = "1";
  qrCodeCorrectionLevelElement.value = String(selectedIndex);
  qrCodeCorrectionLevelElement.disabled = notches.length < 2;
  const selected = notches[selectedIndex];
  if (selected) {
    qrCodeCorrectionLevelElement.setAttribute(
      "aria-valuetext",
      `${selected.level}, version ${selected.version}`
    );
  }
  qrCodeCorrectionLevelTicks.style.justifyContent = notches.length < 2 ? "center" : "space-between";
  qrCodeCorrectionLevelTicks.replaceChildren(
    ...notches.map((notch) => {
      const tick = document.createElement("span");
      tick.textContent = notch.level;
      tick.title = `Version ${notch.version}`;
      return tick;
    })
  );
}

function loadQrCodeLibrary(): Promise<typeof import("lean-qr")> {
  qrCodeLibraryPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "lean-qr.js";
    script.onload = () => resolve(LeanQr);
    script.onerror = () => reject(new Error("Failed to load QR code generator"));
    document.head.append(script);
  });

  return qrCodeLibraryPromise;
}

async function updateOutput(): Promise<void> {
  const revision = ++outputRevision;
  const input = inputLinkElement.value.trim();
  if (input !== losslessForInput) {
    preferLossless = false;
  }
  try {
    const alphabet = settings.emoji ? outputAlphabetEmoji : outputAlphabetASCII;
    const rewrite: UrlRewriteResult = preferLossless
      ? { url: input, rewritten: false }
      : rewriteUrl(input);
    const toCompress = rewrite.url;
    const output = compress(toCompress, alphabet);
    let inputNormalized = input;
    const inputLower = input.toLowerCase();
    if (inputLower.startsWith("https://")) {
      inputNormalized = input.slice(8);
    } else if (inputLower.startsWith("http://")) {
      inputNormalized = input.slice(7);
    }
    let excessiveParams = false;
    if (URL.canParse(`http://${inputNormalized}`)) {
      const url = new URL(`http://${inputNormalized}`);
      if (url.searchParams.size > 1) {
        excessiveParams = true;
      }
    }
    if (rewrite.rewritten) {
      rewriteToElement.innerHTML = `<a href="${rewrite.url}" target="_blank" rel="noopener">${rewrite.url}</a>`;
      rewriteWarningElement.style.display = "block";
      rewriteWarningElement.open = true;
      queryWarningElement.style.display = "none";
    } else {
      rewriteWarningElement.style.display = "none";
      rewriteWarningElement.open = false;
      queryWarningElement.style.display = excessiveParams ? "inline" : "none";
    }
    const ratio = (1 - (countSymbols(output, alphabet) + 6) / inputNormalized.length) * 100;
    if (ratio < -300) {
      outputRatioElement.textContent = `Output is much larger than the input`;
      outputRatioElement.style.color = "rgb(255, 50, 50)";
    } else if (ratio < 0) {
      outputRatioElement.textContent = `Output is ${Math.floor(-ratio)}% larger than the input`;
      outputRatioElement.style.color = "rgb(255, 50, 50)";
    } else if (ratio > 0) {
      outputRatioElement.textContent = `Output is ${Math.ceil(ratio)}% smaller than the input`;
      outputRatioElement.style.color = "rgb(15, 190, 15)";
    } else {
      outputRatioElement.textContent = "Output is the same length as the input";
      outputRatioElement.style.color = "gray";
    }
    outputLinkElement.textContent = `http://${domain}#${output}`;
    outputLinkElement.href = `http://${domain}#${output}`;
    outputLinkElement.style.color = "";
    if (settings.qr) {
      const qrCodeLibrary = await loadQrCodeLibrary();
      if (!settings.qr || revision !== outputRevision) return;

      qrCodeCanvas.style.display = "inline";
      qrCodeCorrectionLevelContainer.style.display = "block";

      const qrCodeDomain = domain.toUpperCase();
      const qrCodeLink = `HTTP://${qrCodeDomain}/${compress(toCompress, outputAlphabetQR)}`;
      const notches = correctionNotchesForPayload(qrCodeLibrary, qrCodeLink);
      if (notches.length === 0) {
        throw new Error("QR code does not fit");
      }
      const selectedIndex = pickCorrectionNotchIndex(notches, requestedCorrectionFloor);
      syncCorrectionLevelControl(notches, selectedIndex);
      const selected = notches[selectedIndex];
      if (!selected) {
        throw new Error("QR code does not fit");
      }
      const qrCode = qrCodeLibrary.generate(qrCodeLibrary.mode.alphaNumeric(qrCodeLink), {
        minVersion: 1,
        maxVersion: 40,
        minCorrectionLevel: qrCodeLibrary.correction[selected.level],
        maxCorrectionLevel: qrCodeLibrary.correction[selected.level]
      });

      qrCode.toCanvas(qrCodeCanvas, {
        on: [0x00, 0x00, 0x00, 0xff],
        off: [0xff, 0xff, 0xff, 0xff],
        pad: 2
      });
      qrCodeCanvas.style.width = `${(qrCode.size + 8) * 8}px`;
      qrCodeCanvas.style.height = `${(qrCode.size + 8) * 8}px`;
      qrCodeCanvas.title = qrCodeLink;
    } else {
      qrCodeCanvas.style.display = "none";
      qrCodeCorrectionLevelContainer.style.display = "none";
    }
  } catch (e) {
    if (!input.trim()) {
      outputLinkElement.textContent = "Enter a link above to compress";
    } else {
      outputLinkElement.textContent = "Invalid link";
      outputLinkElement.style.color = "rgb(255, 50, 50)";
      console.error(e);
    }
    qrCodeCanvas.style.display = "none";
    qrCodeCorrectionLevelContainer.style.display = "none";
    outputRatioElement.style.color = "rgba(255, 255, 255, 0)";
    outputLinkElement.removeAttribute("href");
    queryWarningElement.style.display = "none";
    rewriteWarningElement.style.display = "none";
  }
}

const redirectContainerElement = requiredElement<HTMLElement>("#redirect-container");
const redirectLinkElement = requiredElement<HTMLAnchorElement>("#redirect-link");
const loaderElement = requiredElement<HTMLElement>("#loader");

function handleRedirectPrompt(target: string): void {
  loaderElement.style.display = "none";
  redirectContainerElement.style.display = "flex";
  redirectLinkElement.textContent = target;
  redirectLinkElement.href = target;
}

keepLosslessElement.addEventListener("click", () => {
  preferLossless = true;
  losslessForInput = inputLinkElement.value.trim();
  updateOutput();
});

inputLinkElement.addEventListener("input", () => {
  updateOutput();
});

(() => {
  let payload: string | null = null;
  let alphabet = outputAlphabetASCII;

  // Get hash value of current address bar
  if (window.location.hash) {
    // Decode hash value in case it's non-ASCII
    payload = decodeURIComponent(window.location.hash.slice(1));
    // Remove all whitespace - we never use whitespace when encoding hash values
    payload = payload.replaceAll(" ", "");
    // Check if input is pure ASCII - potentially unreliable?
    const useEmoji = Array.from(payload).some((c) => !outputAlphabetASCII.includes(c));
    alphabet = useEmoji ? outputAlphabetEmoji : outputAlphabetASCII;
  } else {
    // If no hash value, we're likely reading a QR code
    // For that, use the path instead
    payload = decodeURIComponent(window.location.pathname.slice(1));
    alphabet = outputAlphabetQR;
  }

  if (payload?.trim()) {
    try {
      const target = decompress(payload, alphabet);
      handleRedirectPrompt(target);
      return;
    } catch (e) {
      console.warn(`Redirect failed. Could not decode input.`);
      console.error(e);
    }
  }

  updateOutput();

  loaderElement.style.opacity = "0";
  requiredElement<HTMLElement>("#content").style.opacity = "1";
  requiredElement<HTMLElement>("#content").style.pointerEvents = "auto";
  requiredElement<HTMLElement>("header").style.opacity = "1";
  requiredElement<HTMLElement>("header").style.pointerEvents = "auto";
})();
