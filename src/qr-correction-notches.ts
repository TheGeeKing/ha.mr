export const CORRECTION_LEVELS = ["L", "M", "Q", "H"] as const;

export type CorrectionLetter = (typeof CORRECTION_LEVELS)[number];

export type CorrectionFit = {
  level: CorrectionLetter;
  version: number;
};

export type CorrectionNotch = CorrectionFit;

const CORRECTION_RANK: Record<CorrectionLetter, number> = {
  L: 0,
  M: 1,
  Q: 2,
  H: 3
};

/**
 * Collapse exact per-level fits into slider notches: one per version, at the
 * strongest correction that still fits, skipping larger versions that do not
 * raise the correction level.
 */
export function correctionNotchesFromFits(fits: readonly CorrectionFit[]): CorrectionNotch[] {
  const strongestByVersion = new Map<number, CorrectionLetter>();
  for (const fit of fits) {
    const current = strongestByVersion.get(fit.version);
    if (current === undefined || CORRECTION_RANK[fit.level] > CORRECTION_RANK[current]) {
      strongestByVersion.set(fit.version, fit.level);
    }
  }

  const notches: CorrectionNotch[] = [];
  let highestRank = Number.NEGATIVE_INFINITY;
  for (const [version, level] of [...strongestByVersion.entries()].sort(([a], [b]) => a - b)) {
    const rank = CORRECTION_RANK[level];
    if (rank > highestRank) {
      notches.push({ level, version });
      highestRank = rank;
    }
  }
  return notches;
}

export function pickCorrectionNotchIndex(
  notches: readonly CorrectionNotch[],
  requestedFloor: CorrectionLetter
): number {
  if (notches.length === 0) {
    return 0;
  }
  const floorRank = CORRECTION_RANK[requestedFloor];
  const index = notches.findIndex((notch) => CORRECTION_RANK[notch.level] >= floorRank);
  return index === -1 ? notches.length - 1 : index;
}
