import React from 'react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="container py-5"><div className="card p-4"><h1>We couldn’t open this page</h1><p>Your browser data may be unavailable, or this version could not finish loading. Reload to try again. If the problem continues, contact your administrator before clearing browser data.</p><button className="btn btn-primary align-self-start" onClick={() => window.location.reload()}>Reload application</button></div></main>;
    return this.props.children;
  }
}
