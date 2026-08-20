import { compress, decompress } from "./compress.js";
import {
  outputAlphabetASCII,
  outputAlphabetQR,
  outputAlphabetEmoji
} from "./alphabets.js";

let domain = window.location.hostname;
if (domain !== "ha.mr" && domain !== "www.ha.mr") {
  console.log(`This page is intended to be used on the ha.mr domain. You are currently on ${domain}.`);
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

function countSymbols (string: string, alphabet: string[]): number {
  let count = 0;
  while (string) {
    const symbol = alphabet.find(c => string.endsWith(c));
    string = string.slice(0, symbol ? -symbol.length : -1);
    count ++;
  }
  return count;
}

const inputLinkElement = requiredElement<HTMLInputElement>("#input-link");
const outputLinkElement = requiredElement<HTMLAnchorElement>("#output-link");
const outputRatioElement = requiredElement<HTMLElement>("#output-ratio");
const queryWarningElement = requiredElement<HTMLElement>("#query-warning");

const qrCodeCanvas = requiredElement<HTMLCanvasElement>("#qrcode");
const qrCodeCorrectionLevelContainer = requiredElement<HTMLElement>("#qr-correct-level-container");
const qrCodeCorrectionLevelElement = requiredElement<HTMLInputElement>("#qr-correct-level");

qrCodeCorrectionLevelElement.addEventListener("input", () => {
  updateOutput();
});

let qrCodeLibraryPromise: Promise<typeof import("lean-qr")> | undefined;
let outputRevision = 0;

function loadQrCodeLibrary (): Promise<typeof import("lean-qr")> {
  qrCodeLibraryPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "lean-qr.js";
    script.onload = () => resolve(LeanQr);
    script.onerror = () => reject(new Error("Failed to load QR code generator"));
    document.head.append(script);
  });

  return qrCodeLibraryPromise;
}

async function updateOutput (): Promise<void> {
  const revision = ++outputRevision;
  const input = inputLinkElement.value.trim();
  try {
    const alphabet = settings.emoji ? outputAlphabetEmoji : outputAlphabetASCII;
    const output = compress(input, alphabet);
    let inputNormalized = input;
    const inputLower = input.toLowerCase();
    if (inputLower.startsWith("https://")) {
      inputNormalized = input.slice(8);
    } else if (inputLower.startsWith("http://")) {
      inputNormalized = input.slice(7);
    }
    let excessiveParams = false;
    if (URL.canParse("http://" + inputNormalized)) {
      const url = new URL("http://" + inputNormalized);
      if (url.searchParams.size > 1) {
        excessiveParams = true;
      }
    }
    if (excessiveParams) {
      queryWarningElement.style.display = "inline";
    } else {
      queryWarningElement.style.display = "none";
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
      qrCodeCorrectionLevelContainer.style.display = "inline";

      const qrCodeDomain = domain.toUpperCase();
      const qrCodeLink = `HTTP://${qrCodeDomain}/${compress(input, outputAlphabetQR)}`;
      const correctionLevels = [
        qrCodeLibrary.correction.L,
        qrCodeLibrary.correction.M,
        qrCodeLibrary.correction.Q,
        qrCodeLibrary.correction.H
      ];
      const minimumCorrectionLevel =
        correctionLevels[Number(qrCodeCorrectionLevelElement.value)]
        ?? qrCodeLibrary.correction.M;
      const qrCode = qrCodeLibrary.generate(
        qrCodeLibrary.mode.alphaNumeric(qrCodeLink),
        {
          minVersion: 1,
          maxVersion: 40,
          minCorrectionLevel: minimumCorrectionLevel,
          maxCorrectionLevel: qrCodeLibrary.correction.H
        }
      );

      qrCode.toCanvas(qrCodeCanvas, {
        on: [0x00, 0x00, 0x00, 0xFF],
        off: [0xFF, 0xFF, 0xFF, 0xFF],
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
  }
}

const redirectContainerElement = requiredElement<HTMLElement>("#redirect-container");
const redirectLinkElement = requiredElement<HTMLAnchorElement>("#redirect-link");
const loaderElement = requiredElement<HTMLElement>("#loader");

function handleRedirectPrompt (target: string): void {
  loaderElement.style.display = "none";
  redirectContainerElement.style.display = "flex";
  redirectLinkElement.textContent = target;
  redirectLinkElement.href = target;
}

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
    const useEmoji = Array.from(payload).some(c => !outputAlphabetASCII.includes(c));
    alphabet = useEmoji ? outputAlphabetEmoji : outputAlphabetASCII;
  } else {
    // If no hash value, we're likely reading a QR code
    // For that, use the path instead
    payload = decodeURIComponent(window.location.pathname.slice(1));
    alphabet = outputAlphabetQR;
  }

  if (payload && payload.trim()) {
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
