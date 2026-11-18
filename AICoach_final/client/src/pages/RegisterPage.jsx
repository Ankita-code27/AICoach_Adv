import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import AuthCard from '../components/AuthCard.jsx';
import Alert from '../components/Alert.jsx';
import IconField from '../components/IconField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { registerWithEmail, sendVerificationEmail } from '../services/auth.js';
import { getAuthErrorMessage, getPasswordValidationMessage } from '../utils/authErrors.js';

function RegisterPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={user.emailVerified ? '/dashboard' : '/verify-email'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const passwordError = getPasswordValidationMessage(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const credential = await registerWithEmail(email.trim(), password);
      await sendVerificationEmail(credential.user);
      navigate('/verify-email', { replace: true });
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start preparing for your next interview."
      footerText="Already have an account?"
      footerLink="/login"
      footerLinkText="Sign in"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <IconField icon={Mail} label="Email address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />

        <IconField
          icon={Lock}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          minLength="12"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          endAdornment={(
            <button type="button" className="input-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          )}
        />

        <IconField icon={ShieldCheck} label="Confirm password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength="12" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />

        <p className="password-hint">Use 12+ characters with uppercase, lowercase, number, and symbol.</p>

        <Alert variant="error">{error}</Alert>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? <span className="btn-spinner" aria-hidden="true" /> : <UserPlus size={17} />}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  );
}

export default RegisterPage;
