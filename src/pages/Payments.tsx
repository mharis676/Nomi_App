import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { Payment, Customer, Invoice, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/finance';
import { useAuth } from '../context/AuthContext';

export const Payments: React.FC = () => {
  const { canEdit } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const settings = storage.getBusinessSettings();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPayments(storage.getPayments().reverse());
    const custs = storage.getCustomers().filter((c) => c.isActive);
    setCustomers(custs);
    setInvoices(storage.getInvoices().filter((i) => i.status !== 'CANCELLED' && i.status !== 'PAID'));
    if (custs.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(custs[0].id);
    }
  };

  const handleOpenModal = () => {
    setAmount(0);
    setReferenceNumber('');
    setNotes('');
    setSelectedInvoiceId('');
    setError(null);
    setShowModal(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setError('You do not have permission to post payments.');
      return;
    }
    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }
    if (amount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    try {
      const idempotencyKey = `PAY-${selectedCustomerId}-${Date.now()}`;
      storage.recordPayment({
        customerId: selectedCustomerId,
        invoiceId: selectedInvoiceId || undefined,
        amount,
        paymentMethod,
        paymentDate,
        referenceNumber,
        notes,
        idempotencyKey,
      });

      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    }
  };

  // Find customer unpaid invoices when customer is selected
  const customerUnpaidInvoices = invoices.filter((i) => i.customerId === selectedCustomerId);

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">Customer Payments Registry</h3>
          <p className="text-muted small mb-0">
            Immutable payment receipts. Payments post credit adjustments directly to the customer account ledger.
          </p>
        </div>
        {canEdit && (
          <button className="btn btn-success d-flex align-items-center gap-2 shadow-sm" onClick={handleOpenModal}>
            <i className="bi bi-cash-stack"></i> Record New Payment
          </button>
        )}
      </div>

      {/* Payment Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {payments.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-wallet2 fs-1 text-secondary mb-2 d-block"></i>
              No payment transactions recorded yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Receipt #</th>
                    <th>Date</th>
                    <th>Customer Name</th>
                    <th>Method</th>
                    <th>Invoice Reference</th>
                    <th>Ref / Bank Slip</th>
                    <th className="text-end">Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const cust = storage.getCustomer(p.customerId);
                    const inv = p.invoiceId ? storage.getInvoice(p.invoiceId) : null;

                    return (
                      <tr key={p.id}>
                        <td className="fw-semibold text-primary">{p.paymentNumber}</td>
                        <td className="small text-muted">{p.paymentDate}</td>
                        <td className="fw-semibold">{cust ? cust.fullName : 'Customer'}</td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td>
                          {inv ? (
                            <span className="badge bg-info-subtle text-info border border-info-subtle">
                              {inv.invoiceNumber}
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                              Advance / Unallocated
                            </span>
                          )}
                        </td>
                        <td>{p.referenceNumber || '-'}</td>
                        <td className="text-end fw-bold text-success fs-6">
                          {formatCurrency(p.amount, settings.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">Record Customer Payment</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleRecordPayment}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Customer *</label>
                    <select
                      className="form-select"
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        setSelectedInvoiceId('');
                      }}
                      required
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.customerCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Apply to Specific Invoice (Optional)</label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedInvoiceId}
                      onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    >
                      <option value="">General Account Payment / Advance Credit</option>
                      {customerUnpaidInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} — Due: {formatCurrency(inv.grandTotal - inv.amountPaid, settings.currency)} (Total: {formatCurrency(inv.grandTotal, settings.currency)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Payment Amount ({settings.currency}) *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="form-control form-control-lg"
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold">Method</label>
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
                      <label className="form-label small fw-semibold">Date</label>
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
                    <label className="form-label small fw-semibold">Reference / Slip Number</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. Bank Ref or Cash Voucher #"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Notes</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success fw-bold">
                    Save & Post Credit
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
