import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storage } from '../services/storage';
import { Customer, CustomerTransaction, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/finance';
import { generateStatementPDF } from '../utils/pdf';
import { useAuth } from '../context/AuthContext';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { canEdit } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [statement, setStatement] = useState<{
    openingBalance: number;
    debits: number;
    credits: number;
    closingBalance: number;
    statementTransactions: Array<CustomerTransaction & { runningBalance: number }>;
  } | null>(null);

  // Date filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const settings = storage.getBusinessSettings();

  useEffect(() => {
    if (id) {
      loadCustomerData(id);
    }
  }, [id, startDate, endDate]);

  const loadCustomerData = (custId: string) => {
    const cust = storage.getCustomer(custId);
    if (cust) {
      setCustomer(cust);
      const stmt = storage.getCustomerStatement(cust.id, startDate, endDate);
      setStatement(stmt);
    }
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }

    try {
      setPaymentError(null);
      storage.recordPayment({
        customerId: customer.id,
        amount: paymentAmount,
        paymentMethod,
        paymentDate,
        referenceNumber,
        notes: paymentNotes,
      });

      setShowPaymentModal(false);
      setPaymentAmount(0);
      setReferenceNumber('');
      setPaymentNotes('');
      loadCustomerData(customer.id);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment');
    }
  };

  if (!customer || !statement) {
    return (
      <div className="container py-5 text-center">
        <h4>Customer not found</h4>
        <Link to="/customers" className="btn btn-primary mt-3">
          Back to Customers
        </Link>
      </div>
    );
  }

  const isOwed = statement.closingBalance > 0;
  const isCredit = statement.closingBalance < 0;

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Top Banner and Navigation */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div className="d-flex align-items-center gap-2">
          <Link to="/customers" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i> Customers
          </Link>
          <h4 className="fw-bold mb-0">
            {customer.fullName}{' '}
            <span className="badge bg-light text-dark border ms-2">{customer.customerCode}</span>
          </h4>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {canEdit && (
            <button
              className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm"
              onClick={() => setShowPaymentModal(true)}
            >
              <i className="bi bi-cash-stack"></i> Record Payment
            </button>
          )}

          <button
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
            onClick={() => generateStatementPDF(customer, statement, settings, startDate, endDate)}
          >
            <i className="bi bi-file-earmark-pdf"></i> Download Statement PDF
          </button>

          <Link to="/orders/new" className="btn btn-primary btn-sm d-flex align-items-center gap-1">
            <i className="bi bi-plus-circle"></i> New Carry Order
          </Link>
        </div>
      </div>

      {/* Customer Overview Info & KPI */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted text-uppercase small fw-bold mb-3">Customer Profile</h6>
              <div className="mb-1"><strong>Phone:</strong> {customer.phone || 'N/A'}</div>
              <div className="mb-1"><strong>Address:</strong> {customer.address || 'N/A'}</div>
              <div className="mb-1"><strong>Status:</strong> {customer.isActive ? 'Active' : 'Archived'}</div>
              {customer.notes && <div className="text-muted small mt-2"><strong>Notes:</strong> {customer.notes}</div>}
            </div>
          </div>
        </div>

        <div className="col-12 col-md-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted text-uppercase small fw-bold mb-3">Account Reconciliation Summary</h6>
              <div className="row text-center g-2">
                <div className="col-6 col-sm-3">
                  <div className="p-2 bg-light rounded">
                    <div className="small text-muted">Opening Balance</div>
                    <div className="fw-bold fs-6">{formatCurrency(statement.openingBalance, settings.currency)}</div>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="p-2 bg-light rounded">
                    <div className="small text-muted">Total Carry Charges</div>
                    <div className="fw-bold fs-6 text-danger">+ {formatCurrency(statement.debits, settings.currency)}</div>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="p-2 bg-light rounded">
                    <div className="small text-muted">Payments Received</div>
                    <div className="fw-bold fs-6 text-success">- {formatCurrency(statement.credits, settings.currency)}</div>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className={`p-2 rounded ${isOwed ? 'bg-danger-subtle' : isCredit ? 'bg-warning-subtle' : 'bg-success-subtle'}`}>
                    <div className="small fw-semibold">Closing Balance</div>
                    <div className={`fw-bold fs-5 ${isOwed ? 'text-danger' : isCredit ? 'text-warning-emphasis' : 'text-success'}`}>
                      {formatCurrency(statement.closingBalance, settings.currency)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center mt-2 small text-muted">
                Formula verified: Opening ({statement.openingBalance}) + Debits ({statement.debits}) - Credits ({statement.credits}) = Closing ({statement.closingBalance})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-sm-4 col-md-3">
              <label className="form-label small fw-semibold mb-1">From Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="col-12 col-sm-4 col-md-3">
              <label className="form-label small fw-semibold mb-1">To Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="col-12 col-sm-4 col-md-3 d-flex align-items-end gap-2 mt-sm-auto">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Ledger Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fw-bold">Customer Account Ledger</h5>
          <span className="small text-muted">{statement.statementTransactions.length} entries in period</span>
        </div>
        <div className="card-body p-0">
          {statement.statementTransactions.length === 0 ? (
            <div className="text-center py-5 text-muted">
              No transactions recorded in this period.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Description</th>
                    <th className="text-end">Debit (Charges)</th>
                    <th className="text-end">Credit (Payments)</th>
                    <th className="text-end">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.statementTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="small text-muted">{new Date(tx.transactionDate).toLocaleDateString()}</td>
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
                      <td className="fw-semibold">
                        {tx.referenceId && tx.transactionType === 'INVOICE' ? (
                          <Link to={`/invoices/${tx.referenceId}`} className="text-decoration-none">
                            {tx.referenceCode}
                          </Link>
                        ) : (
                          tx.referenceCode || '-'
                        )}
                      </td>
                      <td>{tx.description}</td>
                      <td className="text-end fw-semibold text-danger">
                        {tx.debit > 0 ? formatCurrency(tx.debit, settings.currency) : '-'}
                      </td>
                      <td className="text-end fw-semibold text-success">
                        {tx.credit > 0 ? formatCurrency(tx.credit, settings.currency) : '-'}
                      </td>
                      <td className="text-end fw-bold">
                        <span className={tx.runningBalance > 0 ? 'text-danger' : tx.runningBalance < 0 ? 'text-warning-emphasis' : 'text-success'}>
                          {formatCurrency(tx.runningBalance, settings.currency)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">Record Customer Payment</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPaymentModal(false)}></button>
              </div>
              <form onSubmit={handleRecordPayment}>
                <div className="modal-body">
                  {paymentError && <div className="alert alert-danger py-2 small">{paymentError}</div>}

                  <div className="p-2 bg-light rounded mb-3 small">
                    <div><strong>Customer:</strong> {customer.fullName} ({customer.customerCode})</div>
                    <div>
                      <strong>Current Balance:</strong>{' '}
                      <span className={isOwed ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                        {formatCurrency(statement.closingBalance, settings.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Payment Amount ({settings.currency}) *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="form-control form-control-lg"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      required
                    />
                    <div className="form-text small">
                      Supports full settlement, partial payments, or advance deposits.
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold">Payment Method</label>
                      <select
                        className="form-select form-select-sm"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      >
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="ONLINE">Online / Wire</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold">Payment Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Bank / Receipt Reference #</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. TRX-987654 or Slip 12"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Payment Notes</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      placeholder="Additional notes..."
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success fw-bold">
                    Confirm & Post Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

