import React, { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isDemo, isLocal } from './services/backend';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceSync } from './components/WorkspaceSync';
import { Navbar } from './components/Navbar';
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const NewOrder = lazy(() => import('./pages/NewOrder').then(module => ({ default: module.NewOrder })));
const Invoices = lazy(() => import('./pages/Invoices').then(module => ({ default: module.Invoices })));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail').then(module => ({ default: module.InvoiceDetail })));
const Customers = lazy(() => import('./pages/Customers').then(module => ({ default: module.Customers })));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail').then(module => ({ default: module.CustomerDetail })));
const Products = lazy(() => import('./pages/Products').then(module => ({ default: module.Products })));
const Payments = lazy(() => import('./pages/Payments').then(module => ({ default: module.Payments })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));

const Router = isLocal && !isDemo ? HashRouter : BrowserRouter;

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-vh-100 d-flex flex-column bg-light">
          <a href="#main-content" className="skip-link">Skip to content</a>
          <Navbar />
          {isDemo && <div className="demo-notice" role="status"><strong>Demo mode:</strong> Data is stored only in this browser and roles are simulated. Do not use for live customer or financial records.</div>}
          <main className="flex-grow-1 app-page w-100" id="main-content">
            <WorkspaceSync><Suspense fallback={<div className="p-5 text-center" role="status">Loading page…</div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/orders/new" element={<NewOrder />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/products" element={<Products />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense></WorkspaceSync>
          </main>
          <footer className="bg-white border-top py-3 text-center text-muted small">
            <div className="container">
              <span>Saudi Carry Charges & Customer Account Management System &copy; {new Date().getFullYear()}</span>
              <span className="mx-2">|</span>
              <span className="text-secondary">Strictly Carry Charges (Excludes Saudi Purchase/Retail Pricing)</span>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;

