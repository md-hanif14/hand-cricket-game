import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Connect to your account before playing.'));
    if (socket.disconnected) socket.connect();
    const timeout = setTimeout(() => reject(new Error('The server did not respond. Please try again.')), 8000);
    socket.emit(event, payload, (response) => {
      clearTimeout(timeout);
      if (!response?.ok) reject(new Error(response?.message || 'The action failed.'));
      else resolve(response);
    });
  });
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socketStatus, setSocketStatus] = useState('offline');
  const [matchState, setMatchState] = useState(null);
  const [roundWindow, setRoundWindow] = useState(null);
  const [lastRoundResult, setLastRoundResult] = useState(null);
  const [notice, setNotice] = useState('');
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      socketRef.current = null;
      setSocketStatus('offline');
      setMatchState(null);
      setRoundWindow(null);
      setLastRoundResult(null);
      setOpponentDisconnected(false);
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    setSocketStatus('reconnecting');

    const onConnect = () => { setSocketStatus('connected'); setNotice(''); };
    const onDisconnect = () => setSocketStatus('reconnecting');
    const onConnectError = (error) => {
      setSocketStatus('error');
      setNotice(error.message || 'Could not connect to the game server.');
    };
    const onState = (state) => {
      setMatchState(state);
      setOpponentDisconnected(state.players.some((player) => !player.isBot && player.id !== user.id && !player.connected));
      if (state.status === 'completed') setRoundWindow(null);
    };
    const onRoundStarted = (round) => {
      setRoundWindow(round);
      setLastRoundResult(null);
    };
    const onRoundResult = (result) => {
      setLastRoundResult(result);
      setRoundWindow(null);
    };
    const onMoveLocked = () => setMatchState((current) => current ? { ...current, myMoveLocked: true } : current);
    const onOpponentLocked = () => setMatchState((current) => current ? { ...current, opponentMoveLocked: true } : current);
    const onDisconnected = () => setOpponentDisconnected(true);
    const onQueueMatched = () => setNotice('Opponent found! Preparing your match…');
    const onMatchExpired = (payload) => {
      setMatchState(null);
      setRoundWindow(null);
      setLastRoundResult(null);
      setOpponentDisconnected(false);
      setNotice(payload?.message || 'This match is no longer active.');
    };
    const onMatchNone = () => {
      setMatchState((current) => current && current.status !== 'completed' ? null : current);
      setRoundWindow(null);
      setLastRoundResult(null);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('match:state', onState);
    socket.on('round:started', onRoundStarted);
    socket.on('round:result', onRoundResult);
    socket.on('move:locked', onMoveLocked);
    socket.on('opponent:locked', onOpponentLocked);
    socket.on('player:disconnected', onDisconnected);
    socket.on('queue:matched', onQueueMatched);
    socket.on('match:expired', onMatchExpired);
    socket.on('match:none', onMatchNone);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('match:state', onState);
      socket.off('round:started', onRoundStarted);
      socket.off('round:result', onRoundResult);
      socket.off('move:locked', onMoveLocked);
      socket.off('opponent:locked', onOpponentLocked);
      socket.off('player:disconnected', onDisconnected);
      socket.off('queue:matched', onQueueMatched);
      socket.off('match:expired', onMatchExpired);
      socket.off('match:none', onMatchNone);
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [user?.id]);

  const createRoom = useCallback((wicketsLimit) => emitAck(socketRef.current, 'room:create', { wicketsLimit }), []);
  const joinRoom = useCallback((roomCode) => emitAck(socketRef.current, 'room:join', { roomCode }), []);
  const cancelRoom = useCallback(() => emitAck(socketRef.current, 'room:cancel'), []);
  const joinQueue = useCallback((wicketsLimit) => emitAck(socketRef.current, 'queue:join', { wicketsLimit }), []);
  const leaveQueue = useCallback(() => emitAck(socketRef.current, 'queue:leave'), []);
  const createComputerMatch = useCallback((wicketsLimit, difficulty) => emitAck(socketRef.current, 'computer:create', { wicketsLimit, difficulty }), []);
  const readyUp = useCallback(() => emitAck(socketRef.current, 'match:ready'), []);
  const chooseToss = useCallback((choice) => emitAck(socketRef.current, 'toss:choose', { choice }), []);

  const submitMove = useCallback((number) => {
    if (!roundWindow?.roundId) return Promise.reject(new Error('The round is not ready yet.'));
    return emitAck(socketRef.current, 'move:submit', { number, roundId: roundWindow.roundId });
  }, [roundWindow?.roundId]);

  const clearCompletedMatch = useCallback(async () => {
    if (socketRef.current && matchState?.status === 'completed') {
      try { await emitAck(socketRef.current, 'match:leave'); } catch { /* local reset still works */ }
    }
    setMatchState(null);
    setRoundWindow(null);
    setLastRoundResult(null);
    setOpponentDisconnected(false);
    setNotice('');
  }, [matchState?.status]);

  const value = useMemo(() => ({
    socketStatus,
    matchState,
    roundWindow,
    lastRoundResult,
    notice,
    setNotice,
    opponentDisconnected,
    createRoom,
    joinRoom,
    cancelRoom,
    joinQueue,
    leaveQueue,
    createComputerMatch,
    readyUp,
    chooseToss,
    submitMove,
    clearCompletedMatch,
  }), [socketStatus, matchState, roundWindow, lastRoundResult, notice, opponentDisconnected, createRoom, joinRoom, cancelRoom, joinQueue, leaveQueue, createComputerMatch, readyUp, chooseToss, submitMove, clearCompletedMatch]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useGameSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useGameSocket must be used inside SocketProvider.');
  return context;
}
