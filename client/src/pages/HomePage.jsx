import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Crown, Gamepad2, Hand, History, ShieldCheck, Users, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { user } = useAuth();
  return (
    <main className="home-page page-shell">
      <section className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> THE CLASSIC HAND GAME, REIMAGINED</div>
          <h1>Two hands.<br /><span>One winner.</span></h1>
          <p className="hero-description">A little luck. A little strategy. A perfectly timed fist bump. Play classic hand cricket with a friend online or challenge the computer.</p>
          <div className="hero-actions">
            <Link to={user ? '/play/online' : '/register'} className="button button-primary button-large"><Users size={18} /> Play online <ArrowRight size={17} /></Link>
            <Link to={user ? '/play/computer' : '/login'} className="button button-secondary button-large"><Bot size={18} /> Vs computer</Link>
          </div>
          <div className="hero-proof"><span><ShieldCheck size={15} /> Hidden moves</span><span><Zap size={15} /> 3-second rounds</span><span><Hand size={15} /> Fist-bump reveal</span></div>
        </div>
        <div className="hero-art" aria-label="Hand Cricket game illustration">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-score-chip chip-top"><span className="mini-live-dot" /> LIVE ROUND <strong>03</strong></div>
          <div className="hero-vs-card">
            <div className="hero-hand hero-hand-left"><Hand size={78} strokeWidth={1.6} /></div>
            <div className="hero-vs">VS</div>
            <div className="hero-hand hero-hand-right"><Hand size={78} strokeWidth={1.6} /></div>
            <div className="hero-number num-left">2</div><div className="hero-number num-right">4</div>
          </div>
          <div className="hero-score-chip chip-bottom"><Crown size={15} /> FIRST TO THE TARGET WINS</div>
          <div className="float-star star-a">✳</div><div className="float-star star-b">✦</div><div className="float-star star-c">✧</div>
        </div>
      </section>

      <section className="mode-section">
        <div className="section-heading"><div><div className="eyebrow">CHOOSE YOUR GAME</div><h2>How do you want to play?</h2></div><span className="section-note">Same classic rules. Two ways to play.</span></div>
        <div className="mode-grid">
          <Link to={user ? '/play/online' : '/register'} className="mode-card mode-card-online">
            <div className="mode-icon"><Users size={24} /></div><span className="mode-tag">MULTIPLAYER</span>
            <h3>Play with friends</h3><p>Create a private room and share a code, or jump into quick matchmaking.</p>
            <div className="mode-card-footer"><span>Create room · Quick match</span><ArrowRight size={20} /></div>
          </Link>
          <Link to={user ? '/play/computer' : '/login'} className="mode-card mode-card-bot">
            <div className="mode-icon"><Bot size={24} /></div><span className="mode-tag">SINGLE PLAYER</span>
            <h3>Challenge the bot</h3><p>Practice your timing against Easy, Medium, or Hard computer opponents.</p>
            <div className="mode-card-footer"><span>3 difficulty levels</span><ArrowRight size={20} /></div>
          </Link>
          <Link to={user ? '/profile' : '/register'} className="mode-card mode-card-history">
            <div className="mode-icon"><History size={24} /></div><span className="mode-tag">YOUR PROGRESS</span>
            <h3>Track your record</h3><p>Keep your player profile, see your wins, and revisit previous match scores.</p>
            <div className="mode-card-footer"><span>Stats · Match history</span><ArrowRight size={20} /></div>
          </Link>
        </div>
      </section>

      <section className="rules-strip">
        <div className="rules-title"><Gamepad2 size={20} /><span>QUICK RULES</span></div>
        <div className="rule-item"><strong>1–5</strong><span>Choose your fingers</span></div>
        <div className="rule-item"><strong>Same</strong><span>One wicket down</span></div>
        <div className="rule-item"><strong>Different</strong><span>Batsman scores</span></div>
        <div className="rule-item"><strong>Target + 1</strong><span>First innings sets the chase</span></div>
      </section>
      <footer className="site-footer"><span>Hand Cricket</span><span>Built for the love of the game.</span></footer>
    </main>
  );
}
