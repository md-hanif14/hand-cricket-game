import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { parse as parseCookie } from 'cookie';
import { env } from '../config/env.js';
import { verifyToken } from '../middleware/requireAuth.js';
import { Match } from '../models/Match.js';
import { User } from '../models/User.js';
import { applyRound, createFirstInnings, createSecondInnings } from '../game/roundEngine.js';
import { randomMove } from '../game/rules.js';
import { chooseBotMove, chooseBotToss } from '../bots/strategies.js';

const matches = new Map();
const roomsByCode = new Map();
const matchByPlayer = new Map();
const quickQueue = new Map();
const roundTimers = new Map();
const transitionTimers = new Map();
const disconnectTimers = new Map();

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function isValidWickets(value) {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}

function safeAck(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}

function randomRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from(randomBytes(6), (byte) => alphabet[byte % alphabet.length]).join('');
  } while (roomsByCode.has(code));
  return code;
}

function playerFromSocket(socket) {
  return {
    id: socket.data.userId,
    name: socket.data.username,
    avatar: socket.data.avatar ?? '',
    isBot: false,
  };
}

function makeMatch({ mode, players, wicketsLimit, difficulty = null, roomCode = null }) {
  return {
    id: randomUUID(),
    mode,
    difficulty,
    players,
    wicketsLimit,
    roomCode,
    status: mode === 'online' ? 'waiting' : 'toss',
    tossWinnerId: null,
    tossChoice: null,
    innings: [],
    inningsIndex: 0,
    target: null,
    battingPlayerId: null,
    roundNumber: 0,
    roundId: null,
    deadlineAt: null,
    pendingMoves: {},
    roundResolved: false,
    readyPlayerIds: new Set(),
    connections: new Map(),
    moveHistory: [],
    winnerId: null,
    result: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    saved: false,
    saving: false,
  };
}

function opponentOf(match, playerId) {
  return match.players.find((player) => player.id !== playerId);
}

function activeInnings(match) {
  return match.innings[match.inningsIndex] ?? null;
}

function publicState(match, forPlayerId) {
  const innings = activeInnings(match);
  const opponent = opponentOf(match, forPlayerId);
  return {
    matchId: match.id,
    mode: match.mode,
    difficulty: match.difficulty,
    status: match.status,
    roomCode: match.roomCode,
    wicketsLimit: match.wicketsLimit,
    players: match.players.map((player) => ({
      id: player.id,
      name: player.name,
      avatar: player.avatar ?? '',
      isBot: Boolean(player.isBot),
      ready: match.readyPlayerIds.has(player.id),
      connected: player.isBot || match.connections.has(player.id),
    })),
    tossWinnerId: match.tossWinnerId,
    tossChoice: match.tossChoice ?? 'not-decided',
    innings: match.innings.map((item) => ({ ...item })),
    inningsIndex: match.inningsIndex,
    target: match.target,
    battingPlayerId: innings?.battingPlayerId ?? null,
    bowlingPlayerId: innings ? opponentOf(match, innings.battingPlayerId)?.id ?? null : null,
    roundNumber: match.roundNumber,
    roundId: match.roundId,
    deadlineAt: match.deadlineAt,
    myMoveLocked: Boolean(forPlayerId && Object.hasOwn(match.pendingMoves, forPlayerId)),
    opponentMoveLocked: Boolean(opponent && Object.hasOwn(match.pendingMoves, opponent.id)),
    winnerId: match.winnerId,
    result: match.result,
    createdAt: match.createdAt,
    startedAt: match.startedAt,
    completedAt: match.completedAt,
  };
}

function emitToPlayer(io, match, playerId, event, payload) {
  const socketId = match.connections.get(playerId);
  if (!socketId) return;
  io.sockets.sockets.get(socketId)?.emit(event, payload);
}

function sendState(io, match) {
  for (const player of match.players) {
    if (!player.isBot) emitToPlayer(io, match, player.id, 'match:state', publicState(match, player.id));
  }
}

function emitToAllHumans(io, match, event, payload) {
  for (const player of match.players) {
    if (!player.isBot) emitToPlayer(io, match, player.id, event, payload);
  }
}

