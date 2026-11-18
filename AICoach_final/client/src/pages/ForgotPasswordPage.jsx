import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import AuthCard from '../components/AuthCard.jsx';
import Alert from '../components/Alert.jsx';
import IconField from '../components/IconField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { sendPasswordReset } from '../services/auth.js';
import { getAuthErrorMessage } from '../utils/authErrors.js';

function ForgotPasswordPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={user.emailVerified ? '/dashboard' : '/verify-email'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      await sendPasswordReset(email.trim());
      setMessage('If an account exists for this address, a reset email has been sent.');
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        setMessage('If an account exists for this address, a reset email has been sent.');
      } else {
        setError(getAuthErrorMessage(authError));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we will send reset instructions."
      footerText="Remembered your password?"
      footerLink="/login"
      footerLinkText="Sign in"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <IconField icon={Mail} label="Email address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Alert variant="error">{error}</Alert>
        <Alert variant="success">{message}</Alert>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? <span className="btn-spinner" aria-hidden="true" /> : <Send size={17} />}
          {submitting ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </AuthCard>
  );
}

export default ForgotPasswordPage;
