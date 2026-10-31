import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { Product, ChargeMethod } from '../types';
import { formatCurrency } from '../utils/finance';
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

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setError('You lack permission to modify product catalog.');
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
      storage.saveProduct({
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
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    }
  };

  const handleArchive = (id: string, prodName: string) => {
    if (window.confirm(`Deactivate/archive "${prodName}"? Historical orders and invoices will keep their saved snapshot unaltered.`)) {
      storage.archiveProduct(id);
      loadProducts();
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
    <div className="container-fluid py-4 px-3 px-md-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">Product Carry Charges Catalog</h3>
          <p className="text-muted small mb-0">
            Maintain default carry rates and charging methods. Changes do not alter historical invoices.
          </p>
        </div>
        {canEdit && (
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenCreateModal}>
            <i className="bi bi-plus-lg"></i> Add New Product
          </button>
        )}
      </div>

      {/* Scope Reminder Alert */}
      <div className="alert alert-light border d-flex align-items-center gap-2 py-2 mb-4">
        <i className="bi bi-shield-lock-fill text-primary fs-5"></i>
        <div className="small text-muted">
          <strong>Carry Charge Definition:</strong> The rate entered here is the charge for transporting/carrying the good from Saudi Arabia. No Saudi purchase costs or selling prices are recorded.
        </div>
      </div>

      {/* Search Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="input-group">
            <span className="input-group-text bg-white">
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

      {/* Product Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>SKU / Code</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th className="text-center">Charging Method</th>
                  <th className="text-end">Default Carry Charge</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id} className={!p.isActive ? 'table-secondary text-muted' : ''}>
                    <td className="fw-semibold text-secondary">{p.sku || '-'}</td>
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
                      <span className="badge bg-info-subtle text-info border border-info-subtle">
                        {p.chargeMethod === 'PER_UNIT' ? 'Per Unit' : 'Per Order Flat'}
                      </span>
                    </td>
                    <td className="text-end fw-bold text-primary">
                      {formatCurrency(p.defaultCarryCharge, p.currency)}
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
                            className="btn btn-outline-secondary"
                            onClick={() => handleOpenEditModal(p)}
                            title="Edit"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          {p.isActive && (
                            <button
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  {editingProduct ? 'Edit Product Rate' : 'Add New Catalog Product'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSaveProduct}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Product Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ajwa VIP Dates 1kg or Luxury Abaya Box"
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold">SKU / Code</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="e.g. AJWA-KG"
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold">Category</label>
                      <input
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
                      <label className="form-label small fw-semibold">Default Carry Rate ({settings.currency}) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={defaultCarryCharge}
                        onChange={(e) => setDefaultCarryCharge(parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold">Charging Method *</label>
                      <select
                        className="form-select"
                        value={chargeMethod}
                        onChange={(e) => setChargeMethod(e.target.value as ChargeMethod)}
                      >
                        <option value="PER_UNIT">Per Unit (e.g. per kg/bottle)</option>
                        <option value="PER_ORDER">Per Order Flat Rate</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Notes / Transport Guidelines</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special handling rules, airport weight limits..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary fw-bold">
                    {editingProduct ? 'Save Product' : 'Add to Catalog'}
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
