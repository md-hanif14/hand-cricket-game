import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Hand, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useGameSocket } from '../context/SocketContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { socketStatus, matchState, clearCompletedMatch } = useGameSocket();
  const navigate = useNavigate();

  async function navigateToGame(path) {
    if (matchState?.status === 'completed') await clearCompletedMatch();
    navigate(path);
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="nav-inner">
        <Link className="brand" to="/" aria-label="Hand Cricket home">
          <span className="brand-mark"><Hand size={22} /></span>
          <span>hand<span className="brand-accent">cricket</span></span>
        </Link>
        <nav className="nav-links">
          <NavLink to="/play/online" onClick={(event) => { event.preventDefault(); void navigateToGame('/play/online'); }}>Play online</NavLink>
          <NavLink to="/play/computer" onClick={(event) => { event.preventDefault(); void navigateToGame('/play/computer'); }}>Vs computer</NavLink>
          {user && <NavLink to="/profile"><UserRound size={16} /> Profile</NavLink>}
        </nav>
        <div className="nav-user">
          {user ? (
            <>
              <span className={`connection-dot ${socketStatus === 'connected' ? 'is-online' : ''}`} title={`Socket: ${socketStatus}`} />
              <span className="nav-username">{user.username}</span>
              <button className="icon-button" onClick={handleLogout} title="Log out" aria-label="Log out"><LogOut size={18} /></button>
            </>
          ) : (
            <>
              <Link className="nav-login" to="/login">Log in</Link>
              <Link className="button button-small" to="/register">Create account</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
