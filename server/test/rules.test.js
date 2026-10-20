import test from 'node:test';
import assert from 'node:assert/strict';
import { getTarget, randomMove, resolveRound } from '../src/game/rules.js';
import { applyRound, createFirstInnings, createSecondInnings } from '../src/game/roundEngine.js';

test('different moves score the batter move', () => {
  assert.deepEqual(resolveRound(2, 4), { runs: 2, wicket: false });
  assert.deepEqual(resolveRound(5, 1), { runs: 5, wicket: false });
});

test('matching moves lose one wicket and score no runs', () => {
  assert.deepEqual(resolveRound(3, 3), { runs: 0, wicket: true });
});

test('invalid moves are rejected', () => {
  for (const value of [0, 6, -1, 1.5, '2', null]) {
    assert.throws(() => resolveRound(value, 1));
  }
});

test('server random fallback always stays between 1 and 5', () => {
  for (let i = 0; i < 500; i += 1) {
    const value = randomMove();
    assert.ok(value >= 1 && value <= 5);
  }
});

test('target is one more than first-innings score', () => {
  assert.equal(getTarget(30), 31);
  assert.equal(getTarget(0), 1);
});

test('second innings wins immediately when target is reached', () => {
  const match = {
    status: 'playing',
    players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    wicketsLimit: 3,
    innings: [{ battingPlayerId: 'a', runs: 30, wickets: 3 }, { battingPlayerId: 'b', runs: 30, wickets: 1 }],
    inningsIndex: 1,
    target: 31,
  };
  const result = applyRound(match, 1, 2);
  assert.equal(result.transition, 'target-reached');
  assert.equal(match.status, 'completed');
  assert.equal(match.winnerId, 'b');
  assert.equal(match.innings[1].runs, 31);
});

test('first innings all-out sets target; second innings all-out defends target', () => {
  const match = {
    status: 'playing', players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    wicketsLimit: 1, innings: [{ battingPlayerId: 'a', runs: 12, wickets: 0 }], inningsIndex: 0, target: null,
  };
  const first = applyRound(match, 4, 4);
  assert.equal(first.transition, 'innings-ended');
  assert.equal(match.target, 13);
  createSecondInnings(match);
  const second = applyRound(match, 5, 5);
  assert.equal(second.transition, 'all-out');
  assert.equal(match.winnerId, 'a');
});

test('innings constructors alternate batting sides', () => {
  const match = { players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], status: 'waiting', innings: [], inningsIndex: 0 };
  createFirstInnings(match, 'a');
  match.status = 'inningsBreak';
  createSecondInnings(match);
  assert.equal(match.innings[0].battingPlayerId, 'a');
  assert.equal(match.innings[1].battingPlayerId, 'b');
  assert.equal(match.target, 1);
});