function clearTimer(map, id) {
  const handle = map.get(id);
  if (handle) clearTimeout(handle);
  map.delete(id);
}

function attachPlayer(io, match, socket) {
  match.connections.set(socket.data.userId, socket.id);
  matchByPlayer.set(socket.data.userId, match.id);
  socket.join(match.id);
  clearTimer(disconnectTimers, `${match.id}:${socket.data.userId}`);
}

function removeQueuePlayer(playerId) {
  for (const [key, entry] of quickQueue.entries()) {
    if (entry.playerId === playerId) quickQueue.delete(key);
  }
}

function getLiveMatchForPlayer(playerId) {
  const matchId = matchByPlayer.get(playerId);
  const match = matchId ? matches.get(matchId) : null;
  if (!match || match.status === 'completed') return null;
  return match;
}

function sendRoundStarted(io, match) {
  emitToAllHumans(io, match, 'round:started', {
    roundId: match.roundId,
    roundNumber: match.roundNumber,
    deadlineAt: match.deadlineAt,
    durationMs: env.roundDurationMs,
    serverNow: Date.now(),
  });
}

function startToss(io, match) {
  if (match.players.length !== 2) return;
  match.status = 'toss';
  match.tossWinnerId = match.players[randomInt(0, match.players.length)].id;
  match.tossChoice = null;
  sendState(io, match);

  const tossWinner = match.players.find((player) => player.id === match.tossWinnerId);
  if (tossWinner?.isBot) {
    const choice = chooseBotToss();
    applyTossChoice(io, match, tossWinner.id, choice);
  }
}

function applyTossChoice(io, match, playerId, choice) {
  if (match.status !== 'toss' || match.tossWinnerId !== playerId) return false;
  if (choice !== 'bat' && choice !== 'bowl') return false;
  match.tossChoice = choice;
  const battingPlayerId = choice === 'bat' ? playerId : opponentOf(match, playerId)?.id;
  if (!battingPlayerId) return false;
  createFirstInnings(match, battingPlayerId);
  sendState(io, match);
  beginRound(io, match);
  return true;
}

function beginRound(io, match) {
  if (match.status !== 'playing') return;
  clearTimer(roundTimers, match.id);
  clearTimer(transitionTimers, match.id);
  match.roundNumber += 1;
  match.roundId = randomUUID();
  match.deadlineAt = Date.now() + env.roundDurationMs;
  match.pendingMoves = {};
  match.roundResolved = false;

  const bot = match.players.find((player) => player.isBot);
  if (bot) match.pendingMoves[bot.id] = chooseBotMove(match, bot.id);

  const thisRoundId = match.roundId;
  roundTimers.set(match.id, setTimeout(() => resolveRound(io, match, thisRoundId, true), env.roundDurationMs));
  sendState(io, match);
  sendRoundStarted(io, match);
}

function allMovesSubmitted(match) {
  return match.players.every((player) => Object.hasOwn(match.pendingMoves, player.id));
}

async function persistCompletedMatch(match) {
  if (match.saved || match.saving || match.status !== 'completed') return;
  match.saving = true;
  const realPlayers = match.players.filter((player) => !player.isBot);
  const document = {
    matchId: match.id,
    mode: match.mode,
    difficulty: match.difficulty,
    players: match.players.map((player) => ({ playerId: player.id, username: player.name, isBot: Boolean(player.isBot) })),
    playerIds: realPlayers.map((player) => player.id),
    wicketLimit: match.wicketsLimit,
    tossWinnerId: match.tossWinnerId,
    tossChoice: match.tossChoice ?? 'not-decided',
    innings: match.innings.map((item) => ({ ...item })),
    winnerId: match.winnerId,
    result: match.result ?? '',
    startedAt: match.startedAt ? new Date(match.startedAt) : undefined,
    completedAt: new Date(match.completedAt ?? Date.now()),
  };

  try {
    await Match.create(document);
    await Promise.all(realPlayers.map((player) => User.updateOne(
      { _id: player.id },
      { $inc: { 'stats.matchesPlayed': 1, ...(player.id === match.winnerId ? { 'stats.wins': 1 } : { 'stats.losses': 1 }) } },
    )));
    match.saved = true;
  } catch (error) {
    if (error?.code === 11000) {
      // A duplicate matchId means a retry already saved the record; don't increment statistics again.
      match.saved = true;
    } else {
      console.error('Could not save completed match:', error);
    }
  } finally {
    match.saving = false;
  }
}

