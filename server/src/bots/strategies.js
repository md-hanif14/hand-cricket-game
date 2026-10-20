import { randomInt } from 'node:crypto';

const randomMove = () => randomInt(1, 6);
const randomIndex = (length) => randomInt(0, length);

function tally(values) {
  const counts = [0, 0, 0, 0, 0, 0];
  for (const value of values) if (Number.isInteger(value) && value >= 1 && value <= 5) counts[value] += 1;
  return counts;
}

function mostCommon(values) {
  const counts = tally(values);
  const maximum = Math.max(...counts.slice(1));
  const candidates = [1, 2, 3, 4, 5].filter((n) => counts[n] === maximum);
  return candidates[randomIndex(candidates.length)];
}

function leastCommon(values) {
  const counts = tally(values);
  const minimum = Math.min(...counts.slice(1));
  const candidates = [1, 2, 3, 4, 5].filter((n) => counts[n] === minimum);
  return candidates[randomIndex(candidates.length)];
}

/**
 * Choose a hidden bot move using only completed rounds.
 * On its bowling turn, it tries to predict the human batter's number.
 * On its batting turn, it tries to avoid numbers the human bowler often uses.
 */
export function chooseBotMove(match, botId = 'bot') {
  const difficulty = match.difficulty ?? 'easy';
  const battingPlayerId = match.innings[match.inningsIndex]?.battingPlayerId;
  const botIsBatting = battingPlayerId === botId;
  const rounds = (match.moveHistory ?? []).filter((round) => {
    if (botIsBatting) return round.battingPlayerId === botId && !round.bowlerAuto;
    return round.battingPlayerId !== botId && !round.batterAuto;
  });
  const observed = rounds.map((round) => (botIsBatting ? round.bowlerMove : round.batterMove));

  if (difficulty === 'easy' || observed.length === 0) return randomMove();
  if (difficulty === 'medium') {
    if (randomInt(0, 100) < 40) return randomMove();
    return botIsBatting ? leastCommon(observed) : mostCommon(observed);
  }
  if (difficulty === 'hard') {
    if (randomInt(0, 100) < 15) return randomMove();
    return botIsBatting ? leastCommon(observed) : mostCommon(observed);
  }
  return randomMove();
}

export function chooseBotToss() {
  return randomInt(0, 2) === 0 ? 'bat' : 'bowl';
}
