import { exportFile } from '../utils/exportFile';
import React, { useState, useEffect } from 'react';
import { isDemo } from '../services/backend';
import { storage } from '../services/storage';
import { AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';

export const Settings: React.FC = () => {
  const { isOwner } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [saveError, setSaveError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form
  const [businessName, setBusinessName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [currency, setCurrency] = useState<string>('');
  const [footerNote, setFooterNote] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const s = storage.getBusinessSettings();
    setBusinessName(s.businessName);
    setPhone(s.phone);
    setEmail(s.email);
    setAddress(s.address);
    setCurrency(s.currency);
    setFooterNote(s.invoiceFooterNote);
    setAuditLogs(storage.getAuditLogs());
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    try {
    setSaveError('');
    await storage.updateBusinessSettings({
      businessName,
      phone,
      email,
      address,
      currency,
      invoiceFooterNote: footerNote,
    });

    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Settings could not be saved.'); return; }
    setSuccessMessage('Business configuration updated successfully.');
    setTimeout(() => setSuccessMessage(null), 3000);
    loadSettings();
  };

  /**
   * Secure CSV Export with Formula-Injection (CSV Injection) sanitization.
   * Prepends a single quote if string starts with =, +, -, @, \t, \r.
   */
  const sanitizeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(str)) {
      return `"'${str}"`;
    }
    return `"${str}"`;
  };

  const handleExportAuditCSV = async () => {
    const headers = ['ID', 'Timestamp', 'Action', 'Table', 'Record ID', 'Details'];
    const rows = auditLogs.map((log) => [
      sanitizeCSV(log.id),
      sanitizeCSV(log.createdAt),
      sanitizeCSV(log.action),
      sanitizeCSV(log.tableName),
      sanitizeCSV(log.recordId || ''),
      sanitizeCSV(JSON.stringify(log.payload || {})),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    try { await exportFile(blob, `Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`); }
    catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Could not export file.'); }
  };

  const handleExportCustomersCSV = async () => {
    const customers = storage.getCustomers();
    const headers = ['Customer Code', 'Full Name', 'Phone', 'Address', 'Opening Balance', 'Closing Balance', 'Active'];
    const rows = customers.map((c) => {
      const stmt = storage.getCustomerStatement(c.id);
      return [
        sanitizeCSV(c.customerCode),
        sanitizeCSV(c.fullName),
        sanitizeCSV(c.phone || ''),
        sanitizeCSV(c.address || ''),
        sanitizeCSV(c.openingBalance),
        sanitizeCSV(stmt.closingBalance),
        sanitizeCSV(c.isActive ? 'Yes' : 'No'),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    try { await exportFile(blob, `Customers_${new Date().toISOString().split('T')[0]}.csv`); }
    catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Could not export file.'); }
  };

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {saveError && <div role="alert" className="alert alert-danger">{saveError}</div>}
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Business Settings & Security Audit</h3>
        <p className="text-muted small mb-0">
          Configure business details, invoice defaults, and review immutable audit records.
        </p>
      </div>

      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          {successMessage}
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setSuccessMessage(null)}></button>
        </div>
      )}

      <div className="row g-4 mb-4">
        {/* Settings Form */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="card-title mb-0 fw-bold">Business Contact & Invoicing Info</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSaveSettings}>
                <div className="mb-3">
                  <label htmlFor="settings-field-1" className="form-label fw-semibold">Business Name *</label>
                  <input id="settings-field-1"
                    type="text"
                    className="form-control"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={!isOwner}
                    required
                  />
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-12 col-sm-6">
                    <label htmlFor="settings-field-2" className="form-label small fw-semibold">Contact Phone</label>
                    <input id="settings-field-2"
                      type="text"
                      className="form-control form-control-sm"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!isOwner}
                    />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label htmlFor="settings-field-3" className="form-label small fw-semibold">Email Address</label>
                    <input id="settings-field-3"
                      type="email"
                      className="form-control form-control-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!isOwner}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="settings-field-4" className="form-label small fw-semibold">Physical Address</label>
                  <input id="settings-field-4"
                    type="text"
                    className="form-control form-control-sm"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={!isOwner}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="settings-field-5" className="form-label small fw-semibold">Default Currency</label>
                  <input id="settings-field-5"
                    type="text"
                    className="form-control form-control-sm"
                    value={currency}
                      readOnly={!isDemo}
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={!isOwner}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="settings-field-6" className="form-label small fw-semibold">Invoice Footer Disclaimer *</label>
                  <textarea id="settings-field-6"
                    className="form-control form-control-sm"
                    rows={2}
                    value={footerNote}
                    onChange={(e) => setFooterNote(e.target.value)}
                    disabled={!isOwner}
                    required
                  ></textarea>
                </div>

                {isOwner && (
                  <button type="submit" className="btn btn-primary fw-semibold">
                    <i className="bi bi-save me-1"></i> Save Business Settings
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Data Exports & Maintenance */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="card-title mb-0 fw-bold">Data Security & CSV Exports</h5>
            </div>
            <div className="card-body">
              <p className="text-muted small">
                All data exports are sanitized with formula injection protection (escaped against malicious spreadsheet macros).
              </p>

              <div className="d-grid gap-2 mb-4">
                <button
                  type="button"
                  className="btn btn-outline-primary d-flex align-items-center justify-content-between p-2"
                  onClick={handleExportCustomersCSV}
                >
                  <span className="d-flex align-items-center gap-2">
                    <i className="bi bi-filetype-csv fs-5"></i>
                    <span>Export Customer Ledgers & Balances (CSV)</span>
                  </span>
                  <i className="bi bi-download"></i>
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center justify-content-between p-2"
                  onClick={handleExportAuditCSV}
                >
                  <span className="d-flex align-items-center gap-2">
                    <i className="bi bi-shield-shaded fs-5"></i>
                    <span>Export System Audit Trail (CSV)</span>
                  </span>
                  <i className="bi bi-download"></i>
                </button>
              </div>

              {isDemo && <div className="alert alert-secondary py-2 small mb-0">
                <div className="fw-bold mb-1">State Reset (Testing / Staging Only):</div>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => {
                    if (window.confirm('Reset database state back to clean initial demo seed?')) {
                      if (isDemo) storage.init(true);
                      loadSettings();
                    }
                  }}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i> Re-seed Initial Dataset
                </button>
              </div>}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fw-bold">Append-Only System Audit Logs</h5>
          <span className="badge bg-light text-dark border">{auditLogs.length} events logged</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive" tabIndex={0} role="region" aria-label="Scrollable records" style={{ maxHeight: '350px' }}>
            <table className="table table-sm table-striped align-middle mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Record ID</th>
                  <th>Payload Summary</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="small text-muted">{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      <span className="badge bg-dark-subtle text-dark border">
                        {log.action}
                      </span>
                    </td>
                    <td className="fw-semibold">{log.tableName}</td>
                    <td className="small font-monospace">{log.recordId || '-'}</td>
                    <td className="small text-truncate" style={{ maxWidth: '350px' }}>
                      {JSON.stringify(log.payload || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
