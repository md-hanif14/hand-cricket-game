import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Bot, Check, CircleHelp, Copy, Hand, LoaderCircle, RefreshCw, ShieldAlert, Trophy, Users, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useGameSocket } from '../context/SocketContext.jsx';
import HandFigure from '../components/HandFigure.jsx';
import RoundAnimation from '../components/RoundAnimation.jsx';

function NumberSelector({ onSelect, disabled }) {
  return <div className="number-selector" role="group" aria-label="Choose finger count">
    {[1, 2, 3, 4, 5].map((number) => <button className="number-choice" key={number} onClick={() => onSelect(number)} disabled={disabled} aria-label={`Choose ${number} finger${number > 1 ? 's' : ''}`}><HandFigure number={number} side="right" size={64} /><strong>{number}</strong><span>{number === 1 ? 'run' : 'runs'}</span></button>)}
  </div>;
}

function MatchRoom({ matchState, user, roundWindow, lastRoundResult, notice, setNotice, opponentDisconnected, readyUp, chooseToss, submitMove, clearCompletedMatch, cancelRoom }) {
  const [timeLeft, setTimeLeft] = useState(3);
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState('Copy code');
  const [error, setError] = useState('');
  const currentInnings = matchState.innings?.[matchState.inningsIndex];
  const batter = matchState.players.find((player) => player.id === matchState.battingPlayerId);
  const bowler = matchState.players.find((player) => player.id === matchState.bowlingPlayerId);
  const isTossWinner = matchState.tossWinnerId === user.id;
  const myPlayer = matchState.players.find((player) => player.id === user.id);
  const opponent = matchState.players.find((player) => player.id !== user.id);
  const isBatting = matchState.battingPlayerId === user.id;
  const isWinner = matchState.winnerId === user.id;

  useEffect(() => {
    if (!roundWindow?.deadlineAt) return undefined;
    const update = () => setTimeLeft(Math.max(0, Math.ceil((roundWindow.deadlineAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 80);
    return () => clearInterval(timer);
  }, [roundWindow?.deadlineAt]);

  async function act(action) {
    setError(''); setNotice(''); setBusy(true);
    try { await action(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(matchState.roomCode);
      setCopyState('Copied!');
      setTimeout(() => setCopyState('Copy code'), 1800);
    } catch {
      setCopyState(matchState.roomCode);
      setError('Clipboard access was blocked. You can select and copy the room code manually.');
    }
  }

  const bothPlayersReady = matchState.players.length === 2 && matchState.players.every((player) => player.ready);

  return (
    <div className="play-shell page-shell">
      <div className="play-heading-row"><Link to="/" className="back-link"><ArrowLeft size={16} /> Home</Link><div className="mode-pill">{matchState.mode === 'computer' ? <><Bot size={15} /> VS COMPUTER · {matchState.difficulty?.toUpperCase()}</> : <><Users size={15} /> ONLINE MULTIPLAYER</>}</div></div>
      {(error || notice) && <div className={error ? 'notice notice-error' : 'notice'} role="status">{error || notice}<button onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss">×</button></div>}

      {matchState.status === 'waiting' && <section className="lobby-panel game-panel">
        <div className="lobby-heading"><div className="panel-icon"><Users size={23} /></div><div><div className="eyebrow">MATCH LOBBY</div><h1>{matchState.roomCode ? 'Invite a friend' : 'Opponent found!'}</h1><p>{matchState.players.length < 2 ? 'Your room is ready. Waiting for another player to join.' : 'Both players are here. Get ready to toss.'}</p></div></div>
        {matchState.roomCode && <div className="room-code-block"><span>ROOM CODE</span><strong>{matchState.roomCode}</strong><button className="button button-secondary" onClick={copyCode}><Copy size={16} /> {copyState}</button></div>}
        <div className="lobby-players">
          {matchState.players.map((player) => <div className="lobby-player" key={player.id}><div className="player-avatar">{player.isBot ? <Bot size={20} /> : player.name.slice(0, 1).toUpperCase()}</div><div><strong>{player.name}{player.id === user.id ? ' (you)' : ''}</strong><span>{player.connected ? 'Connected' : 'Reconnecting…'}</span></div><span className={`ready-indicator ${player.ready ? 'ready' : ''}`}>{player.ready ? <><Check size={14} /> Ready</> : 'Not ready'}</span></div>)}
          {matchState.players.length < 2 && <div className="lobby-player lobby-empty"><div className="player-avatar"><LoaderCircle className="spin" size={20} /></div><div><strong>Waiting for opponent</strong><span>Share the room code to invite a friend.</span></div></div>}
        </div>
        {matchState.players.length === 2 && <div className="lobby-ready-row"><p>{myPlayer?.ready ? 'You are ready. Waiting for the other player…' : 'When both players are ready, the toss begins.'}</p><button className="button button-primary" disabled={busy || myPlayer?.ready || bothPlayersReady} onClick={() => act(readyUp)}>{myPlayer?.ready ? 'Ready ✓' : 'I’m ready'} <ArrowRight size={16} /></button></div>}
        {matchState.players.length === 1 && matchState.roomCode && <div className="lobby-ready-row"><p>Need to make another room? You can cancel this invitation.</p><button className="button button-secondary" disabled={busy} onClick={() => act(cancelRoom)}>Cancel room</button></div>}
      </section>}

      {matchState.status === 'toss' && <section className="toss-panel game-panel"><div className="toss-coin"><span>HC</span></div><div className="eyebrow">THE TOSS</div><h1>{matchState.players.find((player) => player.id === matchState.tossWinnerId)?.name} won the toss!</h1><p>{isTossWinner ? 'Your call. Choose whether to bat or bowl first.' : 'Waiting for the toss winner to choose bat or bowl.'}</p>{isTossWinner && <div className="toss-actions"><button className="button button-primary button-large" disabled={busy} onClick={() => act(() => chooseToss('bat'))}><Hand size={19} /> Bat first</button><button className="button button-secondary button-large" disabled={busy} onClick={() => act(() => chooseToss('bowl'))}><ShieldAlert size={19} /> Bowl first</button></div>}</section>}

      {(matchState.status === 'playing' || matchState.status === 'inningsBreak' || matchState.status === 'completed') && <>
        <section className="scoreboard game-panel">
          <div className="scoreboard-top"><div><div className="eyebrow">{matchState.status === 'completed' ? 'MATCH COMPLETE' : `INNINGS ${matchState.inningsIndex + 1}`}</div><h1>{matchState.status === 'completed' ? 'Final score' : matchState.inningsIndex === 1 ? 'The chase is on' : 'First innings'}</h1></div><div className="wicket-chip"><ShieldAlert size={15} /> {matchState.wicketsLimit} wickets each</div></div>
          <div className="score-columns">
            {matchState.innings.map((innings, index) => {
              const player = matchState.players.find((item) => item.id === innings.battingPlayerId);
              return <div className={`score-card ${index === matchState.inningsIndex && matchState.status !== 'completed' ? 'score-card-active' : ''}`} key={`${innings.battingPlayerId}-${index}`}><span>{index === 0 ? 'FIRST INNINGS' : 'SECOND INNINGS'}</span><strong>{innings.runs}<small> / {innings.wickets}</small></strong><div>{player?.name ?? 'Player'} batting</div></div>;
            })}
            {matchState.innings.length === 1 && <div className="score-card score-target"><span>TARGET</span><strong>—</strong><div>Set after innings 1</div></div>}
          </div>
          {matchState.target != null && <div className="target-banner"><span>CHASE TARGET</span><strong>{matchState.target}</strong><span>{matchState.status === 'playing' && matchState.inningsIndex === 1 ? `${Math.max(0, matchState.target - (currentInnings?.runs ?? 0))} more to win` : 'Reach this score to win'}</span></div>}
          <div className="current-roles"><div><span className="role-dot bat-dot" /> <span>Batting</span><strong>{batter?.name ?? '—'}</strong></div><div><span className="role-dot bowl-dot" /> <span>Bowling</span><strong>{bowler?.name ?? '—'}</strong></div></div>
        </section>

        {lastRoundResult && <RoundAnimation result={lastRoundResult} matchState={matchState} userId={user.id} />}

        {matchState.status === 'playing' && !lastRoundResult && <section className="play-controls game-panel">
          <div className="round-countdown-row"><div><div className="eyebrow">ROUND {matchState.roundNumber}</div><h2>{matchState.myMoveLocked ? 'Choice locked!' : 'Show your fingers'}</h2><p>{matchState.myMoveLocked ? 'Your hand is hidden. Waiting for the reveal…' : `You are ${isBatting ? 'batting' : 'bowling'}. Pick a number before time runs out.`}</p></div><div className={`countdown-ring ${timeLeft <= 1 ? 'countdown-urgent' : ''}`}><strong>{roundWindow ? timeLeft : '—'}</strong><span>SECONDS</span></div></div>
          {matchState.myMoveLocked ? <div className="move-locked-message"><span className="lock-pulse"><Check size={20} /></span><div><strong>Number locked</strong><span>{matchState.opponentMoveLocked ? 'Both moves are locked. Revealing together…' : 'The other player cannot see your choice.'}</span></div></div> : <NumberSelector disabled={!roundWindow || timeLeft <= 0 || busy} onSelect={(number) => act(() => submitMove(number))} />}
          <div className="fair-play-note"><ShieldAlert size={15} /><span>Both hands stay hidden until both choices are locked or the 3-second timer expires.</span></div>
        </section>}

        {matchState.status === 'inningsBreak' && <section className="break-panel game-panel"><div className="panel-icon"><RefreshCw size={22} /></div><div><div className="eyebrow">INNINGS COMPLETE</div><h2>Target set: {matchState.target}</h2><p>{matchState.players.find((player) => player.id !== matchState.innings[0]?.battingPlayerId)?.name} needs {matchState.target} runs to win. The next innings will start shortly.</p></div><div className="spinner" /></section>}

        {matchState.status === 'completed' && <section className={`result-panel game-panel ${isWinner ? 'result-win' : 'result-loss'}`}><div className="result-icon">{isWinner ? <Trophy size={31} /> : <ShieldAlert size={31} />}</div><div className="eyebrow">FULL TIME</div><h2>{isWinner ? 'You win!' : 'Good game!'}</h2><p>{matchState.result || (isWinner ? 'You won the match.' : 'The match has ended.')}</p><div className="result-actions"><button className="button button-primary button-large" onClick={clearCompletedMatch}><RefreshCw size={17} /> Play again</button><Link className="button button-secondary button-large" to="/profile">View match history <ArrowRight size={17} /></Link></div></section>}
      </>}

      {opponentDisconnected && matchState.status !== 'completed' && <div className="disconnect-banner"><WifiOff size={18} /><span>Your opponent disconnected. Waiting for them to reconnect.</span></div>}
    </div>
  );
}

export default function PlayPage() {
  const { mode } = useParams();
  const { user } = useAuth();
  const {
    matchState, roundWindow, lastRoundResult, notice, setNotice, opponentDisconnected,
    createRoom, joinRoom, cancelRoom, joinQueue, leaveQueue, createComputerMatch, readyUp, chooseToss,
    submitMove, clearCompletedMatch,
  } = useGameSocket();
  const [wickets, setWickets] = useState(3);
  const [difficulty, setDifficulty] = useState('medium');
  const [onlineTab, setOnlineTab] = useState('create');
  const [roomCode, setRoomCode] = useState('');
  const [queueing, setQueueing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const queueingRef = useRef(false);
  const isComputer = mode === 'computer';
  const canDisplayMatch = Boolean(matchState && (matchState.status !== 'completed' || matchState.mode === (isComputer ? 'computer' : 'online')));

  useEffect(() => {
    queueingRef.current = queueing;
  }, [queueing]);
  useEffect(() => {
    if (matchState?.mode === 'online' && matchState.players?.length === 2) setQueueing(false);
  }, [matchState?.matchId, matchState?.mode, matchState?.players?.length]);
  useEffect(() => () => {
    if (queueingRef.current) void leaveQueue().catch(() => {});
  }, [leaveQueue]);

  async function act(action) {
    setError(''); setNotice(''); setBusy(true);
    try { await action(); }
    catch (err) { setError(err.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  }

  async function startComputer() {
    await clearCompletedMatch();
    await createComputerMatch(wickets, difficulty);
  }

  async function makeRoom() {
    setQueueing(false);
    await createRoom(wickets);
  }

  async function enterRoom() {
    if (!roomCode.trim()) throw new Error('Enter your friend’s room code.');
    await joinRoom(roomCode.trim());
  }

  async function findQuickMatch() {
    setQueueing(true);
    const response = await joinQueue(wickets);
    if (response.queued) setNotice(response.message);
    if (response.matched) setQueueing(false);
  }

  async function cancelQueue() {
    await leaveQueue();
    setQueueing(false);
    setNotice('');
  }

  if (matchState && matchState.status !== 'completed') {
    return <MatchRoom matchState={matchState} user={user} roundWindow={roundWindow} lastRoundResult={lastRoundResult} notice={notice} setNotice={setNotice} opponentDisconnected={opponentDisconnected} readyUp={readyUp} chooseToss={chooseToss} submitMove={submitMove} clearCompletedMatch={clearCompletedMatch} cancelRoom={cancelRoom} />;
  }
  if (canDisplayMatch && matchState?.status === 'completed') {
    return <MatchRoom matchState={matchState} user={user} roundWindow={roundWindow} lastRoundResult={lastRoundResult} notice={notice} setNotice={setNotice} opponentDisconnected={opponentDisconnected} readyUp={readyUp} chooseToss={chooseToss} submitMove={submitMove} clearCompletedMatch={clearCompletedMatch} cancelRoom={cancelRoom} />;
  }

  return (
    <main className="setup-page page-shell">
      <Link to="/" className="back-link"><ArrowLeft size={16} /> Back home</Link>
      <div className="setup-header"><div className="setup-header-icon">{isComputer ? <Bot size={28} /> : <Users size={28} />}</div><div><div className="eyebrow">{isComputer ? 'SINGLE PLAYER' : 'ONLINE MULTIPLAYER'}</div><h1>{isComputer ? 'Challenge the computer' : 'Play with a friend'}</h1><p>{isComputer ? 'Choose your difficulty, set the wickets, and take on the bot.' : 'Create a private room, join your friend, or find someone to play.'}</p></div></div>
      {(error || notice) && <div className={error ? 'notice notice-error' : 'notice'}>{error || notice}<button onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss">×</button></div>}

      <section className="setup-card game-panel">
        <div className="setup-step"><span>01</span><div><h2>Set your wickets</h2><p>Each player gets this many outs. There are no overs.</p></div></div>
        <div className="wicket-options">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => <button key={value} className={wickets === value ? 'wicket-option selected' : 'wicket-option'} onClick={() => setWickets(value)} aria-pressed={wickets === value}>{value}</button>)}</div>
        {isComputer && <><div className="setup-separator" /><div className="setup-step"><span>02</span><div><h2>Choose bot difficulty</h2><p>The harder the bot, the more it adapts to your past choices.</p></div></div><div className="difficulty-options">{[
          { id: 'easy', title: 'Easy', desc: 'Mostly random', tag: 'CASUAL' },
          { id: 'medium', title: 'Medium', desc: 'Basic strategy', tag: 'BALANCED' },
          { id: 'hard', title: 'Hard', desc: 'Learns your tendencies', tag: 'CHALLENGE' },
        ].map((item) => <button key={item.id} className={`difficulty-option difficulty-${item.id} ${difficulty === item.id ? 'selected' : ''}`} onClick={() => setDifficulty(item.id)}><span className="difficulty-tag">{item.tag}</span><strong>{item.title}</strong><span>{item.desc}</span>{difficulty === item.id && <Check className="difficulty-check" size={17} />}</button>)}</div><button className="button button-primary button-large setup-main-button" disabled={busy} onClick={() => act(startComputer)}>{busy ? 'Starting match…' : 'Start match'} <ArrowRight size={18} /></button></>}

        {!isComputer && <><div className="setup-separator" /><div className="setup-step"><span>02</span><div><h2>Choose how to connect</h2><p>Both options use the same rules and live scoreboard.</p></div></div><div className="online-tabs"><button className={onlineTab === 'create' ? 'active' : ''} onClick={() => setOnlineTab('create')}><Users size={17} /> Create room</button><button className={onlineTab === 'join' ? 'active' : ''} onClick={() => setOnlineTab('join')}><ArrowRight size={17} /> Join room</button><button className={onlineTab === 'quick' ? 'active' : ''} onClick={() => setOnlineTab('quick')}><ZapIcon /> Quick match</button></div>
          <AnimatePresence mode="wait">
            {onlineTab === 'create' && <motion.div key="create" className="online-tab-panel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}><div className="tab-illustration"><Users size={27} /></div><div className="tab-copy"><strong>Create a private room</strong><p>We'll give you a room code to share with your friend.</p></div><button className="button button-primary" disabled={busy} onClick={() => act(makeRoom)}>{busy ? 'Creating…' : 'Create room'} <ArrowRight size={17} /></button></motion.div>}
            {onlineTab === 'join' && <motion.div key="join" className="online-tab-panel join-panel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}><div className="tab-illustration"><Users size={27} /></div><div className="tab-copy"><strong>Join your friend's room</strong><p>Enter the 6-character code your friend shared.</p><input className="room-code-input" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABC123" maxLength={6} autoComplete="off" /></div><button className="button button-primary" disabled={busy || roomCode.length !== 6} onClick={() => act(enterRoom)}>Join room <ArrowRight size={17} /></button></motion.div>}
            {onlineTab === 'quick' && <motion.div key="quick" className="online-tab-panel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}><div className="tab-illustration"><ZapIcon /></div><div className="tab-copy"><strong>Find an opponent</strong><p>Match with someone waiting for the same wicket setting.</p></div>{queueing ? <button className="button button-secondary" disabled={busy} onClick={() => act(cancelQueue)}><LoaderCircle className="spin" size={17} /> Cancel search</button> : <button className="button button-primary" disabled={busy} onClick={() => act(findQuickMatch)}>Find match <ArrowRight size={17} /></button>}</motion.div>}
          </AnimatePresence>
        </>}
      </section>
      <div className="setup-footnote"><CircleHelp size={16} /><span>Each round gives both players 3 seconds to choose. If time runs out, the server randomly chooses for them. Hands reveal together after both choices are locked.</span></div>
    </main>
  );
}

function ZapIcon() { return <span className="zap-icon"><ArrowRight size={18} /></span>; }
