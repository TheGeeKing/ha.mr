class Utf8TextEncoder {
  encode (input = ""): Uint8Array {
    const bytes: number[] = [];

    for (const character of input) {
      let codePoint = character.codePointAt(0) ?? 0;
      if (codePoint >= 0xD800 && codePoint <= 0xDFFF) codePoint = 0xFFFD;

      if (codePoint <= 0x7F) {
        bytes.push(codePoint);
      } else if (codePoint <= 0x7FF) {
        bytes.push(0xC0 | (codePoint >> 6), 0x80 | (codePoint & 0x3F));
      } else if (codePoint <= 0xFFFF) {
        bytes.push(
          0xE0 | (codePoint >> 12),
          0x80 | ((codePoint >> 6) & 0x3F),
          0x80 | (codePoint & 0x3F)
        );
      } else {
        bytes.push(
          0xF0 | (codePoint >> 18),
          0x80 | ((codePoint >> 12) & 0x3F),
          0x80 | ((codePoint >> 6) & 0x3F),
          0x80 | (codePoint & 0x3F)
        );
      }
    }

    return Uint8Array.from(bytes);
  }
}

class Utf8TextDecoder {
  decode (input = new Uint8Array()): string {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const characters: string[] = [];

    for (let index = 0; index < bytes.length;) {
      const firstByte = bytes[index] ?? 0;
      let codePoint = firstByte;
      let byteCount = 1;
      let minimumCodePoint = 0;

      if (firstByte >= 0xC2 && firstByte <= 0xDF) {
        codePoint = firstByte & 0x1F;
        byteCount = 2;
        minimumCodePoint = 0x80;
      } else if (firstByte >= 0xE0 && firstByte <= 0xEF) {
        codePoint = firstByte & 0x0F;
        byteCount = 3;
        minimumCodePoint = 0x800;
      } else if (firstByte >= 0xF0 && firstByte <= 0xF4) {
        codePoint = firstByte & 0x07;
        byteCount = 4;
        minimumCodePoint = 0x10000;
      } else if (firstByte > 0x7F) {
        characters.push("\uFFFD");
        index++;
        continue;
      }

      let isValid = index + byteCount <= bytes.length;
      for (let offset = 1; isValid && offset < byteCount; offset++) {
        const continuationByte = bytes[index + offset] ?? 0;
        isValid = (continuationByte & 0xC0) === 0x80;
        codePoint = (codePoint << 6) | (continuationByte & 0x3F);
      }

      if (
        !isValid ||
        codePoint < minimumCodePoint ||
        codePoint > 0x10FFFF ||
        (codePoint >= 0xD800 && codePoint <= 0xDFFF)
      ) {
        characters.push("\uFFFD");
        index++;
        continue;
      }

      characters.push(String.fromCodePoint(codePoint));
      index += byteCount;
    }

    return characters.join("");
  }
}

if (!("TextEncoder" in globalThis)) {
  Object.assign(globalThis, { TextEncoder: Utf8TextEncoder });
}

if (!("TextDecoder" in globalThis)) {
  Object.assign(globalThis, { TextDecoder: Utf8TextDecoder });
}
