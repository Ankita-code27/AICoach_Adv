import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, reload } from 'firebase/auth';
import { auth } from '../services/firebase.js';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionVersion, setSessionVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function refreshUser() {
    if (!auth.currentUser) {
      return null;
    }

    await reload(auth.currentUser);
    setSessionVersion((version) => version + 1);
    return auth.currentUser;
  }

  const value = useMemo(() => ({ user, loading, refreshUser }), [user, loading, sessionVersion]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}

export { AuthProvider, useAuth };
