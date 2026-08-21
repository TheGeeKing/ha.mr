class Utf8TextEncoder {
  encode(input = ""): Uint8Array {
    const bytes: number[] = [];

    for (const character of input) {
      let codePoint = character.codePointAt(0) ?? 0;
      if (codePoint >= 0xd800 && codePoint <= 0xdfff) codePoint = 0xfffd;

      if (codePoint <= 0x7f) {
        bytes.push(codePoint);
      } else if (codePoint <= 0x7ff) {
        bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
      } else if (codePoint <= 0xffff) {
        bytes.push(
          0xe0 | (codePoint >> 12),
          0x80 | ((codePoint >> 6) & 0x3f),
          0x80 | (codePoint & 0x3f)
        );
      } else {
        bytes.push(
          0xf0 | (codePoint >> 18),
          0x80 | ((codePoint >> 12) & 0x3f),
          0x80 | ((codePoint >> 6) & 0x3f),
          0x80 | (codePoint & 0x3f)
        );
      }
    }

    return Uint8Array.from(bytes);
  }
}

class Utf8TextDecoder {
  decode(input = new Uint8Array()): string {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const characters: string[] = [];

    for (let index = 0; index < bytes.length; ) {
      const firstByte = bytes[index] ?? 0;
      let codePoint = firstByte;
      let byteCount = 1;
      let minimumCodePoint = 0;

      if (firstByte >= 0xc2 && firstByte <= 0xdf) {
        codePoint = firstByte & 0x1f;
        byteCount = 2;
        minimumCodePoint = 0x80;
      } else if (firstByte >= 0xe0 && firstByte <= 0xef) {
        codePoint = firstByte & 0x0f;
        byteCount = 3;
        minimumCodePoint = 0x800;
      } else if (firstByte >= 0xf0 && firstByte <= 0xf4) {
        codePoint = firstByte & 0x07;
        byteCount = 4;
        minimumCodePoint = 0x10000;
      } else if (firstByte > 0x7f) {
        characters.push("\uFFFD");
        index++;
        continue;
      }

      let isValid = index + byteCount <= bytes.length;
      for (let offset = 1; isValid && offset < byteCount; offset++) {
        const continuationByte = bytes[index + offset] ?? 0;
        isValid = (continuationByte & 0xc0) === 0x80;
        codePoint = (codePoint << 6) | (continuationByte & 0x3f);
      }

      if (
        !isValid ||
        codePoint < minimumCodePoint ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
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
