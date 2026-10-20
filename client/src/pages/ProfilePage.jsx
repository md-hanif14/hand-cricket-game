import { useEffect, useState } from 'react';
import { CalendarDays, CircleCheck, Crown, History, LoaderCircle, Swords, Trophy, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api('/api/matches/mine?limit=30'), refreshUser()])
      .then(([data]) => { if (active) setMatches(data.matches ?? []); })
      .catch((err) => { if (active) setError(err.message || 'Could not load match history.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshUser]);

  return (
    <main className="profile-page page-shell">
      <div className="eyebrow">PLAYER PROFILE</div>
      <section className="profile-hero game-panel"><div className="profile-avatar"><UserRound size={34} /></div><div className="profile-user-copy"><h1>{user.username}</h1><p>{user.email}</p><span><CalendarDays size={14} /> Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span></div><div className="profile-level"><Crown size={18} /><span>PLAYER</span></div></section>
      <section className="stat-grid">
        <div className="stat-card"><div className="stat-icon"><Swords size={19} /></div><span>Matches played</span><strong>{user.stats?.matchesPlayed ?? 0}</strong></div>
        <div className="stat-card"><div className="stat-icon stat-icon-win"><Trophy size={19} /></div><span>Wins</span><strong>{user.stats?.wins ?? 0}</strong></div>
        <div className="stat-card"><div className="stat-icon stat-icon-loss"><CircleCheck size={19} /></div><span>Losses</span><strong>{user.stats?.losses ?? 0}</strong></div>
        <div className="stat-card"><div className="stat-icon"><History size={19} /></div><span>Win rate</span><strong>{user.stats?.matchesPlayed ? `${Math.round((user.stats.wins / user.stats.matchesPlayed) * 100)}%` : '—'}</strong></div>
      </section>
      <section className="history-section game-panel"><div className="history-heading"><div><div className="eyebrow">YOUR RECORD</div><h2>Recent matches</h2></div><span>{matches.length} shown</span></div>
        {loading ? <div className="history-empty"><LoaderCircle className="spin" size={23} /><span>Loading match history…</span></div> : error ? <div className="notice notice-error">{error}</div> : matches.length === 0 ? <div className="history-empty"><History size={28} /><strong>No matches yet</strong><span>Your completed matches will appear here.</span></div> : <div className="match-history-list">{matches.map((match) => {
          const won = match.winnerId === user.id;
          const opponent = match.players.find((player) => player.playerId !== user.id);
          return <article className="history-row" key={match.matchId}><div className={`history-result-dot ${won ? 'won' : 'lost'}`}>{won ? <Trophy size={16} /> : <Swords size={16} />}</div><div className="history-opponent"><strong>vs {opponent?.username ?? 'Opponent'}</strong><span>{match.mode === 'computer' ? `Computer · ${match.difficulty ?? 'Easy'}` : 'Online multiplayer'} · {formatDate(match.completedAt)}</span></div><div className="history-score">{match.innings.map((innings) => `${innings.runs}/${innings.wickets}`).join(' — ')}</div><span className={`history-outcome ${won ? 'won' : 'lost'}`}>{won ? 'WIN' : 'LOSS'}</span></article>;
        })}</div>}
      </section>
    </main>
  );
}
