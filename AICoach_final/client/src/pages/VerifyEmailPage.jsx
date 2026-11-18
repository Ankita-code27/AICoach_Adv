import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MailCheck, RefreshCw, LogOut } from 'lucide-react';
import AuthCard from '../components/AuthCard.jsx';
import Alert from '../components/Alert.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { logout, sendVerificationEmail } from '../services/auth.js';
import { getAuthErrorMessage } from '../utils/authErrors.js';

function VerifyEmailPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  if (user.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleResend() {
    setError('');
    setMessage('');
    setSending(true);
    try {
      await sendVerificationEmail(user);
      setMessage(`A verification email was sent to ${user.email}.`);
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setSending(false);
    }
  }

  async function handleCheckVerification() {
    setError('');
    setMessage('');
    setChecking(true);
    try {
      const refreshedUser = await refreshUser();
      if (refreshedUser?.emailVerified) {
        navigate('/dashboard', { replace: true });
      } else {
        setMessage('Your email is not verified yet. Open the link in your email, then try again.');
      }
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setChecking(false);
    }
  }

  async function handleSignOut() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    }
  }

  return (
    <AuthCard
      title="Verify your email"
      subtitle={`We sent a verification link to ${user.email}. Verify your address before continuing.`}
      footerText="Using a different account?"
      footerLink="/login"
      footerLinkText="Sign in"
    >
      <div className="verification-actions">
        <button type="button" className="btn btn-primary" onClick={handleCheckVerification} disabled={checking}>
          {checking ? <span className="btn-spinner" aria-hidden="true" /> : <MailCheck size={17} />}
          {checking ? 'Checking...' : 'I verified my email'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleResend} disabled={sending}>
          {sending ? <span className="btn-spinner" aria-hidden="true" /> : <RefreshCw size={17} />}
          {sending ? 'Sending...' : 'Resend verification email'}
        </button>
        <button type="button" className="btn btn-ghost btn-auto" style={{ justifySelf: 'center' }} onClick={handleSignOut}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
      <Alert variant="error">{error}</Alert>
      <Alert variant="success">{message}</Alert>
    </AuthCard>
  );
}

export default VerifyEmailPage;
