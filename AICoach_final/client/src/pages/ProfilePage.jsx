import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mail, ShieldCheck, ShieldAlert, CalendarDays, KeyRound, LogOut, ListChecks, TrendingUp } from 'lucide-react';
import AppHeader from '../components/AppHeader.jsx';
import PageBackground from '../layouts/PageBackground.jsx';
import Alert from '../components/Alert.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { logout, sendPasswordReset } from '../services/auth.js';
import { useUserInterviews, computeInterviewStats } from '../hooks/useUserInterviews.js';

function formatDate(value) {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { interviews, loading } = useUserInterviews();
  const stats = computeInterviewStats(interviews);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handlePasswordReset() {
    setError('');
    setMessage('');
    setSendingReset(true);
    try {
      await sendPasswordReset(user.email);
      setMessage(`A password reset email was sent to ${user.email}.`);
    } catch {
      setError('Unable to send a password reset email right now. Please try again.');
    } finally {
      setSendingReset(false);
    }
  }

  async function handleSignOut() {
    setError('');
    setSigningOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setError('Unable to sign out. Please try again.');
      setSigningOut(false);
    }
  }

  return (
    <div className="app-shell">
      <PageBackground />
      <AppHeader active="profile" />

      <main className="app-main">
        <div className="page-header">
          <div className="page-title-group">
            <p className="eyebrow"><Sparkles size={13} /> Profile</p>
            <h1>Account settings</h1>
            <p>Manage your account details and security.</p>
          </div>
        </div>

        <Alert variant="error">{error}</Alert>
        <Alert variant="success">{message}</Alert>

        <section className="card profile-card">
          <div className="profile-avatar" aria-hidden="true">{user.email?.[0]?.toUpperCase()}</div>
          <div className="profile-details">
            <h2>{user.email}</h2>
            <div className="profile-meta-row">
              <span className="profile-meta-item"><Mail size={15} /> {user.email}</span>
              <span className="profile-meta-item"><CalendarDays size={15} /> Member since {formatDate(user.metadata?.creationTime)}</span>
            </div>
            {user.emailVerified ? (
              <span className="badge badge-success"><ShieldCheck size={14} /> Email verified</span>
            ) : (
              <span className="badge badge-warning"><ShieldAlert size={14} /> Email not verified</span>
            )}
          </div>
        </section>

        <div className="stat-grid">
          <div className="card stat-card">
            <span className="stat-icon"><ListChecks size={19} /></span>
            <div className="stat-value">{loading ? '—' : stats.total}</div>
            <div className="stat-label">Interviews completed</div>
          </div>
          <div className="card stat-card">
            <span className="stat-icon"><TrendingUp size={19} /></span>
            <div className="stat-value">{loading ? '—' : (stats.averageScore ?? '—')}{!loading && stats.averageScore !== null ? '/10' : ''}</div>
            <div className="stat-label">Average score</div>
          </div>
        </div>

        <section className="card">
          <h2>Security</h2>
          <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}>Reset your password by email, or sign out of your account on this device.</p>
          <div className="profile-actions">
            <button type="button" className="btn btn-secondary btn-auto" onClick={handlePasswordReset} disabled={sendingReset}>
              {sendingReset ? <span className="btn-spinner" aria-hidden="true" /> : <KeyRound size={16} />}
              {sendingReset ? 'Sending...' : 'Send password reset email'}
            </button>
            <button type="button" className="btn btn-danger btn-auto" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? <span className="btn-spinner" aria-hidden="true" /> : <LogOut size={16} />}
              {signingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ProfilePage;
