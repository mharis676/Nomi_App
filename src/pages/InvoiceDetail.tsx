import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { storage } from '../services/storage';
import { Invoice, InvoiceRevision, OrderItem } from '../types';
import { formatCurrency, calculateOrderTotals } from '../utils/finance';
import { generateInvoicePDF } from '../utils/pdf';
import { useAuth } from '../context/AuthContext';

export const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit, isOwner } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [revisions, setRevisions] = useState<InvoiceRevision[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editAdditional, setEditAdditional] = useState<number>(0);
  const [revisionReason, setRevisionReason] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const settings = storage.getBusinessSettings();

  useEffect(() => {
    if (id) {
      loadInvoice(id);
    }
  }, [id]);

  const loadInvoice = (invId: string) => {
    const inv = storage.getInvoice(invId);
    if (inv) {
      setInvoice(inv);
      setRevisions(storage.getInvoiceRevisions(inv.id));
      setEditItems(JSON.parse(JSON.stringify(inv.snapshotData.items)));
      setEditDiscount(inv.discount);
      setEditAdditional(inv.additionalCharges);
    }
  };

  if (!invoice) {
    return (
      <div className="container py-5 text-center">
        <h4>Invoice not found</h4>
        <Link to="/invoices" className="btn btn-primary mt-3">
          Back to Invoices
        </Link>
      </div>
    );
  }

  let calculatedEditTotals = calculateOrderTotals([], 0, 0);
  let editCalculationError: string | null = null;
  try { calculatedEditTotals = calculateOrderTotals(editItems, editDiscount, editAdditional); }
  catch (cause) { editCalculationError = cause instanceof Error ? cause.message : 'Check invoice amounts.'; }
  const editDifference = calculatedEditTotals.grandTotal - invoice.grandTotal;

  const handleUpdateItem = (index: number, updates: Partial<OrderItem>) => {
    const updated = [...editItems];
    const item = { ...updated[index], ...updates };
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.carryCharge) || 0;

    if (item.chargeMethod === 'PER_KG') {
      item.weightKg = qty;
    }

    item.lineTotal = item.chargeMethod === 'PER_ORDER' ? rate : Number((qty * rate).toFixed(2));
    updated[index] = item;
    setEditItems(updated);
  };

  const handleSaveRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionReason.trim()) {
      setError('Please provide a mandatory reason for this revision.');
      return;
    }

    try {
      setError(null);
      const updated = await storage.reviseInvoice(
        invoice.id,
        editItems,
        editDiscount,
        editAdditional,
        revisionReason
      );
      setInvoice(updated);
      setRevisions(storage.getInvoiceRevisions(invoice.id));
      setIsEditing(false);
      setRevisionReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to save revision');
    }
  };

  const handleCancelInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setError('Please enter a cancellation justification.');
      return;
    }

    try {
      setError(null);
      const updated = await storage.cancelInvoice(invoice.id, cancelReason);
      setInvoice(updated);
      setIsCancelling(false);
      setCancelReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel invoice');
    }
  };

  const balanceDue = Math.max(0, invoice.grandTotal - invoice.amountPaid);

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {isEditing && editCalculationError && <div role="alert" className="alert alert-danger">{editCalculationError}</div>}
      {/* Top action buttons */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-4">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/invoices')}>
            <i className="bi bi-arrow-left me-1"></i> Invoices
          </button>
          <h4 className="fw-bold mb-0">
            Invoice: <span className="text-primary">{invoice.invoiceNumber}</span>
          </h4>
          <span className="badge bg-secondary">Rev #{invoice.currentRevision}</span>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
            onClick={() => void generateInvoicePDF(invoice, settings).catch(cause => setError(cause instanceof Error ? cause.message : 'Could not export invoice.'))}
          >
            <i className="bi bi-file-earmark-pdf"></i> Download PDF
          </button>
          <button
            className="btn btn-outline-dark btn-sm d-flex align-items-center gap-1"
            onClick={() => window.print()}
          >
            <i className="bi bi-printer"></i> Print
          </button>

          {canEdit && invoice.status !== 'CANCELLED' && !isEditing && (
            <button
              className="btn btn-warning btn-sm d-flex align-items-center gap-1"
              onClick={() => setIsEditing(true)}
            >
              <i className="bi bi-pencil-square"></i> Edit / Revise
            </button>
          )}

          {isOwner && invoice.status !== 'CANCELLED' && (
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => setIsCancelling(true)}
            >
              Cancel Invoice
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-octagon-fill me-2"></i>
          {error}
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Editing / Revision Mode */}
      {isEditing && (
        <div className="card border-warning shadow-sm mb-4">
          <div className="card-header bg-warning text-dark py-3 d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0 fw-bold">
              <i className="bi bi-pencil-fill me-2"></i> Revise Invoice {invoice.invoiceNumber} (Revision #{invoice.currentRevision + 1})
            </h5>
            <button className="btn btn-outline-dark btn-sm" onClick={() => setIsEditing(false)}>
              Cancel Edit
            </button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSaveRevision}>
              <div className="table-responsive mb-3">
                <table className="table table-bordered align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Product Description</th>
                      <th style={{ width: '130px' }}>Method</th>
                      <th style={{ width: '110px' }}>Quantity</th>
                      <th style={{ width: '150px' }}>Carry Rate</th>
                      <th style={{ width: '130px' }} className="text-end">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map((item, idx) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            aria-label="Item description" value={item.productNameSnapshot}
                            onChange={(e) => handleUpdateItem(idx, { productNameSnapshot: e.target.value })}
                            required
                          />
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            aria-label="Charge method" value={item.chargeMethod}
                            onChange={(e) => handleUpdateItem(idx, { chargeMethod: e.target.value as any })}
                          >
                            <option value="PER_UNIT">Per Unit</option>
                            <option value="PER_KG">Per KG</option>
                            <option value="PER_ORDER">Per Order</option>
                          </select>
                        </td>
                        <td>
                          <div className="input-group input-group-sm">
                            <input
                              type="number"
                              min="0.01"
                              step={item.chargeMethod === 'PER_KG' ? '0.01' : '1'}
                              className="form-control form-control-sm"
                              aria-label="Quantity or weight" value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                              required
                            />
                            {item.chargeMethod === 'PER_KG' && <span className="input-group-text">KG</span>}
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-control form-control-sm"
                            aria-label="Carry rate" value={item.carryCharge}
                            onChange={(e) => handleUpdateItem(idx, { carryCharge: parseFloat(e.target.value) || 0 })}
                            required
                          />
                        </td>
                        <td className="text-end fw-bold">
                          {formatCurrency(item.lineTotal, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold">Discount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control form-control-sm"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold">Additional Charges</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control form-control-sm"
                    value={editAdditional}
                    onChange={(e) => setEditAdditional(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <div className="p-2 bg-light border rounded">
                    <div className="small text-muted">Original Total: {formatCurrency(invoice.grandTotal, invoice.currency)}</div>
                    <div className="fw-bold">Revised Total: {formatCurrency(calculatedEditTotals.grandTotal, invoice.currency)}</div>
                    <div className={`small fw-bold ${editDifference >= 0 ? 'text-danger' : 'text-success'}`}>
                      Difference: {editDifference >= 0 ? `+${editDifference}` : editDifference} {invoice.currency}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold text-danger">Mandatory Reason for Revision *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Customer reduced parcel weight, renegotiated rates, etc."
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  required
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning fw-bold">
                  Save Revision & Reconcile Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Invoice Modal/Block */}
      {isCancelling && (
        <div className="card border-danger shadow-sm mb-4">
          <div className="card-header bg-danger text-white py-2">
            <h5 className="card-title mb-0">Cancel Invoice & Post Reversal</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleCancelInvoice}>
              <p className="text-muted small">
                Cancelling this invoice will mark it CANCELLED and immediately credit the customer ledger for the full invoice amount. Historical payments will be retained intact.
              </p>
              <div className="mb-3">
                <label className="form-label fw-semibold">Cancellation Justification *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Reason for cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsCancelling(false)}>
                  Dismiss
                </button>
                <button type="submit" className="btn btn-danger btn-sm fw-bold">
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Document Paper Card */}
      <div className="card border-0 shadow-sm p-4 mb-4 bg-white" style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Document Header */}
        <div className="d-flex justify-content-between align-items-start border-bottom pb-4 mb-4">
          <div>
            <h3 className="fw-bold text-dark mb-1">{settings.businessName}</h3>
            <div className="text-muted small">{settings.address}</div>
            <div className="text-muted small">Phone: {settings.phone} | Email: {settings.email}</div>
          </div>
          <div className="text-end">
            <h2 className="fw-bold text-danger mb-0">CARRY CHARGES INVOICE</h2>
            <div className="text-muted small fst-italic">
              Carry charges only; product purchase/selling prices are not included.
            </div>
          </div>
        </div>

        {/* Invoice Info & Customer Box */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-6">
            <div className="p-3 bg-light rounded border h-100">
              <div className="text-muted small text-uppercase fw-bold">Billed To (Customer):</div>
              <h5 className="fw-bold mb-1 mt-1 text-primary">{invoice.snapshotData.customer.fullName}</h5>
              <div className="text-muted small">Code: {invoice.snapshotData.customer.customerCode}</div>
              <div className="text-muted small">Phone: {invoice.snapshotData.customer.phone || 'N/A'}</div>
              <div className="text-muted small">Address: {invoice.snapshotData.customer.address || 'N/A'}</div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="p-3 bg-light rounded border h-100">
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted small">Invoice Number:</span>
                <span className="fw-bold text-dark">{invoice.invoiceNumber}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted small">Issue Date:</span>
                <span className="fw-semibold">{invoice.issueDate}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted small">Current Revision:</span>
                <span className="badge bg-secondary">Revision #{invoice.currentRevision}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted small">Status:</span>
                <span className={`badge ${invoice.status === 'PAID' ? 'bg-success' : 'bg-danger'}`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="table-responsive mb-4">
          <table className="table table-bordered align-middle">
            <thead className="table-dark">
              <tr>
                <th style={{ width: '40px' }} className="text-center">#</th>
                <th>Item (Consignment Cargo)</th>
                <th className="text-center" style={{ width: '135px' }}>Method</th>
                <th className="text-center" style={{ width: '110px' }}>Qty / Weight</th>
                <th className="text-end" style={{ width: '140px' }}>Carry Rate</th>
                <th className="text-end" style={{ width: '150px' }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.snapshotData.items.map((item, idx) => {
                const isPerKg = item.chargeMethod === 'PER_KG';
                const methodLabel = isPerKg
                  ? 'Per KG'
                  : item.chargeMethod === 'PER_ORDER'
                  ? 'Per Order Flat'
                  : 'Per Unit';
                const qtyOrWeight = isPerKg
                  ? `${item.weightKg ?? item.quantity} KG`
                  : item.quantity;
                const rateText = `${formatCurrency(item.carryCharge, invoice.currency)}${isPerKg ? '/kg' : ''}`;

                return (
                  <tr key={item.id}>
                    <td className="text-center">{idx + 1}</td>
                    <td className="fw-semibold">{item.productNameSnapshot}</td>
                    <td className="text-center small text-muted">{methodLabel}</td>
                    <td className="text-center fw-semibold">{qtyOrWeight}</td>
                    <td className="text-end">{rateText}</td>
                    <td className="text-end fw-bold">{formatCurrency(item.lineTotal, invoice.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals Breakdown */}
        <div className="row justify-content-end mb-4">
          <div className="col-12 col-md-5">
            <div className="d-flex justify-content-between py-1">
              <span className="text-muted">Subtotal Carry Charges:</span>
              <span className="fw-semibold">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="d-flex justify-content-between py-1 text-danger">
                <span>Discount:</span>
                <span>- {formatCurrency(invoice.discount, invoice.currency)}</span>
              </div>
            )}
            {invoice.additionalCharges > 0 && (
              <div className="d-flex justify-content-between py-1 text-primary">
                <span>Additional Handling:</span>
                <span>+ {formatCurrency(invoice.additionalCharges, invoice.currency)}</span>
              </div>
            )}
            <hr className="my-2" />
            <div className="d-flex justify-content-between py-2 fs-5 fw-bold text-dark">
              <span>Grand Total:</span>
              <span className="text-primary">{formatCurrency(invoice.grandTotal, invoice.currency)}</span>
            </div>
            <div className="d-flex justify-content-between py-1 text-success fw-semibold">
              <span>Amount Paid:</span>
              <span>{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
            </div>
            <div className="d-flex justify-content-between py-1 fs-6 fw-bold text-danger border-top">
              <span>Outstanding Balance Due:</span>
              <span>{formatCurrency(balanceDue, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="border-top pt-3 text-center text-muted small">
          {settings.invoiceFooterNote}
        </div>
      </div>

      {/* Revision History Section */}
      <div className="card border-0 shadow-sm" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="card-header bg-white py-3">
          <h5 className="card-title mb-0 fw-bold">Immutable Revision Audit Log</h5>
        </div>
        <div className="card-body p-0">
          {revisions.length === 0 ? (
            <div className="text-center py-4 text-muted small">
              This invoice is at its original revision (v1) with no subsequent modifications.
            </div>
          ) : (
            <div className="table-responsive" tabIndex={0} role="region" aria-label="Scrollable records">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Revision</th>
                    <th>Date / Time</th>
                    <th>Previous Total</th>
                    <th>New Total</th>
                    <th>Difference</th>
                    <th>Justification</th>
                  </tr>
                </thead>
                <tbody>
                  {revisions.map((rev) => (
                    <tr key={rev.id}>
                      <td><span className="badge bg-secondary">v{rev.revisionNumber}</span></td>
                      <td className="small text-muted">{new Date(rev.createdAt).toLocaleString()}</td>
                      <td>{formatCurrency(rev.previousTotal, invoice.currency)}</td>
                      <td className="fw-bold">{formatCurrency(rev.newTotal, invoice.currency)}</td>
                      <td>
                        <span className={`badge ${rev.difference >= 0 ? 'bg-danger' : 'bg-success'}`}>
                          {rev.difference >= 0 ? `+${rev.difference}` : rev.difference}
                        </span>
                      </td>
                      <td>{rev.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

