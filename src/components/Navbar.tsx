import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { isDemo, isLocal } from '../services/backend';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Overview', icon: 'bi-grid-1x2' },
  { to: '/invoices', label: 'Invoices', icon: 'bi-receipt' },
  { to: '/customers', label: 'Customers', icon: 'bi-people' },
  { to: '/products', label: 'Catalog', icon: 'bi-box-seam' },
  { to: '/payments', label: 'Payments', icon: 'bi-wallet2' },
  { to: '/settings', label: 'Settings', icon: 'bi-gear' },
];

export const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { role, login, user, logout } = useAuth();
  return (
    <nav className="app-nav sticky-top" aria-label="Main navigation">
      <div className="app-nav-inner">
        <Link className="app-brand" to="/" onClick={() => setOpen(false)}>
          <span className="app-brand-icon"><i className="bi bi-airplane-engines-fill" aria-hidden="true" /></span>
          <span>Saudi Carry<small>Charge management</small></span>
        </Link>
        <button className="app-menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>
          <i className={`bi ${open ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true" />
        </button>
        <div className={`app-nav-content ${open ? 'is-open' : ''}`} id="main-navigation">
          <div className="app-nav-links">
            {links.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}><i className={`bi ${link.icon}`} aria-hidden="true" />{link.label}</NavLink>)}
          </div>
          <div className="app-nav-actions">
            {isDemo ? <><label className="demo-role-label" htmlFor="demo-role">Demo role</label>
            <select id="demo-role" className="demo-role" value={role} onChange={e => login(e.target.value as 'OWNER' | 'STAFF' | 'VIEWER')} aria-label="Simulated role">
              <option value="OWNER">Owner</option><option value="STAFF">Staff</option><option value="VIEWER">Viewer</option>
            </select></> : isLocal ? <span className="small text-muted">Local storage</span> : <><span className="small">{user?.fullName} · {role}</span><button className="btn btn-outline-secondary btn-sm" onClick={() => void logout()}>Sign out</button></>}
            <Link className="btn btn-primary app-new-order" to="/orders/new" onClick={() => setOpen(false)}><i className="bi bi-plus-lg" aria-hidden="true" /> New order</Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
