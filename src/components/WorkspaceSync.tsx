import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isDemo } from '../services/backend';
import { refreshRemoteData } from '../services/storage';
export function WorkspaceSync({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [loaded, setLoaded] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    setError('');
    refreshRemoteData().then(() => { if (!cancelled) setLoaded(pathname); }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load records.'); });
    return () => { cancelled = true; };
  }, [pathname, attempt]);
  if (isDemo) return <>{children}</>;
  if (error) return <div className="container py-5"><div role="alert" className="alert alert-danger">{error}</div><button className="btn btn-primary" onClick={() => setAttempt(attempt + 1)}>Try again</button></div>;
  if (loaded !== pathname) return <div className="p-5 text-center" role="status">Loading latest records…</div>;
  return <>{children}</>;
}
