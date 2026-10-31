import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/storage';
import { Customer, Product, OrderItem, ChargeMethod } from '../types';
import { calculateOrderTotals, formatCurrency } from '../utils/finance';
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

  const settings = storage.getBusinessSettings();

  useEffect(() => {
    const custs = storage.getCustomers().filter((c) => c.isActive);
    const prods = storage.getProducts().filter((p) => p.isActive);
    setCustomers(custs);
    setProducts(prods);
    if (custs.length > 0) {
      setSelectedCustomerId(custs[0].id);
    }
  }, []);

  const handleAddItem = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const newItem: OrderItemForm = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      productId: product.id,
      productNameSnapshot: product.name,
      quantity: 1,
      chargeMethod: product.chargeMethod,
      carryCharge: product.defaultCarryCharge,
      lineTotal: product.chargeMethod === 'PER_ORDER' ? product.defaultCarryCharge : product.defaultCarryCharge * 1,
      isOverridden: false,
    };

    setItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, updates: Partial<OrderItemForm>) => {
    const updated = [...items];
    const item = { ...updated[index], ...updates };

    // Recalculate line total for this item
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.carryCharge) || 0;
    item.lineTotal = item.chargeMethod === 'PER_ORDER' ? rate : qty * rate;

    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const totals = calculateOrderTotals(items, discount, additionalCharges);

  const handleSubmit = (e: React.FormEvent) => {
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

      const { invoice } = storage.confirmOrder({
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
    <div className="container-fluid py-4 px-3 px-md-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="fw-bold mb-1">New Carry Charges Order</h3>
          <p className="text-muted small mb-0">
            Build and confirm carry charges invoice. Products loaded from catalog with default rates.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* Order Details Left Column */}
          <div className="col-12 col-lg-8">
            {/* Customer Selection Card */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white py-3">
                <h5 className="card-title mb-0 fw-bold">1. Select Customer</h5>
              </div>
              <div className="card-body">
                <div className="row g-3 align-items-center">
                  <div className="col-12 col-md-8">
                    <label className="form-label fw-semibold">Customer Name & Code</label>
                    <select
                      className="form-select form-select-lg"
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
                      <div className="p-2 bg-light rounded border text-muted small">
                        <div><strong>Address:</strong> {selectedCustomer.address || 'N/A'}</div>
                        <div><strong>Current Balance:</strong> {formatCurrency(storage.getCustomerStatement(selectedCustomer.id).closingBalance, settings.currency)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items Card */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 fw-bold">2. Order Items (Carry Cargo)</h5>
                <div className="dropdown">
                  <button
                    className="btn btn-primary btn-sm dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i className="bi bi-plus-lg me-1"></i> Add Product from Catalog
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end shadow">
                    <li><h6 className="dropdown-header">Catalog Items:</h6></li>
                    {products.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="dropdown-item d-flex justify-content-between align-items-center"
                          onClick={() => handleAddItem(p.id)}
                        >
                          <span>{p.name}</span>
                          <span className="badge bg-light text-dark ms-2">
                            {formatCurrency(p.defaultCarryCharge, p.currency)} ({p.chargeMethod})
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="card-body p-0">
                {items.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-cart-x fs-1 text-secondary mb-2 d-block"></i>
                    No products added yet. Click &ldquo;Add Product from Catalog&rdquo; above.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Item Description</th>
                          <th style={{ width: '130px' }}>Charge Method</th>
                          <th style={{ width: '110px' }}>Qty</th>
                          <th style={{ width: '160px' }}>Carry Rate</th>
                          <th style={{ width: '130px' }} className="text-end">Line Total</th>
                          <th style={{ width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={item.id}>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={item.productNameSnapshot}
                                onChange={(e) => handleUpdateItem(idx, { productNameSnapshot: e.target.value })}
                                required
                              />
                            </td>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                value={item.chargeMethod}
                                onChange={(e) => handleUpdateItem(idx, { chargeMethod: e.target.value as ChargeMethod })}
                              >
                                <option value="PER_UNIT">Per Unit</option>
                                <option value="PER_ORDER">Per Order</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                className="form-control form-control-sm"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                                required
                              />
                            </td>
                            <td>
                              <div className="input-group input-group-sm">
                                <span className="input-group-text">{settings.currency}</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className={`form-control form-control-sm ${item.isOverridden ? 'border-warning bg-warning-subtle fw-semibold' : ''}`}
                                  value={item.carryCharge}
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white py-3">
                <h5 className="card-title mb-0 fw-bold">3. Consignment Notes / Instructions</h5>
              </div>
              <div className="card-body">
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Flight number, luggage tag reference, or special packaging notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>

          {/* Totals & Confirmation Sidebar */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm sticky-top" style={{ top: '80px' }}>
              <div className="card-header bg-dark text-white py-3">
                <h5 className="card-title mb-0 fw-bold">Carry Charges Summary</h5>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Subtotal Carry Charges:</span>
                  <span className="fw-semibold">{formatCurrency(totals.subtotal, settings.currency)}</span>
                </div>

                {/* Discount */}
                <div className="py-2 border-bottom">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-muted">Discount / Concession:</span>
                    <span className="text-danger fw-semibold">
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
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Additional Charges */}
                <div className="py-2 border-bottom">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-muted">Additional Handling / Packing:</span>
                    <span className="text-primary fw-semibold">
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
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Grand Total */}
                <div className="d-flex justify-content-between align-items-center py-3 bg-light px-2 rounded mt-3">
                  <span className="fs-5 fw-bold text-dark">Grand Total:</span>
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
                  disabled={isSubmitting || items.length === 0}
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
    </div>
  );
};