function scheduleMatchCleanup(match) {
  clearTimer(transitionTimers, `cleanup:${match.id}`);
  transitionTimers.set(`cleanup:${match.id}`, setTimeout(() => {
    clearTimer(roundTimers, match.id);
    clearTimer(transitionTimers, match.id);
    clearTimer(transitionTimers, `cleanup:${match.id}`);
    if (match.roomCode) roomsByCode.delete(match.roomCode);
    for (const player of match.players) {
      if (!player.isBot && matchByPlayer.get(player.id) === match.id) matchByPlayer.delete(player.id);
    }
    matches.delete(match.id);
  }, 10 * 60 * 1000));
}

async function resolveRound(io, match, expectedRoundId, timedOut = false) {
  if (match.status !== 'playing' || match.roundResolved || match.roundId !== expectedRoundId) return;
  if (!timedOut && !allMovesSubmitted(match)) return;

  const autoSelected = [];
  if (timedOut) {
    for (const player of match.players) {
      if (!Object.hasOwn(match.pendingMoves, player.id)) {
        match.pendingMoves[player.id] = randomMove();
        autoSelected.push(player.id);
      }
    }
  }
  if (!allMovesSubmitted(match)) return;

  match.roundResolved = true;
  clearTimer(roundTimers, match.id);
  const innings = activeInnings(match);
  const batterId = innings.battingPlayerId;
  const bowlerId = opponentOf(match, batterId)?.id;
  const batterMove = match.pendingMoves[batterId];
  const bowlerMove = match.pendingMoves[bowlerId];

  const applied = applyRound(match, batterMove, bowlerMove);
  match.moveHistory.push({
    battingPlayerId: batterId,
    batterMove,
    bowlerMove,
    batterAuto: autoSelected.includes(batterId),
    bowlerAuto: autoSelected.includes(bowlerId),
  });

  emitToAllHumans(io, match, 'round:result', {
    roundId: expectedRoundId,
    roundNumber: match.roundNumber,
    batterId,
    bowlerId,
    batterMove,
    bowlerMove,
    runs: applied.runs,
    wicket: applied.wicket,
    transition: applied.transition,
    inningsRuns: applied.inningsRuns,
    inningsWickets: applied.inningsWickets,
    target: match.target,
    autoSelected,
  });
  sendState(io, match);

  if (match.status === 'completed') {
    await persistCompletedMatch(match);
    scheduleMatchCleanup(match);
    return;
  }

  const delay = applied.transition === 'innings-ended' ? env.revealDurationMs + 750 : env.revealDurationMs;
  transitionTimers.set(match.id, setTimeout(() => {
    if (!matches.has(match.id)) return;
    if (applied.transition === 'innings-ended') {
      if (match.status !== 'inningsBreak') return;
      createSecondInnings(match);
      sendState(io, match);
    }
    beginRound(io, match);
  }, delay));
}

function newOnlineMatch({ players, wicketsLimit, roomCode }) {
  const match = makeMatch({ mode: 'online', players, wicketsLimit, roomCode });
  matches.set(match.id, match);
  if (roomCode) roomsByCode.set(roomCode, match.id);
  return match;
}

function joinSocketToMatch(io, socket, match) {
  attachPlayer(io, match, socket);
  sendState(io, match);
}

