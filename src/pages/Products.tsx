import { ModalFrame } from '../components/ModalFrame';
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { Product, ChargeMethod } from '../types';
import { formatCurrency, getChargeMethodLabel, getChargeUnitSuffix } from '../utils/finance';
import { useAuth } from '../context/AuthContext';

export const Products: React.FC = () => {
  const { canEdit } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [name, setName] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [defaultCarryCharge, setDefaultCarryCharge] = useState<number>(0);
  const [chargeMethod, setChargeMethod] = useState<ChargeMethod>('PER_UNIT');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const settings = storage.getBusinessSettings();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    setProducts(storage.getProducts());
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setCategory('');
    setDefaultCarryCharge(0);
    setChargeMethod('PER_UNIT');
    setNotes('');
    setError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || '');
    setCategory(p.category || '');
    setDefaultCarryCharge(p.defaultCarryCharge);
    setChargeMethod(p.chargeMethod);
    setNotes(p.notes || '');
    setError(null);
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setError('You lack permission to modify the product catalog.');
      return;
    }
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (defaultCarryCharge < 0) {
      setError('Default carry charge cannot be negative.');
      return;
    }

    try {
      setError(null);
      const saved = await storage.saveProduct({
        id: editingProduct ? editingProduct.id : undefined,
        name: name.trim(),
        sku: sku.trim() || undefined,
        category: category.trim() || undefined,
        defaultCarryCharge,
        chargeMethod,
        currency: settings.currency,
        notes: notes.trim() || undefined,
        isActive: true,
      });

      setShowModal(false);
      loadProducts();
      setSuccessMessage(`Product "${saved.name}" successfully saved.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    }
  };

  const handleArchive = async (id: string, prodName: string) => {
    if (window.confirm(`Deactivate/archive "${prodName}"? Historical orders and invoices will keep their saved snapshot unaltered.`)) {
      try { await storage.archiveProduct(id); loadProducts(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not archive record.'); }
    }
  };

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
  });

  return (
    <div className="container-fluid py-3 py-md-4 px-2 px-sm-3 px-md-4">
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show shadow-sm d-flex align-items-center gap-2 mb-3" role="alert">
          <i className="bi bi-check-circle-fill fs-5 text-success"></i>
          <div>{successMessage}</div>
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setSuccessMessage(null)}></button>
        </div>
      )}

      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3 mb-md-4">
        <div>
          <h3 className="fw-bold mb-1">Product Carry Charges Catalog</h3>
          <p className="text-muted small mb-0">
            Maintain default carry rates (Per Unit, Per KG, Per Order). Changes do not alter historical invoices.
          </p>
        </div>
        {canEdit && (
          <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2 shadow-sm w-100 w-sm-auto" onClick={handleOpenCreateModal}>
            <i className="bi bi-plus-lg"></i> Add New Product
          </button>
        )}
      </div>

      {error && !showModal && <div role="alert" className="alert alert-danger">{error}</div>}
      {/* Scope Reminder Alert */}
      <div className="alert alert-light border d-flex align-items-center gap-2 py-2 mb-3 shadow-sm">
        <i className="bi bi-shield-lock-fill text-primary fs-5"></i>
        <div className="small text-muted">
          <strong>Carry Charge Definition:</strong> The rates configured here are strictly for transporting/carrying items from Saudi Arabia. No Saudi purchase costs or retail selling prices are stored.
        </div>
      </div>

      {/* Search Bar */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-2 p-sm-3">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search by product name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Product Table (with mobile responsive scroll) */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive" tabIndex={0} role="region" aria-label="Scrollable records">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ minWidth: '110px' }}>SKU / Code</th>
                  <th style={{ minWidth: '180px' }}>Product Name</th>
                  <th style={{ minWidth: '110px' }}>Category</th>
                  <th className="text-center" style={{ minWidth: '120px' }}>Charge Method</th>
                  <th className="text-end" style={{ minWidth: '140px' }}>Carry Rate</th>
                  <th style={{ minWidth: '90px' }}>Status</th>
                  <th className="text-end" style={{ minWidth: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const methodBadgeClass =
                    p.chargeMethod === 'PER_KG'
                      ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                      : p.chargeMethod === 'PER_ORDER'
                      ? 'bg-purple-subtle text-dark border'
                      : 'bg-info-subtle text-info border border-info-subtle';

                  return (
                    <tr key={p.id} className={!p.isActive ? 'table-secondary text-muted' : ''}>
                      <td className="fw-semibold text-secondary small">{p.sku || '-'}</td>
                      <td>
                        <div className="fw-bold text-dark">{p.name}</div>
                        {p.notes && <div className="small text-muted">{p.notes}</div>}
                      </td>
                      <td>
                        {p.category ? (
                          <span className="badge bg-light text-dark border">{p.category}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${methodBadgeClass}`}>
                          {getChargeMethodLabel(p.chargeMethod)}
                        </span>
                      </td>
                      <td className="text-end fw-bold text-primary">
                        {formatCurrency(p.defaultCarryCharge, p.currency)}{' '}
                        <span className="small text-muted fw-normal">
                          {getChargeUnitSuffix(p.chargeMethod)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${p.isActive ? 'bg-success' : 'bg-secondary'}`}>
                          {p.isActive ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="text-end">
                        {canEdit && (
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => handleOpenEditModal(p)}
                              title="Edit"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            {p.isActive && (
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => handleArchive(p.id, p.name)}
                                title="Archive"
                              >
                                <i className="bi bi-archive"></i>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <ModalFrame onClose={() => setShowModal(false)}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  {editingProduct ? `Edit Product (${editingProduct.name})` : 'Add New Catalog Product'}
                </h5>
                <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSaveProduct}>
                <div className="modal-body p-3 p-sm-4">
                  {error && (
                    <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
                      <i className="bi bi-exclamation-octagon-fill"></i>
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="products-field-1" className="form-label fw-semibold">Product Name *</label>
                    <input id="products-field-1"
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ajwa VIP Dates 1kg or Luggage Cargo"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-12 col-sm-6">
                      <label htmlFor="products-field-2" className="form-label small fw-semibold">SKU / Product Code</label>
                      <input id="products-field-2"
                        type="text"
                        className="form-control form-control-sm"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="e.g. AJWA-KG"
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label htmlFor="products-field-3" className="form-label small fw-semibold">Category</label>
                      <input id="products-field-3"
                        type="text"
                        className="form-control form-control-sm"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="e.g. Dates, Fragrance, Fabrics"
                      />
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-12 col-sm-6">
                      <label htmlFor="products-field-4" className="form-label small fw-semibold">Charging Method (Unit of Measure) *</label>
                      <select id="products-field-4"
                        className="form-select form-select-sm"
                        value={chargeMethod}
                        onChange={(e) => setChargeMethod(e.target.value as ChargeMethod)}
                        required
                      >
                        <option value="PER_UNIT">Per Unit (per piece / box)</option>
                        <option value="PER_KG">Per KG (Kilogram weight cargo)</option>
                        <option value="PER_ORDER">Per Order Flat Rate</option>
                      </select>
                    </div>
                    <div className="col-12 col-sm-6">
                      <label htmlFor="products-field-5" className="form-label small fw-semibold">
                        Default Carry Rate ({settings.currency} {getChargeUnitSuffix(chargeMethod)}) *
                      </label>
                      <input id="products-field-5"
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control form-control-sm"
                        value={defaultCarryCharge}
                        onChange={(e) => setDefaultCarryCharge(parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label htmlFor="products-field-6" className="form-label small fw-semibold">Notes / Handling Guidelines</label>
                    <textarea id="products-field-6"
                      className="form-control form-control-sm"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special handling rules, airport weight limits..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer p-2 p-sm-3 bg-light">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm fw-bold">
                    {editingProduct ? 'Save Changes' : 'Add to Catalog'}
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
