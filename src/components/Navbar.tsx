import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, role, login, logout, isAuthenticated } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm py-2">
      <div className="container-fluid px-3">
        <Link className="navbar-brand d-flex align-items-center gap-2 fw-bold text-warning" to="/">
          <i className="bi bi-airplane-engines-fill text-warning fs-4"></i>
          <span>Saudi Carry Charges</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/') ? 'active text-warning fw-semibold' : ''}`} to="/">
                <i className="bi bi-speedometer2 me-1"></i> Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/orders/new') ? 'active text-warning fw-semibold' : ''}`} to="/orders/new">
                <i className="bi bi-plus-circle-fill me-1 text-success"></i> New Carry Order
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/invoices') ? 'active text-warning fw-semibold' : ''}`} to="/invoices">
                <i className="bi bi-receipt me-1"></i> Invoices
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/customers') ? 'active text-warning fw-semibold' : ''}`} to="/customers">
                <i className="bi bi-people-fill me-1"></i> Customers & Ledger
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/products') ? 'active text-warning fw-semibold' : ''}`} to="/products">
                <i className="bi bi-box-seam-fill me-1"></i> Carry Catalog
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/payments') ? 'active text-warning fw-semibold' : ''}`} to="/payments">
                <i className="bi bi-cash-stack me-1"></i> Payments
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/settings') ? 'active text-warning fw-semibold' : ''}`} to="/settings">
                <i className="bi bi-gear-fill me-1"></i> Settings & Audit
              </Link>
            </li>
          </ul>

          <div className="d-flex align-items-center gap-2">
            {isAuthenticated ? (
              <div className="dropdown">
                <button
                  className="btn btn-outline-light btn-sm dropdown-toggle d-flex align-items-center gap-2"
                  type="button"
                  id="userDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-person-circle"></i>
                  <span>{user?.fullName.split(' ')[0]}</span>
                  <span className={`badge ${role === 'OWNER' ? 'bg-danger' : role === 'STAFF' ? 'bg-primary' : 'bg-secondary'}`}>
                    {role}
                  </span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow" aria-labelledby="userDropdown">
                  <li><h6 className="dropdown-header">Switch Simulated Role:</h6></li>
                  <li>
                    <button className="dropdown-item" onClick={() => login('OWNER', 'Muhammad Usman (Owner)')}>
                      <i className="bi bi-shield-lock me-2 text-danger"></i> Owner (Full Control)
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item" onClick={() => login('STAFF', 'Hamza Tariq (Staff)')}>
                      <i className="bi bi-person-badge me-2 text-primary"></i> Staff (Operational)
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item" onClick={() => login('VIEWER', 'Auditor View (Read-Only)')}>
                      <i className="bi bi-eye me-2 text-secondary"></i> Viewer (Read Only)
                    </button>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item text-danger" onClick={logout}>
                      <i className="bi bi-box-arrow-right me-2"></i> Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <button className="btn btn-warning btn-sm" onClick={() => login('OWNER')}>
                <i className="bi bi-box-arrow-in-right me-1"></i> Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
