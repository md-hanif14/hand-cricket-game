import { getTarget, resolveRound } from './rules.js';

/** Mutates the active match with one already-validated round result. */
export function applyRound(match, batterMove, bowlerMove) {
  if (match.status !== 'playing') throw new Error('The match is not accepting moves.');
  const innings = match.innings[match.inningsIndex];
  if (!innings) throw new Error('The current innings does not exist.');

  const result = resolveRound(batterMove, bowlerMove);
  if (result.wicket) innings.wickets += 1;
  else innings.runs += result.runs;

  const battingPlayerId = innings.battingPlayerId;
  const bowlingPlayerId = match.players.find((player) => player.id !== battingPlayerId)?.id;
  let transition = 'continue';

  if (match.inningsIndex === 1 && innings.runs >= match.target) {
    match.status = 'completed';
    match.winnerId = battingPlayerId;
    match.result = `${match.players.find((player) => player.id === battingPlayerId)?.name ?? 'The chasing player'} reached the target.`;
    match.completedAt = new Date().toISOString();
    transition = 'target-reached';
  } else if (innings.wickets >= match.wicketsLimit) {
    if (match.inningsIndex === 0) {
      match.status = 'inningsBreak';
      match.target = getTarget(innings.runs);
      transition = 'innings-ended';
    } else {
      match.status = 'completed';
      match.winnerId = match.innings[0].battingPlayerId;
      match.result = `${match.players.find((player) => player.id === match.winnerId)?.name ?? 'The first-innings player'} won by defending the target.`;
      match.completedAt = new Date().toISOString();
      transition = 'all-out';
    }
  }

  return {
    ...result,
    batterMove,
    bowlerMove,
    battingPlayerId,
    bowlingPlayerId,
    transition,
    target: match.target,
    inningsRuns: innings.runs,
    inningsWickets: innings.wickets,
  };
}

export function createFirstInnings(match, battingPlayerId) {
  const allowed = match.players.some((player) => player.id === battingPlayerId);
  if (!allowed) throw new Error('The batting player is not part of this match.');
  match.innings = [{ battingPlayerId, runs: 0, wickets: 0 }];
  match.inningsIndex = 0;
  match.target = null;
  match.status = 'playing';
  match.startedAt = match.startedAt ?? new Date().toISOString();
}

export function createSecondInnings(match) {
  if (match.inningsIndex !== 0 || !match.innings[0]) {
    throw new Error('The first innings must finish before the second innings starts.');
  }
  const firstBatter = match.innings[0].battingPlayerId;
  const secondBatter = match.players.find((player) => player.id !== firstBatter)?.id;
  if (!secondBatter) throw new Error('The second player is missing.');
  match.innings.push({ battingPlayerId: secondBatter, runs: 0, wickets: 0 });
  match.inningsIndex = 1;
  match.status = 'playing';
  match.target = match.innings[0].runs + 1;
}
