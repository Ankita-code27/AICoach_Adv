import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Eye, EyeOff, Lock } from 'lucide-react';
import AuthCard from '../components/AuthCard.jsx';
import Alert from '../components/Alert.jsx';
import IconField from '../components/IconField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { loginWithEmail } from '../services/auth.js';
import { getAuthErrorMessage } from '../utils/authErrors.js';

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={user.emailVerified ? '/dashboard' : '/verify-email'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await loginWithEmail(email.trim(), password);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue your interview practice."
      footerText="New to AI Interview Coach?"
      footerLink="/register"
      footerLinkText="Create an account"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <IconField icon={Mail} label="Email address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />

        <IconField
          icon={Lock}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          endAdornment={(
            <button type="button" className="input-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          )}
        />

        <Alert variant="error">{error}</Alert>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? <span className="btn-spinner" aria-hidden="true" /> : <LogIn size={17} />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <Link className="auth-action-link" to="/forgot-password">Forgot your password?</Link>
      <p className="auth-hint">Registration uses email and password authentication.</p>
    </AuthCard>
  );
}

export default LoginPage;