function registerSocketHandlers(io, socket) {
  socket.on('room:create', (payload = {}, ack) => {
    try {
      if (!isValidWickets(payload.wicketsLimit)) return safeAck(ack, { ok: false, message: 'Choose between 1 and 10 wickets.' });
      if (getLiveMatchForPlayer(socket.data.userId)) return safeAck(ack, { ok: false, message: 'Finish or leave your current match first.' });
      removeQueuePlayer(socket.data.userId);
      const roomCode = randomRoomCode();
      const match = newOnlineMatch({ players: [playerFromSocket(socket)], wicketsLimit: payload.wicketsLimit, roomCode });
      joinSocketToMatch(io, socket, match);
      safeAck(ack, { ok: true, roomCode, matchId: match.id });
    } catch (error) {
      console.error('room:create failed:', error);
      safeAck(ack, { ok: false, message: 'Could not create the room.' });
    }
  });

  socket.on('room:cancel', (_payload, ack) => {
    const match = getLiveMatchForPlayer(socket.data.userId);
    if (!match || match.mode !== 'online' || match.status !== 'waiting' || match.players.length !== 1 || match.players[0].id !== socket.data.userId) {
      return safeAck(ack, { ok: false, message: 'Only an unjoined private room can be cancelled.' });
    }
    if (match.roomCode) roomsByCode.delete(match.roomCode);
    matchByPlayer.delete(socket.data.userId);
    match.connections.delete(socket.data.userId);
    matches.delete(match.id);
    socket.leave(match.id);
    socket.emit('match:expired', { message: 'Private room cancelled.' });
    safeAck(ack, { ok: true });
  });

  socket.on('room:join', (payload = {}, ack) => {
    try {
      const code = typeof payload.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : '';
      const matchId = roomsByCode.get(code);
      const match = matchId ? matches.get(matchId) : null;
      if (!match || match.status !== 'waiting') return safeAck(ack, { ok: false, message: 'Room not found or it has already started.' });
      if (getLiveMatchForPlayer(socket.data.userId)) return safeAck(ack, { ok: false, message: 'Finish or leave your current match first.' });
      if (match.players.some((player) => player.id === socket.data.userId)) return safeAck(ack, { ok: false, message: 'You already created this room. Ask a friend to join.' });
      if (match.players.length >= 2) return safeAck(ack, { ok: false, message: 'This room is full.' });
      match.players.push(playerFromSocket(socket));
      removeQueuePlayer(socket.data.userId);
      joinSocketToMatch(io, socket, match);
      safeAck(ack, { ok: true, roomCode: code, matchId: match.id });
    } catch (error) {
      console.error('room:join failed:', error);
      safeAck(ack, { ok: false, message: 'Could not join the room.' });
    }
  });

  socket.on('match:ready', (_payload, ack) => {
    const match = getLiveMatchForPlayer(socket.data.userId);
    if (!match || match.mode !== 'online' || match.status !== 'waiting' || match.players.length !== 2) {
      return safeAck(ack, { ok: false, message: 'The match is not ready to start yet.' });
    }
    match.readyPlayerIds.add(socket.data.userId);
    sendState(io, match);
    safeAck(ack, { ok: true });
    if (match.players.every((player) => match.readyPlayerIds.has(player.id))) startToss(io, match);
  });

  socket.on('queue:join', (payload = {}, ack) => {
    try {
      if (!isValidWickets(payload.wicketsLimit)) return safeAck(ack, { ok: false, message: 'Choose between 1 and 10 wickets.' });
      if (getLiveMatchForPlayer(socket.data.userId)) return safeAck(ack, { ok: false, message: 'Finish or leave your current match first.' });
      removeQueuePlayer(socket.data.userId);
      const queueKey = String(payload.wicketsLimit);
      const waiting = [...quickQueue.entries()].find(([key, entry]) => key.startsWith(`${queueKey}:`) && entry.playerId !== socket.data.userId);
      if (!waiting) {
        const key = `${queueKey}:${socket.data.userId}`;
        quickQueue.set(key, { playerId: socket.data.userId, socketId: socket.id, user: playerFromSocket(socket), wicketsLimit: payload.wicketsLimit, queuedAt: Date.now() });
        socket.data.queueKey = key;
        safeAck(ack, { ok: true, queued: true, message: 'Searching for another player with the same wicket setting…' });
        return;
      }

      const [waitingKey, other] = waiting;
      quickQueue.delete(waitingKey);
      const otherSocket = io.sockets.sockets.get(other.socketId);
      if (!otherSocket?.connected) {
        return safeAck(ack, { ok: false, message: 'The waiting player disconnected. Please search again.' });
      }
      const roomCode = null;
      const match = newOnlineMatch({ players: [other.user, playerFromSocket(socket)], wicketsLimit: payload.wicketsLimit, roomCode });
      // Quick matches need the same room synchronization, but no public invite code.
      attachPlayer(io, match, otherSocket);
      attachPlayer(io, match, socket);
      sendState(io, match);
      safeAck(ack, { ok: true, queued: false, matched: true, matchId: match.id });
      safeAckQueueSocket(otherSocket, { ok: true, queued: false, matched: true, matchId: match.id });
    } catch (error) {
      console.error('queue:join failed:', error);
      safeAck(ack, { ok: false, message: 'Could not join matchmaking.' });
    }
  });

  socket.on('queue:leave', (_payload, ack) => {
    removeQueuePlayer(socket.data.userId);
    socket.data.queueKey = null;
    safeAck(ack, { ok: true });
  });

  socket.on('computer:create', (payload = {}, ack) => {
    try {
      if (!isValidWickets(payload.wicketsLimit)) return safeAck(ack, { ok: false, message: 'Choose between 1 and 10 wickets.' });
      const difficulty = VALID_DIFFICULTIES.has(payload.difficulty) ? payload.difficulty : 'easy';
      if (getLiveMatchForPlayer(socket.data.userId)) return safeAck(ack, { ok: false, message: 'Finish or leave your current match first.' });
      removeQueuePlayer(socket.data.userId);
      const bot = { id: 'bot', name: `Cricket Bot · ${difficulty[0].toUpperCase()}${difficulty.slice(1)}`, avatar: '', isBot: true };
      const match = makeMatch({ mode: 'computer', players: [playerFromSocket(socket), bot], wicketsLimit: payload.wicketsLimit, difficulty });
      matches.set(match.id, match);
      attachPlayer(io, match, socket);
      safeAck(ack, { ok: true, matchId: match.id });
      startToss(io, match);
    } catch (error) {
      console.error('computer:create failed:', error);
      safeAck(ack, { ok: false, message: 'Could not start the computer match.' });
    }
  });

  socket.on('toss:choose', (payload = {}, ack) => {
    const match = getLiveMatchForPlayer(socket.data.userId);
    if (!match || match.status !== 'toss') return safeAck(ack, { ok: false, message: 'The toss is not waiting for a choice.' });
    if (match.tossWinnerId !== socket.data.userId) return safeAck(ack, { ok: false, message: 'Only the toss winner can choose.' });
    if (!applyTossChoice(io, match, socket.data.userId, payload.choice)) return safeAck(ack, { ok: false, message: 'Choose to bat or bowl.' });
    safeAck(ack, { ok: true });
  });

  socket.on('move:submit', (payload = {}, ack) => {
    const match = getLiveMatchForPlayer(socket.data.userId);
    if (!match || match.connections.get(socket.data.userId) !== socket.id || match.status !== 'playing') return safeAck(ack, { ok: false, message: 'The match is not accepting moves from this connection.' });
    if (!Number.isInteger(payload.number) || payload.number < 1 || payload.number > 5) {
      return safeAck(ack, { ok: false, message: 'Select a number from 1 to 5.' });
    }
    if (payload.roundId !== match.roundId) return safeAck(ack, { ok: false, message: 'That round has expired.' });
    if (Date.now() >= match.deadlineAt) {
      void resolveRound(io, match, match.roundId, true);
      return safeAck(ack, { ok: false, message: 'Time expired. A random number will be used if you did not choose.' });
    }
    if (match.roundResolved) return safeAck(ack, { ok: false, message: 'This round has already been resolved.' });
    if (Object.hasOwn(match.pendingMoves, socket.data.userId)) return safeAck(ack, { ok: false, message: 'Your choice is already locked.' });

    match.pendingMoves[socket.data.userId] = payload.number;
    emitToPlayer(io, match, socket.data.userId, 'move:locked', { roundId: match.roundId });
    const opponent = opponentOf(match, socket.data.userId);
    if (opponent && !opponent.isBot) emitToPlayer(io, match, opponent.id, 'opponent:locked', { roundId: match.roundId });
    sendState(io, match);
    safeAck(ack, { ok: true, locked: true });
    if (allMovesSubmitted(match)) void resolveRound(io, match, match.roundId, false);
  });

  socket.on('match:leave', (_payload, ack) => {
    const matchId = matchByPlayer.get(socket.data.userId);
    const match = matchId ? matches.get(matchId) : null;
    if (match?.status === 'completed') {
      matchByPlayer.delete(socket.data.userId);
      match.connections.delete(socket.data.userId);
      socket.leave(match.id);
    }
    safeAck(ack, { ok: true });
  });

  socket.on('disconnect', () => {
    removeQueuePlayer(socket.data.userId);
    const matchId = matchByPlayer.get(socket.data.userId);
    const match = matchId ? matches.get(matchId) : null;
    if (!match || match.connections.get(socket.data.userId) !== socket.id) return;
    match.connections.delete(socket.data.userId);
    sendState(io, match);
    emitToAllHumans(io, match, 'player:disconnected', { playerId: socket.data.userId, graceMs: env.disconnectGraceMs });
    if (match.status === 'completed') return;

    const key = `${match.id}:${socket.data.userId}`;
    clearTimer(disconnectTimers, key);
    disconnectTimers.set(key, setTimeout(async () => {
      if (!matches.has(match.id) || match.connections.has(socket.data.userId) || match.status === 'completed') return;
      const opponent = opponentOf(match, socket.data.userId);
      if (opponent && !opponent.isBot && match.players.length === 2 && match.status !== 'waiting') {
        match.status = 'completed';
        match.winnerId = opponent.id;
        match.result = `${match.players.find((player) => player.id === socket.data.userId)?.name ?? 'A player'} disconnected. ${opponent.name} wins by forfeit.`;
        match.completedAt = new Date().toISOString();
        clearTimer(roundTimers, match.id);
        clearTimer(transitionTimers, match.id);
        sendState(io, match);
        await persistCompletedMatch(match);
        scheduleMatchCleanup(match);
      } else {
        emitToAllHumans(io, match, 'match:expired', { message: 'This room expired because a player disconnected.' });
        if (match.roomCode) roomsByCode.delete(match.roomCode);
        for (const player of match.players) if (!player.isBot) matchByPlayer.delete(player.id);
        matches.delete(match.id);
      }
    }, env.disconnectGraceMs));
  });
}

