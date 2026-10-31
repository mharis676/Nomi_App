import { ModalFrame } from '../components/ModalFrame';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/storage';
import { Customer, Product, OrderItem, ChargeMethod } from '../types';
import { calculateOrderTotals, formatCurrency, getChargeMethodLabel, getChargeUnitSuffix } from '../utils/finance';
import { useAuth } from '../context/AuthContext';

interface OrderItemForm extends OrderItem {
  isOverridden?: boolean;
}

export const NewOrder: React.FC = () => {
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [items, setItems] = useState<OrderItemForm[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inline Quick Add Product Modal
  const [showQuickAddProduct, setShowQuickAddProduct] = useState<boolean>(false);
  const [quickName, setQuickName] = useState<string>('');
  const [quickCategory, setQuickCategory] = useState<string>('');
  const [quickChargeMethod, setQuickChargeMethod] = useState<ChargeMethod>('PER_UNIT');
  const [quickRate, setQuickRate] = useState<number>(0);
  const [quickError, setQuickError] = useState<string | null>(null);

  const settings = storage.getBusinessSettings();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const custs = storage.getCustomers().filter((c) => c.isActive);
    const prods = storage.getProducts().filter((p) => p.isActive);
    setCustomers(custs);
    setProducts(prods);
    if (custs.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(custs[0].id);
    }
  };

  const handleAddItem = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const initialQuantity = product.chargeMethod === 'PER_KG' ? 1.0 : 1;
    const initialTotal = product.chargeMethod === 'PER_ORDER' ? product.defaultCarryCharge : product.defaultCarryCharge * initialQuantity;

    const newItem: OrderItemForm = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      productId: product.id,
      productNameSnapshot: product.name,
      quantity: initialQuantity,
      weightKg: product.chargeMethod === 'PER_KG' ? initialQuantity : undefined,
      chargeMethod: product.chargeMethod,
      carryCharge: product.defaultCarryCharge,
      lineTotal: initialTotal,
      isOverridden: false,
    };

    setItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, updates: Partial<OrderItemForm>) => {
    const updated = [...items];
    const current = updated[index];
    const item = { ...current, ...updates };

    const qty = Number(item.quantity) || 0;
    const rate = Number(item.carryCharge) || 0;

    if (item.chargeMethod === 'PER_KG') {
      item.weightKg = qty;
    }

    if (item.chargeMethod === 'PER_ORDER') {
      item.lineTotal = rate;
    } else {
      // PER_UNIT or PER_KG: qty/weight * rate
      item.lineTotal = Number((qty * rate).toFixed(2));
    }

    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleQuickCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      setQuickError('Product name is required.');
      return;
    }
    if (quickRate < 0) {
      setQuickError('Carry rate cannot be negative.');
      return;
    }

    try {
      setQuickError(null);
      const saved = await storage.saveProduct({
        name: quickName.trim(),
        category: quickCategory.trim() || undefined,
        defaultCarryCharge: quickRate,
        chargeMethod: quickChargeMethod,
        currency: settings.currency,
        isActive: true,
      });

      // Reload products and auto-add the new product
      const updatedProds = storage.getProducts().filter((p) => p.isActive);
      setProducts(updatedProds);
      handleAddItem(saved.id);

      setShowQuickAddProduct(false);
      setQuickName('');
      setQuickCategory('');
      setQuickRate(0);
      setQuickChargeMethod('PER_UNIT');
    } catch (err: any) {
      setQuickError(err.message || 'Failed to create product.');
    }
  };

  let calculationError: string | null = null;
  let totals = calculateOrderTotals([], 0, 0);
  try {
    totals = calculateOrderTotals(items, discount, additionalCharges);
  } catch (cause) {
    calculationError = cause instanceof Error ? cause.message : 'Check the order amounts.';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setError('You do not have permission to confirm orders.');
      return;
    }
    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one product item to the order.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const { invoice } = await storage.confirmOrder({
        customerId: selectedCustomerId,
        items,
        discount,
        additionalCharges,
        notes,
      });

      navigate(`/invoices/${invoice.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm order');
      setIsSubmitting(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="container-fluid py-3 py-md-4 px-2 px-sm-3 px-md-4">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
        <div>
          <h3 className="fw-bold mb-1">New Carry Charges Order</h3>
          <p className="text-muted small mb-0">
            Build and confirm carry charges invoice. Supports Per Unit, Per KG (weight), and Per Order charges.
          </p>
        </div>
      </div>

      {(error || calculationError) && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error || calculationError}
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setError(null)}></button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row g-3 g-lg-4">
          {/* Order Details Left Column */}
          <div className="col-12 col-lg-8">
            {/* Customer Selection Card */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header bg-white py-3">
                <h5 className="card-title mb-0 fw-bold fs-6 fs-md-5">1. Select Customer</h5>
              </div>
              <div className="card-body p-3">
                <div className="row g-2 align-items-center">
                  <div className="col-12 col-md-8">
                    <label className="form-label fw-semibold small">Customer Name & Code *</label>
                    <select aria-label="Customer name and code"
                      className="form-select"
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      required
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.customerCode}) {c.phone ? `— ${c.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    {selectedCustomer && (
                      <div className="p-2 bg-light rounded border text-muted small mt-md-4">
                        <div><strong>Address:</strong> {selectedCustomer.address || 'N/A'}</div>
                        <div>
                          <strong>Current Balance:</strong>{' '}
                          {formatCurrency(storage.getCustomerStatement(selectedCustomer.id).closingBalance, settings.currency)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items Card */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header bg-white py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                <h5 className="card-title mb-0 fw-bold fs-6 fs-md-5">2. Order Items (Carry Cargo)</h5>
                <div className="d-flex gap-2">
                  <div className="dropdown">
                    <button
                      className="btn btn-primary btn-sm dropdown-toggle d-flex align-items-center gap-1"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <i className="bi bi-plus-lg"></i> Add from Catalog
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end shadow" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <li><h6 className="dropdown-header">Select Product:</h6></li>
                      {products.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="dropdown-item d-flex justify-content-between align-items-center py-2"
                            onClick={() => handleAddItem(p.id)}
                          >
                            <span className="me-2">{p.name}</span>
                            <span className="badge bg-light text-dark border">
                              {formatCurrency(p.defaultCarryCharge, p.currency)} ({getChargeMethodLabel(p.chargeMethod)})
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                      onClick={() => setShowQuickAddProduct(true)}
                    >
                      <i className="bi bi-box-seam"></i> New Item
                    </button>
                  )}
                </div>
              </div>

              <div className="card-body p-2 p-sm-3">
                {items.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-cart-x fs-1 text-secondary mb-2 d-block"></i>
                    No products added yet. Click &ldquo;Add from Catalog&rdquo; above.
                  </div>
                ) : (
                  <>
                    {/* Mobile Card Layout (< 768px) */}
                    <div className="d-block d-md-none">
                      {items.map((item, idx) => {
                        const isPerKg = item.chargeMethod === 'PER_KG';
                        return (
                          <div key={item.id} className="order-item-card position-relative">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <span className="badge bg-dark-subtle text-dark">#{idx + 1}</span>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm p-1 px-2"
                                onClick={() => handleRemoveItem(idx)}
                                title="Remove Item"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>

                            <div className="mb-2">
                              <label className="form-label small fw-semibold mb-1">Item Description</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                aria-label="Item description" value={item.productNameSnapshot}
                                onChange={(e) => handleUpdateItem(idx, { productNameSnapshot: e.target.value })}
                                required
                              />
                            </div>

                            <div className="row g-2 mb-2">
                              <div className="col-6">
                                <label className="form-label small fw-semibold mb-1">Method</label>
                                <select
                                  className="form-select form-select-sm"
                                  aria-label="Charge method" value={item.chargeMethod}
                                  onChange={(e) => handleUpdateItem(idx, { chargeMethod: e.target.value as ChargeMethod })}
                                >
                                  <option value="PER_UNIT">Per Unit</option>
                                  <option value="PER_KG">Per KG (Weight)</option>
                                  <option value="PER_ORDER">Per Order</option>
                                </select>
                              </div>
                              <div className="col-6">
                                <label className="form-label small fw-semibold mb-1">
                                  {isPerKg ? 'Weight (KG) *' : 'Quantity *'}
                                </label>
                                <input
                                  type="number"
                                  min={isPerKg ? '0.01' : '1'}
                                  step={isPerKg ? '0.01' : '1'}
                                  className="form-control form-control-sm"
                                  aria-label="Quantity or weight" value={item.quantity}
                                  onChange={(e) => handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                                  required
                                />
                              </div>
                            </div>

                            <div className="row g-2 align-items-center">
                              <div className="col-7">
                                <label className="form-label small fw-semibold mb-1">
                                  Carry Rate ({settings.currency}{getChargeUnitSuffix(item.chargeMethod)})
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className={`form-control form-control-sm ${item.isOverridden ? 'border-warning bg-warning-subtle fw-semibold' : ''}`}
                                  aria-label="Carry rate" value={item.carryCharge}
                                  onChange={(e) =>
                                    handleUpdateItem(idx, {
                                      carryCharge: parseFloat(e.target.value) || 0,
                                      isOverridden: true,
                                    })
                                  }
                                  required
                                />
                                {item.isOverridden && (
                                  <div className="badge bg-warning text-dark mt-1" style={{ fontSize: '10px' }}>
                                    One-time Override
                                  </div>
                                )}
                              </div>
                              <div className="col-5 text-end">
                                <div className="small text-muted mb-1">Line Total</div>
                                <div className="fw-bold text-primary fs-6">
                                  {formatCurrency(item.lineTotal, settings.currency)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table Layout (>= 768px) */}
                    <div className="d-none d-md-block table-responsive">
                      <table className="table align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Item Description</th>
                            <th style={{ width: '135px' }}>Charge Method</th>
                            <th style={{ width: '120px' }}>Qty / Weight</th>
                            <th style={{ width: '170px' }}>Carry Rate</th>
                            <th style={{ width: '140px' }} className="text-end">Line Total</th>
                            <th style={{ width: '45px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => {
                            const isPerKg = item.chargeMethod === 'PER_KG';
                            return (
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
                                    onChange={(e) => handleUpdateItem(idx, { chargeMethod: e.target.value as ChargeMethod })}
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
                                      min={isPerKg ? '0.01' : '1'}
                                      step={isPerKg ? '0.01' : '1'}
                                      className="form-control form-control-sm"
                                      aria-label="Quantity or weight" value={item.quantity}
                                      onChange={(e) => handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                                      required
                                    />
                                    {isPerKg && <span className="input-group-text">KG</span>}
                                  </div>
                                </td>
                                <td>
                                  <div className="input-group input-group-sm">
                                    <span className="input-group-text">{settings.currency}</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className={`form-control form-control-sm ${item.isOverridden ? 'border-warning bg-warning-subtle fw-semibold' : ''}`}
                                      aria-label="Carry rate" value={item.carryCharge}
                                      onChange={(e) =>
                                        handleUpdateItem(idx, {
                                          carryCharge: parseFloat(e.target.value) || 0,
                                          isOverridden: true,
                                        })
                                      }
                                      required
                                    />
                                  </div>
                                  {item.isOverridden && (
                                    <span className="badge bg-warning text-dark mt-1" style={{ fontSize: '10px' }}>
                                      One-time Override
                                    </span>
                                  )}
                                </td>
                                <td className="text-end fw-bold">
                                  {formatCurrency(item.lineTotal, settings.currency)}
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm p-1"
                                    onClick={() => handleRemoveItem(idx)}
                                    title="Remove Item"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header bg-white py-3">
                <h5 className="card-title mb-0 fw-bold fs-6 fs-md-5">3. Consignment Notes / Cargo Tags</h5>
              </div>
              <div className="card-body p-3">
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Flight number, baggage tags, scale weight receipt reference, or packing instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>

          {/* Totals & Confirmation Sidebar */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm sticky-top" style={{ top: '75px' }}>
              <div className="card-header bg-dark text-white py-3">
                <h5 className="card-title mb-0 fw-bold fs-6 fs-md-5">Carry Charges Summary</h5>
              </div>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Subtotal Carry Charges:</span>
                  <span className="fw-semibold">{formatCurrency(totals.subtotal, settings.currency)}</span>
                </div>

                {/* Discount */}
                <div className="py-2 border-bottom">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-muted small">Discount / Concession:</span>
                    <span className="text-danger fw-semibold small">
                      - {formatCurrency(discount, settings.currency)}
                    </span>
                  </div>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">{settings.currency}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      aria-label="Discount"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Additional Charges */}
                <div className="py-2 border-bottom">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-muted small">Additional Handling / Weight Excess:</span>
                    <span className="text-primary fw-semibold small">
                      + {formatCurrency(additionalCharges, settings.currency)}
                    </span>
                  </div>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">{settings.currency}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      aria-label="Additional handling charges"
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Grand Total */}
                <div className="d-flex justify-content-between align-items-center py-3 bg-light px-2 rounded mt-3">
                  <span className="fs-6 fw-bold text-dark">Grand Total:</span>
                  <span className="fs-4 fw-bold text-primary">
                    {formatCurrency(totals.grandTotal, settings.currency)}
                  </span>
                </div>

                <div className="alert alert-warning py-2 small mt-3 mb-3">
                  <i className="bi bi-shield-check me-1"></i>
                  Confirming this order immediately posts a debit entry to the customer ledger.
                </div>

                <button
                  type="submit"
                  className="btn btn-success btn-lg w-100 fw-bold shadow-sm"
                  disabled={isSubmitting || items.length === 0 || !!calculationError}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Confirming Order...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle-fill me-2"></i>
                      Confirm Order & Invoice
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Quick Add Product Modal */}
      {showQuickAddProduct && (
        <ModalFrame onClose={() => setShowQuickAddProduct(false)}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-plus-circle me-2"></i>Quick Add Catalog Product
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white" aria-label="Close"
                  onClick={() => setShowQuickAddProduct(false)}
                ></button>
              </div>
              <form onSubmit={handleQuickCreateProduct}>
                <div className="modal-body p-3">
                  {quickError && (
                    <div className="alert alert-danger py-2 small mb-3">{quickError}</div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Product Name *</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      placeholder="e.g. Saudi Honey or Luggage Box"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Category</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={quickCategory}
                      onChange={(e) => setQuickCategory(e.target.value)}
                      placeholder="e.g. Food, Garments"
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Method *</label>
                      <select
                        className="form-select form-select-sm"
                        value={quickChargeMethod}
                        onChange={(e) => setQuickChargeMethod(e.target.value as ChargeMethod)}
                      >
                        <option value="PER_UNIT">Per Unit</option>
                        <option value="PER_KG">Per KG (Weight)</option>
                        <option value="PER_ORDER">Per Order Flat</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">
                        Rate ({settings.currency}) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control form-control-sm"
                        value={quickRate}
                        onChange={(e) => setQuickRate(parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer p-2 bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowQuickAddProduct(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm fw-bold">
                    Add & Select for Order
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
