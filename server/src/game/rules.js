import { randomInt } from 'node:crypto';

/** Generate a fair server-side fallback move in the inclusive range 1..5. */
export function randomMove() {
  return randomInt(1, 6);
}

/** Resolve a single hand-cricket delivery. Matching hands mean a wicket. */
export function resolveRound(batterMove, bowlerMove) {
  for (const move of [batterMove, bowlerMove]) {
    if (!Number.isInteger(move) || move < 1 || move > 5) {
      throw new TypeError('Moves must be integers from 1 to 5.');
    }
  }

  if (batterMove === bowlerMove) {
    return { runs: 0, wicket: true };
  }
  return { runs: batterMove, wicket: false };
}

export function getTarget(firstInningsRuns) {
  if (!Number.isInteger(firstInningsRuns) || firstInningsRuns < 0) {
    throw new TypeError('First-innings runs must be a non-negative integer.');
  }
  return firstInningsRuns + 1;
}
