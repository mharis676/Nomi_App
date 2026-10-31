import { ModalFrame } from '../components/ModalFrame';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storage } from '../services/storage';
import { Customer } from '../types';
import { formatCurrency } from '../utils/finance';
import { useAuth } from '../context/AuthContext';

export const Customers: React.FC = () => {
  const { canEdit } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form fields
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settings = storage.getBusinessSettings();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    setCustomers(storage.getCustomers());
  };

  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setFullName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setOpeningBalance(0);
    setDuplicateWarning(null);
    setError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFullName(c.fullName);
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setOpeningBalance(c.openingBalance || 0);
    setDuplicateWarning(null);
    setError(null);
    setShowModal(true);
  };

  const handleNameChange = (val: string) => {
    setFullName(val);
    if (!editingCustomer && val.trim().length > 2) {
      const match = customers.find(
        (c) => c.fullName.toLowerCase().includes(val.toLowerCase()) && c.isActive
      );
      if (match) {
        setDuplicateWarning(`Potential duplicate: "${match.fullName}" (${match.customerCode}) already exists.`);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setError('You lack permission to modify customer records.');
      return;
    }
    if (!fullName.trim()) {
      setError('Full customer name is required.');
      return;
    }

    try {
      await storage.saveCustomer({
        id: editingCustomer ? editingCustomer.id : undefined,
        customerCode: editingCustomer ? editingCustomer.customerCode : '',
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
        openingBalance: editingCustomer ? editingCustomer.openingBalance : openingBalance,
        isActive: true,
      });

      setShowModal(false);
      loadCustomers();
    } catch (err: any) {
      setError(err.message || 'Failed to save customer');
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to deactivate/archive "${name}"? Historical financial records will be fully preserved.`)) {
      try { await storage.archiveCustomer(id); loadCustomers(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not archive record.'); }
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(term) ||
      c.customerCode.toLowerCase().includes(term) ||
      (c.phone && c.phone.toLowerCase().includes(term))
    );
  });

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3 mb-md-4">
        <div>
          <h3 className="fw-bold mb-1">Customers & Account Ledgers</h3>
          <p className="text-muted small mb-0">
            Manage customer profiles, view continuous account statements, and track balances.
          </p>
        </div>
        {canEdit && (
          <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2 shadow-sm w-100 w-sm-auto" onClick={handleOpenCreateModal}>
            <i className="bi bi-person-plus-fill"></i> Add New Customer
          </button>
        )}
      </div>

      {error && !showModal && <div role="alert" className="alert alert-danger">{error}</div>}
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
              placeholder="Search by customer name, phone, or code (e.g. CUST-001)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive" tabIndex={0} role="region" aria-label="Scrollable records">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Code</th>
                  <th>Customer Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th className="text-end">Current Balance</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => {
                  const stmt = storage.getCustomerStatement(c.id);
                  const isOwed = stmt.closingBalance > 0;
                  const isCredit = stmt.closingBalance < 0;

                  return (
                    <tr key={c.id} className={!c.isActive ? 'table-secondary text-muted' : ''}>
                      <td className="fw-semibold">{c.customerCode}</td>
                      <td>
                        <Link to={`/customers/${c.id}`} className="fw-bold text-decoration-none text-primary">
                          {c.fullName}
                        </Link>
                        {c.notes && <div className="small text-muted text-truncate" style={{ maxWidth: '250px' }}>{c.notes}</div>}
                      </td>
                      <td>{c.phone || '-'}</td>
                      <td>{c.address || '-'}</td>
                      <td className="text-end fw-bold">
                        <span className={isOwed ? 'text-danger' : isCredit ? 'text-warning-emphasis' : 'text-success'}>
                          {formatCurrency(stmt.closingBalance, settings.currency)}
                        </span>
                        <div className="small text-muted" style={{ fontSize: '11px' }}>
                          {isOwed ? 'Customer Owes' : isCredit ? 'Advance Credit' : 'Settled'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${c.isActive ? 'bg-success' : 'bg-secondary'}`}>
                          {c.isActive ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link to={`/customers/${c.id}`} className="btn btn-outline-primary" title="View Ledger">
                            <i className="bi bi-file-earmark-text"></i> Ledger
                          </Link>
                          {canEdit && (
                            <>
                              <button
                                className="btn btn-outline-secondary"
                                onClick={() => handleOpenEditModal(c)}
                                title="Edit"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              {c.isActive && (
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={() => handleArchive(c.id, c.fullName)}
                                  title="Archive"
                                >
                                  <i className="bi bi-archive"></i>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {showModal && (
        <ModalFrame onClose={() => setShowModal(false)}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  {editingCustomer ? `Edit Customer (${editingCustomer.customerCode})` : 'Create New Customer'}
                </h5>
                <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSaveCustomer}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}
                  {duplicateWarning && (
                    <div className="alert alert-warning py-2 small d-flex align-items-center gap-2">
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      <span>{duplicateWarning}</span>
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="customers-field-1" className="form-label fw-semibold">Customer Full Name *</label>
                    <input id="customers-field-1"
                      type="text"
                      className="form-control"
                      value={fullName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      placeholder="e.g. Haji Muhammad Iqbal"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="customers-field-2" className="form-label fw-semibold">Phone Number</label>
                    <input id="customers-field-2"
                      type="text"
                      className="form-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="customers-field-3" className="form-label fw-semibold">Shop / Residential Address</label>
                    <input id="customers-field-3"
                      type="text"
                      className="form-control"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Gulberg III, Lahore"
                    />
                  </div>

                  {!editingCustomer && (
                    <div className="mb-3">
                      <label htmlFor="customers-field-4" className="form-label fw-semibold">Opening Balance ({settings.currency})</label>
                      <input id="customers-field-4"
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                      <div className="form-text small">
                        Balance brought forward if migrating an existing account.
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="customers-field-5" className="form-label fw-semibold">Notes / Merchant Category</label>
                    <textarea id="customers-field-5"
                      className="form-control"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any relevant consignment preferences..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary fw-bold">
                    {editingCustomer ? 'Save Changes' : 'Create Customer'}
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

