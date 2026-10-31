import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storage } from '../services/storage';
import { formatCurrency } from '../utils/finance';
import { Invoice, CustomerTransaction } from '../types';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState(storage.getDashboardMetrics());
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<CustomerTransaction[]>([]);
  const settings = storage.getBusinessSettings();

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setMetrics(storage.getDashboardMetrics());
    setRecentInvoices(storage.getInvoices().slice(-5).reverse());
    setRecentTransactions(storage.getTransactions().slice(-8).reverse());
  };

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Top Banner Warning regarding business scope */}
      <div className="alert alert-info d-flex align-items-center justify-content-between py-2 mb-4 shadow-sm border-0">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-info-circle-fill fs-5 text-primary"></i>
          <div>
            <strong>Strict Scope: Carry Charges Only.</strong> Original Saudi product purchase costs and retail selling prices are deliberately excluded.
          </div>
        </div>
        <Link to="/orders/new" className="btn btn-primary btn-sm d-flex align-items-center gap-1">
          <i className="bi bi-plus-circle"></i> Create Carry Order
        </Link>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-3 mb-4">
        {/* Receivables */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm border-start border-danger border-4 h-100">
            <div className="card-body">
              <div className="text-muted small text-uppercase fw-bold">Customer Receivables</div>
              <div className="fs-3 fw-bold text-danger mt-1">
                {formatCurrency(metrics.totalReceivables, settings.currency)}
              </div>
              <div className="small text-muted mt-2">
                <i className="bi bi-exclamation-triangle text-danger me-1"></i> Total carry charges pending recovery
              </div>
            </div>
          </div>
        </div>

        {/* Total Payments Collected */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm border-start border-success border-4 h-100">
            <div className="card-body">
              <div className="text-muted small text-uppercase fw-bold">Collections Received</div>
              <div className="fs-3 fw-bold text-success mt-1">
                {formatCurrency(metrics.totalPaymentsCollected, settings.currency)}
              </div>
              <div className="small text-muted mt-2">
                <i className="bi bi-cash-coin text-success me-1"></i> Cash & bank transfers verified
              </div>
            </div>
          </div>
        </div>

        {/* Total Carry Invoiced */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm border-start border-primary border-4 h-100">
            <div className="card-body">
              <div className="text-muted small text-uppercase fw-bold">Carry Charges Invoiced</div>
              <div className="fs-3 fw-bold text-primary mt-1">
                {formatCurrency(metrics.totalInvoicedCarryCharges, settings.currency)}
              </div>
              <div className="small text-muted mt-2">
                <i className="bi bi-receipt text-primary me-1"></i> Across {metrics.invoicesCount} confirmed invoices
              </div>
            </div>
          </div>
        </div>

        {/* Customer Advance Credits */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm border-start border-warning border-4 h-100">
            <div className="card-body">
              <div className="text-muted small text-uppercase fw-bold">Customer Advance Credits</div>
              <div className="fs-3 fw-bold text-warning-emphasis mt-1">
                {formatCurrency(metrics.totalAdvanceCredits, settings.currency)}
              </div>
              <div className="small text-muted mt-2">
                <i className="bi bi-wallet2 text-warning me-1"></i> Pre-paid balance / Customer credit
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="row g-4 mb-4">
        {/* Recent Invoices */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0 fw-bold">Recent Carry Charges Invoices</h5>
              <Link to="/invoices" className="btn btn-outline-secondary btn-sm">
                View All <i className="bi bi-arrow-right"></i>
              </Link>
            </div>
            <div className="card-body p-0">
              {recentInvoices.length === 0 ? (
                <div className="text-center py-4 text-muted">No confirmed invoices yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Invoice #</th>
                        <th>Customer</th>
                        <th>Grand Total</th>
                        <th>Paid</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="fw-semibold text-primary">{inv.invoiceNumber}</td>
                          <td>{inv.snapshotData.customer.fullName}</td>
                          <td className="fw-bold">{formatCurrency(inv.grandTotal, settings.currency)}</td>
                          <td>{formatCurrency(inv.amountPaid, settings.currency)}</td>
                          <td>
                            <span
                              className={`badge ${
                                inv.status === 'PAID'
                                  ? 'bg-success'
                                  : inv.status === 'PARTIAL'
                                  ? 'bg-warning text-dark'
                                  : inv.status === 'CANCELLED'
                                  ? 'bg-danger'
                                  : 'bg-secondary'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="text-end">
                            <Link to={`/invoices/${inv.id}`} className="btn btn-sm btn-outline-primary py-0">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & System Info */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="card-title mb-0 fw-bold">Quick Operations</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/orders/new" className="btn btn-primary d-flex align-items-center justify-content-between p-2">
                  <span className="d-flex align-items-center gap-2">
                    <i className="bi bi-cart-plus-fill fs-5"></i>
                    <span className="fw-semibold">New Carry Charges Order</span>
                  </span>
                  <i className="bi bi-chevron-right"></i>
                </Link>

                <Link to="/payments" className="btn btn-outline-success d-flex align-items-center justify-content-between p-2">
                  <span className="d-flex align-items-center gap-2">
                    <i className="bi bi-credit-card-2-front-fill fs-5"></i>
                    <span className="fw-semibold">Record Customer Payment</span>
                  </span>
                  <i className="bi bi-chevron-right"></i>
                </Link>

                <Link to="/customers" className="btn btn-outline-dark d-flex align-items-center justify-content-between p-2">
                  <span className="d-flex align-items-center gap-2">
                    <i className="bi bi-file-earmark-spreadsheet-fill fs-5"></i>
                    <span className="fw-semibold">Customer Account Ledgers & Statements</span>
                  </span>
                  <i className="bi bi-chevron-right"></i>
                </Link>

                <Link to="/products" className="btn btn-outline-secondary d-flex align-items-center justify-content-between p-2">
                  <span className="d-flex align-items-center gap-2">
                    <i className="bi bi-box-seam fs-5"></i>
                    <span className="fw-semibold">Manage Product Carry Rates</span>
                  </span>
                  <i className="bi bi-chevron-right"></i>
                </Link>
              </div>

              <hr />

              <div className="small text-muted">
                <div className="d-flex justify-content-between py-1">
                  <span>Active Customers:</span>
                  <strong className="text-dark">{metrics.activeCustomersCount}</strong>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span>Catalog Products:</span>
                  <strong className="text-dark">{metrics.activeProductsCount}</strong>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span>System Currency:</span>
                  <strong className="text-dark">{settings.currency}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Ledger Activities */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fw-bold">Live Continuous Account Ledger Feed</h5>
          <span className="badge bg-light text-dark border">ACID Synchronized</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th className="text-end">Debit (+)</th>
                  <th className="text-end">Credit (-)</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="small text-muted">{new Date(tx.transactionDate).toLocaleString()}</td>
                    <td>
                      <span
                        className={`badge ${
                          tx.transactionType === 'INVOICE'
                            ? 'bg-danger-subtle text-danger border border-danger-subtle'
                            : tx.transactionType === 'PAYMENT'
                            ? 'bg-success-subtle text-success border border-success-subtle'
                            : 'bg-info-subtle text-info border border-info-subtle'
                        }`}
                      >
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="fw-semibold">{tx.referenceCode || '-'}</td>
                    <td>{tx.description}</td>
                    <td className="text-end fw-semibold text-danger">
                      {tx.debit > 0 ? formatCurrency(tx.debit, settings.currency) : '-'}
                    </td>
                    <td className="text-end fw-semibold text-success">
                      {tx.credit > 0 ? formatCurrency(tx.credit, settings.currency) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
