import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storage } from '../services/storage';
import { Invoice } from '../types';
import { formatCurrency } from '../utils/finance';
import { generateInvoicePDF } from '../utils/pdf';

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const settings = storage.getBusinessSettings();

  useEffect(() => {
    setInvoices(storage.getInvoices().reverse());
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.snapshotData.customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.snapshotData.customer.customerCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">Carry Charges Invoices</h3>
          <p className="text-muted small mb-0">
            Immutable invoice snapshots, revision histories, and PDF downloads.
          </p>
        </div>
        <Link to="/orders/new" className="btn btn-primary d-flex align-items-center gap-2">
          <i className="bi bi-plus-lg"></i> Create New Invoice
        </Link>
      </div>

      {/* Filters and Search Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-12 col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by invoice #, customer name, or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="PAID">Fully Paid</option>
                <option value="REVISED">Revised</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice List Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-receipt-cutoff fs-1 text-secondary mb-2 d-block"></i>
              No invoices match your search or filter.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Invoice #</th>
                    <th>Issue Date</th>
                    <th>Customer Name</th>
                    <th>Items</th>
                    <th className="text-end">Grand Total</th>
                    <th className="text-end">Paid</th>
                    <th className="text-end">Balance Due</th>
                    <th className="text-center">Revision</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => {
                    const balanceDue = Math.max(0, inv.grandTotal - inv.amountPaid);
                    return (
                      <tr key={inv.id}>
                        <td>
                          <Link to={`/invoices/${inv.id}`} className="fw-bold text-decoration-none text-primary">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="small text-muted">{inv.issueDate}</td>
                        <td>
                          <div className="fw-semibold">{inv.snapshotData.customer.fullName}</div>
                          <div className="small text-muted">{inv.snapshotData.customer.customerCode}</div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {inv.snapshotData.items.length} items
                          </span>
                        </td>
                        <td className="text-end fw-bold">
                          {formatCurrency(inv.grandTotal, inv.currency)}
                        </td>
                        <td className="text-end text-success fw-semibold">
                          {formatCurrency(inv.amountPaid, inv.currency)}
                        </td>
                        <td className="text-end fw-bold text-danger">
                          {formatCurrency(balanceDue, inv.currency)}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-secondary-subtle text-secondary border">
                            v{inv.currentRevision}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              inv.status === 'PAID'
                                ? 'bg-success'
                                : inv.status === 'PARTIAL'
                                ? 'bg-warning text-dark'
                                : inv.status === 'CANCELLED'
                                ? 'bg-danger'
                                : 'bg-primary-subtle text-primary border border-primary-subtle'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <Link to={`/invoices/${inv.id}`} className="btn btn-outline-primary" title="View Details">
                              <i className="bi bi-eye"></i>
                            </Link>
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => generateInvoicePDF(inv, settings)}
                              title="Download PDF"
                            >
                              <i className="bi bi-file-earmark-pdf"></i>
                            </button>
                          </div>
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
    </div>
  );
};
