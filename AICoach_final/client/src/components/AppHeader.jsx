import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ListChecks, History, BarChart3, User, LogOut } from 'lucide-react';
import { logout } from '../services/auth.js';

function AppHeader({ active }) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <header className="app-header">
      <Link to="/dashboard" className="brand-mark">
        <span className="brand-icon" aria-hidden="true"><Sparkles size={17} strokeWidth={2.25} /></span>
        <span className="brand-label">AI Interview Coach</span>
      </Link>
      <nav>
        <Link className={`nav-link ${active === 'dashboard' ? 'active' : ''}`} to="/dashboard"><ListChecks size={16} /><span className="nav-label">Dashboard</span></Link>
        <Link className={`nav-link ${active === 'history' ? 'active' : ''}`} to="/history"><History size={16} /><span className="nav-label">History</span></Link>
        <Link className={`nav-link ${active === 'analytics' ? 'active' : ''}`} to="/analytics"><BarChart3 size={16} /><span className="nav-label">Analytics</span></Link>
        <Link className={`nav-link ${active === 'profile' ? 'active' : ''}`} to="/profile"><User size={16} /><span className="nav-label">Profile</span></Link>
        <button type="button" className="btn btn-ghost btn-auto" onClick={handleLogout} disabled={signingOut}>
          <LogOut size={16} />
          <span className="nav-label">{signingOut ? 'Signing out...' : 'Sign out'}</span>
        </button>
      </nav>
    </header>
  );
}

export default AppHeader;
