import { outputAlphabetASCII, outputAlphabetEmoji, outputAlphabetQR } from "./alphabets.js";
import { compress, decompress } from "./compress.js";

export interface CliIO {
  writeOutput: (message: string) => void;
  writeError: (message: string) => void;
}

/**
 * Runs the hamr command with runtime-independent arguments and output.
 */
export function runCli (args: string[], io: CliIO): number {
  const input = args[0]?.trim();
  const alphabetName = args[1]?.trim() || "ascii";
  const command = args[2]?.trim() || "encode";

  if (!input) {
    io.writeError("Usage: hamr <link> [ascii|qr|emoji] {decode|encode}");
    io.writeError('The final argument is optional and defaults to "encode".');
    return 1;
  }

  let payload = "";
  const normalizedInput = input.toLowerCase();
  if (normalizedInput.startsWith("http://ha.mr")) {
    payload = input.slice(12);
  } else if (normalizedInput.startsWith("https://ha.mr")) {
    payload = input.slice(13);
  } else if (normalizedInput.startsWith("ha.mr")) {
    payload = input.slice(5);
  } else if (command === "decode") {
    const hashPosition = input.indexOf("#");
    payload = input.slice(hashPosition);
    io.writeOutput(`Payload: ${payload}`);
  }

  if (payload || command === "decode") {
    const isQRCode = payload.startsWith("/");
    payload = payload.slice(1);
    const isEmoji = Array.from(payload).some(character => !outputAlphabetASCII.includes(character));
    const alphabet = isQRCode
      ? outputAlphabetQR
      : isEmoji
        ? outputAlphabetEmoji
        : outputAlphabetASCII;
    io.writeOutput(decompress(payload, alphabet));
    return 0;
  }

  const alphabets = {
    ascii: outputAlphabetASCII,
    emoji: outputAlphabetEmoji,
    qr: outputAlphabetQR
  } as const;
  const alphabet = alphabets[alphabetName as keyof typeof alphabets];

  if (!alphabet) {
    io.writeError(`Unknown alphabet "${alphabetName}".`);
    io.writeError("Select one of: ascii, qr, emoji");
    return 2;
  }

  const compressed = compress(input, alphabet);
  io.writeOutput(alphabetName === "qr"
    ? `HTTP://HA.MR/${compressed}`
    : `http://ha.mr#${compressed}`);
  return 0;
}
