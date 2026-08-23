import assert from "node:assert/strict";
import { test } from "node:test";
import { correction, generate, mode } from "lean-qr";

import {
  correctionNotchesFromFits,
  pickCorrectionNotchIndex
} from "../dist/qr-correction-notches.js";

test("correctionNotchesFromFits keeps the strongest level per version", () => {
  assert.deepEqual(
    correctionNotchesFromFits([
      { level: "L", version: 2 },
      { level: "M", version: 3 },
      { level: "Q", version: 3 },
      { level: "H", version: 4 }
    ]),
    [
      { level: "L", version: 2 },
      { level: "Q", version: 3 },
      { level: "H", version: 4 }
    ]
  );
});

test("correctionNotchesFromFits drops a weaker level when it shares a version", () => {
  assert.deepEqual(
    correctionNotchesFromFits([
      { level: "L", version: 2 },
      { level: "M", version: 2 },
      { level: "Q", version: 3 }
    ]),
    [
      { level: "M", version: 2 },
      { level: "Q", version: 3 }
    ]
  );
});

test("correctionNotchesFromFits collapses to one notch when H fits the smallest version", () => {
  assert.deepEqual(
    correctionNotchesFromFits([
      { level: "L", version: 1 },
      { level: "M", version: 1 },
      { level: "Q", version: 1 },
      { level: "H", version: 1 }
    ]),
    [{ level: "H", version: 1 }]
  );
});

test("pickCorrectionNotchIndex prefers the first notch that meets the requested floor", () => {
  const notches = [
    { level: "L", version: 2 },
    { level: "Q", version: 3 },
    { level: "H", version: 4 }
  ];
  assert.equal(pickCorrectionNotchIndex(notches, "L"), 0);
  assert.equal(pickCorrectionNotchIndex(notches, "M"), 1);
  assert.equal(pickCorrectionNotchIndex(notches, "Q"), 1);
  assert.equal(pickCorrectionNotchIndex(notches, "H"), 2);
});

test("pickCorrectionNotchIndex uses the strongest available notch when the floor cannot be met", () => {
  assert.equal(pickCorrectionNotchIndex([{ level: "L", version: 10 }], "M"), 0);
  assert.equal(
    pickCorrectionNotchIndex(
      [
        { level: "L", version: 2 },
        { level: "Q", version: 3 }
      ],
      "H"
    ),
    1
  );
});

test("lean-qr fits that share a version collapse M into Q", () => {
  const payload = "A".repeat(21);
  const fits = [];
  for (const level of ["L", "M", "Q", "H"]) {
    const qrCode = generate(mode.alphaNumeric(payload), {
      minVersion: 1,
      maxVersion: 40,
      minCorrectionLevel: correction[level],
      maxCorrectionLevel: correction[level]
    });
    fits.push({ level, version: (qrCode.size - 17) / 4 });
  }

  assert.deepEqual(fits, [
    { level: "L", version: 1 },
    { level: "M", version: 2 },
    { level: "Q", version: 2 },
    { level: "H", version: 3 }
  ]);
  assert.deepEqual(correctionNotchesFromFits(fits), [
    { level: "L", version: 1 },
    { level: "Q", version: 2 },
    { level: "H", version: 3 }
  ]);
});
