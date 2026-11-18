import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import InterviewSetupPage from './pages/InterviewSetupPage.jsx';
import InterviewSessionPage from './pages/InterviewSessionPage.jsx';
import InterviewCompletePage from './pages/InterviewCompletePage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

function UnknownRouteRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="page-status">Checking your session…</p>;
  }

  return <Navigate to={user ? (user.emailVerified ? '/dashboard' : '/verify-email') : '/'} replace />;
}

function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="page-status">Checking your session…</p>;
  }

  if (!user) {
    return <LandingPage />;
  }

  return <Navigate to={user.emailVerified ? '/dashboard' : '/verify-email'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/verify-email"
        element={(
          <ProtectedRoute requireVerified={false}>
            <VerifyEmailPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/history"
        element={(
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/analytics"
        element={(
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/profile"
        element={(
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/interview/setup"
        element={(
          <ProtectedRoute>
            <InterviewSetupPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/interview/session"
        element={(
          <ProtectedRoute>
            <InterviewSessionPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/interview/complete"
        element={(
          <ProtectedRoute>
            <InterviewCompletePage />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<UnknownRouteRedirect />} />
    </Routes>
  );
}

export default App;
