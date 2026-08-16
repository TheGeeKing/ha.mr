import type { QRCodeToDataURLOptions, QRCodeSegment } from "qrcode";

declare global {
  const QRCode: {
    toDataURL(
      text: string | QRCodeSegment[],
      options: QRCodeToDataURLOptions,
      callback: (error: Error | null | undefined, url: string) => void
    ): void;
  };
}

export {};