function safeAckQueueSocket(socket, response) {
  // The queue screen listens for this direct event because its initial emit has already returned.
  socket.emit('queue:matched', response);
}

export function installMatchSockets(io) {
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookie(socket.handshake.headers.cookie ?? '');
      const token = cookies[env.cookieName];
      const payload = verifyToken(token);
      if (!payload?.sub) return next(new Error('Authentication required. Please log in.'));
      const user = await User.findById(payload.sub).select('username avatar');
      if (!user) return next(new Error('Account not found. Please log in again.'));
      socket.data.userId = user._id.toString();
      socket.data.username = user.username;
      socket.data.avatar = user.avatar ?? '';
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const existing = getLiveMatchForPlayer(userId);
    if (existing) {
      attachPlayer(io, existing, socket);
      sendState(io, existing);
      if (existing.status === 'playing' && !existing.roundResolved) {
        sendRoundStarted(io, existing);
        if (Object.hasOwn(existing.pendingMoves, userId)) emitToPlayer(io, existing, userId, 'move:locked', { roundId: existing.roundId });
        const other = opponentOf(existing, userId);
        if (other && Object.hasOwn(existing.pendingMoves, other.id)) emitToPlayer(io, existing, userId, 'opponent:locked', { roundId: existing.roundId });
      }
    } else {
      socket.emit('match:none');
    }
    registerSocketHandlers(io, socket);
  });
}
