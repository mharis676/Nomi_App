import { ModalFrame } from '../components/ModalFrame';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isLocal } from '../services/backend';
import { storage } from '../services/storage';
import { formatCurrency, getChargeMethodLabel, getChargeUnitSuffix } from '../utils/finance';
import { Invoice, CustomerTransaction, ChargeMethod } from '../types';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { canEdit } = useAuth();
  const [metrics, setMetrics] = useState(storage.getDashboardMetrics());
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<CustomerTransaction[]>([]);
  const settings = storage.getBusinessSettings();

  // Product Creation Modal State
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [prodName, setProdName] = useState<string>('');
  const [prodSku, setProdSku] = useState<string>('');
  const [prodCategory, setProdCategory] = useState<string>('');
  const [prodChargeMethod, setProdChargeMethod] = useState<ChargeMethod>('PER_UNIT');
  const [prodCarryCharge, setProdCarryCharge] = useState<number>(0);
  const [prodNotes, setProdNotes] = useState<string>('');
  const [prodError, setProdError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setMetrics(storage.getDashboardMetrics());
    setRecentInvoices(storage.getInvoices().slice(-5).reverse());
    setRecentTransactions(storage.getTransactions().slice(-8).reverse());
  };

  const handleOpenProductModal = () => {
    setProdName('');
    setProdSku('');
    setProdCategory('');
    setProdChargeMethod('PER_UNIT');
    setProdCarryCharge(0);
    setProdNotes('');
    setProdError(null);
    setDuplicateWarning(null);
    setShowProductModal(true);
  };

  const handleProdNameChange = (val: string) => {
    setProdName(val);
    if (val.trim().length > 2) {
      const existing = storage.getProducts().find(
        (p) => p.isActive && p.name.trim().toLowerCase() === val.trim().toLowerCase()
      );
      if (existing) {
        setDuplicateWarning(`Catalog notice: Product "${existing.name}" already exists (${getChargeMethodLabel(existing.chargeMethod)}).`);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setProdError('You do not have permission to add products.');
      return;
    }
    if (!prodName.trim()) {
      setProdError('Product name is required.');
      return;
    }
    if (prodCarryCharge < 0) {
      setProdError('Default carry charge cannot be negative.');
      return;
    }

    try {
      setProdError(null);
      const saved = await storage.saveProduct({
        name: prodName.trim(),
        sku: prodSku.trim() || undefined,
        category: prodCategory.trim() || undefined,
        defaultCarryCharge: prodCarryCharge,
        chargeMethod: prodChargeMethod,
        currency: settings.currency,
        notes: prodNotes.trim() || undefined,
        isActive: true,
      });

      setShowProductModal(false);
      refreshData();
      setSuccessNotification(
        `Product "${saved.name}" successfully added to the central catalog with rate ${formatCurrency(saved.defaultCarryCharge, settings.currency)} ${getChargeUnitSuffix(saved.chargeMethod)}. It is immediately available in all billing and order workflows!`
      );
    } catch (err: any) {
      setProdError(err.message || 'Failed to create product.');
    }
  };

  return (
    <div className="container-fluid py-3 py-md-4 px-2 px-sm-3 px-md-4">
      <div className="dashboard-heading"><div><h1>Overview</h1><p>Keep track of carry charges, payments, and customer accounts.</p></div></div>
      {/* Success Notification Alert */}
      {successNotification && (
        <div className="alert alert-success alert-dismissible fade show shadow-sm d-flex align-items-center gap-2 mb-3" role="alert">
          <i className="bi bi-check-circle-fill fs-5 text-success"></i>
          <div className="flex-grow-1">{successNotification}</div>
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setSuccessNotification(null)}></button>
        </div>
      )}

      {/* Top Banner Warning regarding business scope & Primary Action Buttons */}
      <div className="card border-0 bg-primary-subtle text-primary-emphasis shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-info-circle-fill fs-4 text-primary"></i>
              <div>
                <strong className="d-block d-sm-inline">Strict Scope: Carry Charges Only.</strong>{' '}
                <span className="small text-muted d-block d-sm-inline">
                  Original Saudi purchase costs and product selling prices are excluded by design.
                </span>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2 w-100 w-md-auto">
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm flex-fill flex-md-grow-0 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  onClick={handleOpenProductModal}
                >
                  <i className="bi bi-box-seam-fill"></i>
                  <span>Add Product</span>
                </button>
              )}
              <Link
                to="/orders/new"
                className="btn btn-success btn-sm flex-fill flex-md-grow-0 d-flex align-items-center justify-content-center gap-2 shadow-sm"
              >
                <i className="bi bi-plus-circle-fill"></i>
                <span>Create Carry Order</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-2 g-sm-3 mb-4">
        {/* Receivables */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm border-start border-danger border-4 h-100">
            <div className="card-body p-3">
              <div className="text-muted small text-uppercase fw-bold">Customer Receivables</div>
              <div className="fs-4 fs-sm-3 fw-bold text-danger mt-1">
                {formatCurrency(metrics.totalReceivables, settings.currency)}
              </div>
              <div className="small text-muted mt-2">
                <i className="bi bi-exclamation-triangle text-danger me-1"></i> Carry charges pending recovery
              </div>
            </div>
          </div>
        </div>

        {/* Total Payments Collected */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm border-start border-success border-4 h-100">
            <div className="card-body p-3">
              <div className="text-muted small text-uppercase fw-bold">Collections Received</div>
              <div className="fs-4 fs-sm-3 fw-bold text-success mt-1">
                {formatCurrency(metrics.totalPaymentsCollected, settings.currency)}
              </div>
              <div className="small text-muted mt-2">
                <i className="bi bi-cash-coin text-success me-1"></i> Payments recorded
              </div>
            </div>
          </div>
        </div>

        {/* Total Carry Invoiced */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm border-start border-primary border-4 h-100">
            <div className="card-body p-3">
              <div className="text-muted small text-uppercase fw-bold">Carry Charges Invoiced</div>
              <div className="fs-4 fs-sm-3 fw-bold text-primary mt-1">
                {formatCurrency(metrics.totalInvoicedCarryCharges, settings.currency)}
              </div>
              <div className="small text-muted mt-2">
                <i className="bi bi-receipt text-primary me-1"></i> Across {metrics.invoicesCount} invoices
              </div>
            </div>
          </div>
        </div>

        {/* Customer Advance Credits */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm border-start border-warning border-4 h-100">
            <div className="card-body p-3">
              <div className="text-muted small text-uppercase fw-bold">Customer Advance Credits</div>
              <div className="fs-4 fs-sm-3 fw-bold text-warning-emphasis mt-1">
                {formatCurrency(metrics.totalAdvanceCredits, settings.currency)}
              </div>
              <div className="small text-muted mt-2">
                <i className="bi bi-wallet2 text-warning me-1"></i> Advance deposit balance
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="row g-3 g-md-4 mb-4">
        {/* Recent Invoices */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0 fw-bold fs-6 fs-md-5">Recent Invoices</h5>
              <Link to="/invoices" className="btn btn-outline-secondary btn-sm">
                View All <i className="bi bi-arrow-right"></i>
              </Link>
            </div>
            <div className="card-body p-0">
              {recentInvoices.length === 0 ? (
                <div className="text-center py-4 text-muted small">No invoices yet. Create an order to get started.</div>
              ) : (
                <div className="table-responsive" tabIndex={0} role="region" aria-label="Scrollable records">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Invoice #</th>
                        <th>Customer</th>
                        <th className="text-end">Total</th>
                        <th className="text-center">Status</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="fw-semibold text-primary">{inv.invoiceNumber}</td>
                          <td>
                            <div className="fw-semibold text-truncate" style={{ maxWidth: '140px' }}>
                              {inv.snapshotData.customer.fullName}
                            </div>
                          </td>
                          <td className="fw-bold text-end">
                            {formatCurrency(inv.grandTotal, settings.currency)}
                          </td>
                          <td className="text-center">
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

        {/* Quick Operations & System Info */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="card-title mb-0 fw-bold fs-6 fs-md-5">Quick Actions & Catalog Access</h5>
            </div>
            <div className="card-body p-3">
              <div className="d-grid gap-2">
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-primary d-flex align-items-center justify-content-between p-2 shadow-sm text-start"
                    onClick={handleOpenProductModal}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <i className="bi bi-box-seam-fill fs-5"></i>
                      <div>
                        <div className="fw-semibold">Add New Product to Catalog</div>
                        <div className="small text-white-50" style={{ fontSize: '11px' }}>
                          Per Unit, Per Order, or Per KG rates
                        </div>
                      </div>
                    </span>
                    <i className="bi bi-plus-circle"></i>
                  </button>
                )}

                <Link to="/orders/new" className="btn btn-outline-primary d-flex align-items-center justify-content-between p-2 text-start">
                  <span className="d-flex align-items-center gap-2">
                    <i className="bi bi-cart-plus-fill fs-5"></i>
                    <span className="fw-semibold">New Carry Order</span>
                  </span>
                  <i className="bi bi-chevron-right"></i>
                </Link>

                <Link to="/payments" className="btn btn-outline-success d-flex align-items-center justify-content-between p-2 text-start">
                  <span className="d-flex align-items-center gap-2">
                    <i className="bi bi-credit-card-2-front-fill fs-5"></i>
                    <span className="fw-semibold">Record Payment</span>
                  </span>
                  <i className="bi bi-chevron-right"></i>
                </Link>

                <Link to="/customers" className="btn btn-outline-dark d-flex align-items-center justify-content-between p-2 text-start">
                  <span className="d-flex align-items-center gap-2">
                    <i className="bi bi-people-fill fs-5"></i>
                    <span className="fw-semibold">Customer Account Ledgers</span>
                  </span>
                  <i className="bi bi-chevron-right"></i>
                </Link>
              </div>

              <hr className="my-3" />

              <div className="small text-muted">
                <div className="d-flex justify-content-between py-1">
                  <span>Catalog Products:</span>
                  <strong className="text-dark">{metrics.activeProductsCount} active items</strong>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span>Active Customers:</span>
                  <strong className="text-dark">{metrics.activeCustomersCount}</strong>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span>Supported Methods:</span>
                  <span className="badge bg-light text-dark border">Per Unit | Per KG | Per Order</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Ledger Activities */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fw-bold fs-6 fs-md-5">Recent account activity</h5>
          <span className="badge bg-light text-dark border">{isLocal ? 'This browser' : 'Workspace ledger'}</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive" tabIndex={0} role="region" aria-label="Scrollable records">
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
                {recentTransactions.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">No account activity yet.</td></tr>}
                {recentTransactions.map((tx) => (
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
                    <td className="fw-semibold text-truncate" style={{ maxWidth: '120px' }}>
                      {tx.referenceCode || '-'}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '220px' }}>
                      {tx.description}
                    </td>
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

      {/* Add Product Modal Directly from Dashboard */}
      {showProductModal && (
        <ModalFrame onClose={() => setShowProductModal(false)}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-box-seam me-2"></i>Add Product to Central Catalog
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white" aria-label="Close"
                  onClick={() => setShowProductModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSaveProduct}>
                <div className="modal-body p-3 p-sm-4">
                  {prodError && (
                    <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
                      <i className="bi bi-exclamation-octagon-fill"></i>
                      <span>{prodError}</span>
                    </div>
                  )}

                  {duplicateWarning && (
                    <div className="alert alert-warning py-2 small d-flex align-items-center gap-2 mb-3">
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      <span>{duplicateWarning}</span>
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="dashboard-field-1" className="form-label fw-semibold">Product Name *</label>
                    <input id="dashboard-field-1"
                      type="text"
                      className="form-control"
                      value={prodName}
                      onChange={(e) => handleProdNameChange(e.target.value)}
                      placeholder="e.g. Saudi Madinah Almonds or Luxury Abaya Box"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-12 col-sm-6">
                      <label htmlFor="dashboard-field-2" className="form-label small fw-semibold">SKU / Code</label>
                      <input id="dashboard-field-2"
                        type="text"
                        className="form-control form-control-sm"
                        value={prodSku}
                        onChange={(e) => setProdSku(e.target.value)}
                        placeholder="e.g. SAUDI-ALM-KG"
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label htmlFor="dashboard-field-3" className="form-label small fw-semibold">Category</label>
                      <input id="dashboard-field-3"
                        type="text"
                        className="form-control form-control-sm"
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value)}
                        placeholder="e.g. Dry Fruits, Fragrance, Garments"
                      />
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-12 col-sm-6">
                      <label htmlFor="dashboard-field-4" className="form-label small fw-semibold">Charge Method (Unit of Measure) *</label>
                      <select id="dashboard-field-4"
                        className="form-select form-select-sm"
                        value={prodChargeMethod}
                        onChange={(e) => setProdChargeMethod(e.target.value as ChargeMethod)}
                        required
                      >
                        <option value="PER_UNIT">Per Unit (per piece / pack)</option>
                        <option value="PER_KG">Per KG (Kilogram weight cargo)</option>
                        <option value="PER_ORDER">Per Order (Flat Consignment Fee)</option>
                      </select>
                    </div>
                    <div className="col-12 col-sm-6">
                      <label htmlFor="dashboard-field-5" className="form-label small fw-semibold">
                        Default Carry Rate ({settings.currency} {getChargeUnitSuffix(prodChargeMethod)}) *
                      </label>
                      <input id="dashboard-field-5"
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control form-control-sm"
                        value={prodCarryCharge}
                        onChange={(e) => setProdCarryCharge(parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label htmlFor="dashboard-field-6" className="form-label small fw-semibold">Product Description / Freight Handling Notes</label>
                    <textarea id="dashboard-field-6"
                      className="form-control form-control-sm"
                      rows={2}
                      value={prodNotes}
                      onChange={(e) => setProdNotes(e.target.value)}
                      placeholder="e.g. Special packing or airport luggage scale requirements..."
                    ></textarea>
                  </div>

                  <div className="text-muted" style={{ fontSize: '11px' }}>
                    <i className="bi bi-shield-check text-primary me-1"></i>
                    This product will be permanently stored in the central catalog and immediately selectable when creating carry orders.
                  </div>
                </div>
                <div className="modal-footer p-2 p-sm-3 bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowProductModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm fw-bold">
                    <i className="bi bi-check-lg me-1"></i> Save to Central Catalog
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalFrame>
      )}
    </div>
  );
};
