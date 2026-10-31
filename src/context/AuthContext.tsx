import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { isDemo, isLocal, supabase } from '../services/backend';
import { clearRemoteData, refreshRemoteData } from '../services/storage';

interface AuthContextType {
  user: UserProfile | null; role: UserRole;
  login: (role?: UserRole, name?: string) => void;
  logout: () => Promise<void>; isAuthenticated: boolean; canEdit: boolean; isOwner: boolean;
}
const demoRole = (): UserRole => { try { const saved = sessionStorage.getItem('demo-role'); return saved === 'STAFF' || saved === 'VIEWER' ? saved : 'OWNER'; } catch { return 'OWNER'; } };
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(isLocal ? { id: 'local-owner', fullName: isDemo ? 'Demo owner' : 'Local workspace', role: isDemo ? demoRole() : 'OWNER', createdAt: new Date().toISOString() } : null);
  const [loading, setLoading] = useState(!isLocal);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => {
    if (isLocal || !supabase) { setLoading(false); return; }
    let generation = 0;
    let activeUserId: string | undefined;
    let disposed = false;
    const sync = async (token?: string) => {
      const current = ++generation;
      setUser(null); clearRemoteData(); setLoading(true);
      try {
        if (token) {
          const response = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Could not load your account.');
          await refreshRemoteData();
          if (!disposed && current === generation) { setUser(data); activeUserId = data.id; setError(''); }
        }
      } catch (cause) { if (!disposed && current === generation) setError(cause instanceof Error ? cause.message : 'Could not load your account.'); }
      finally { if (!disposed && current === generation) setLoading(false); }
    };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session?.user.id === activeUserId && activeUserId) return;
      if (!session) activeUserId = undefined;
      queueMicrotask(() => { if (!disposed) void sync(session?.access_token); });
    });
    return () => { disposed = true; generation++; data.subscription.unsubscribe(); clearRemoteData(); };
  }, []);
  const login = (role: UserRole = 'OWNER', fullName = 'Demo user') => { if (isDemo) { sessionStorage.setItem('demo-role', role); setUser({ id: 'demo', role, fullName, createdAt: new Date().toISOString() }); } };
  const logout = async () => {
    setLoading(true);
    try { await supabase?.auth.signOut({ scope: 'local' }); }
    finally { sessionStorage.removeItem('carry-auth-session'); setUser(null); clearRemoteData(); setPassword(''); setLoading(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase) return;
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPassword('');
    if (error) { setError('Sign-in failed. Check your email and password.'); setLoading(false); }
  };
  const role = user?.role || 'VIEWER';
  const value = { user, role, login, logout, isAuthenticated: !!user, canEdit: role === 'OWNER' || role === 'STAFF', isOwner: role === 'OWNER' };
  return <AuthContext.Provider value={value}>
    {loading ? <main className="container py-5" role="status">Loading your workspace…</main> : !isLocal && !user ?
      <main className="container py-5" style={{ maxWidth: 480 }}><div className="card p-4 shadow-sm"><h1>Sign in</h1><p className="text-muted">Access your carry charges workspace.</p>
        {!supabase ? <p role="alert">Workspace connection is not configured. Ask your administrator to configure the Supabase URL and public key.</p> : <form onSubmit={submit}>
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          <label htmlFor="email" className="form-label">Email</label><input id="email" type="email" autoComplete="username" className="form-control mb-3" required value={email} onChange={e => setEmail(e.target.value)} />
          <label htmlFor="password" className="form-label">Password</label><input id="password" type="password" autoComplete="current-password" className="form-control mb-3" required value={password} onChange={e => setPassword(e.target.value)} />
          <button className="btn btn-primary w-100">Sign in</button><p className="small text-muted mt-3 mb-0">Accounts and password resets are managed by your workspace administrator.</p>
        </form>}
      </div></main> : <>{error && <div role="alert" className="alert alert-danger">{error}</div>}{children}</>}
  </AuthContext.Provider>;
};
export const useAuth = () => { const context = useContext(AuthContext); if (!context) throw new Error('AuthProvider is required'); return context; };
