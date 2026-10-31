import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { NewOrder } from './pages/NewOrder';
import { Invoices } from './pages/Invoices';
import { InvoiceDetail } from './pages/InvoiceDetail';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';
import { Products } from './pages/Products';
import { Payments } from './pages/Payments';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-vh-100 d-flex flex-column bg-light">
          <Navbar />
          <main className="flex-grow-1">
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
          </main>
          <footer className="bg-white border-top py-3 text-center text-muted small">
            <div className="container">
              <span>Saudi Carry Charges & Customer Account Management System &copy; {new Date().getFullYear()}</span>
              <span className="mx-2">|</span>
              <span className="text-secondary">Strictly Carry Charges (Excludes Saudi Purchase/Retail Pricing)</span>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
