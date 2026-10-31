import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Customer, CustomerTransaction, BusinessSettings } from '../types';
import { formatCurrency } from './finance';

/**
 * Generates and downloads a CARRY CHARGES INVOICE PDF.
 */
export function generateInvoicePDF(invoice: Invoice, settings: BusinessSettings): void {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const currency = invoice.currency || settings.currency || 'PKR';

  // --- Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 40, 80);
  doc.text(settings.businessName, 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`${settings.address} | Phone: ${settings.phone}`, 14, 26);
  doc.text(`Email: ${settings.email}`, 14, 31);

  // Title box
  doc.setDrawColor(20, 40, 80);
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(180, 20, 20);
  doc.text('CARRY CHARGES INVOICE', 14, 43);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Carry charges only; product purchase/selling prices are not included.', 14, 48);

  // Invoice Details right aligned
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 140, 43);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Date: ${invoice.issueDate}`, 140, 48);
  doc.text(`Revision: #${invoice.currentRevision}`, 140, 53);
  doc.text(`Status: ${invoice.status}`, 140, 58);

  // Customer Details
  doc.setDrawColor(230);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, 62, 182, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30);
  doc.text('BILL TO (CUSTOMER):', 18, 68);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(10, 30, 70);
  doc.text(invoice.snapshotData.customer.fullName, 18, 74);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Code: ${invoice.snapshotData.customer.customerCode} | Phone: ${invoice.snapshotData.customer.phone || 'N/A'}`, 18, 80);

  // --- Table of Items ---
  const tableRows = invoice.snapshotData.items.map((item, idx) => {
    let methodLabel = 'Per Unit';
    let qtyOrWeight: string | number = item.quantity;

    if (item.chargeMethod === 'PER_KG') {
      methodLabel = 'Per KG';
      qtyOrWeight = `${item.weightKg ?? item.quantity} KG`;
    } else if (item.chargeMethod === 'PER_ORDER') {
      methodLabel = 'Per Order Flat';
    }

    const rateSuffix = item.chargeMethod === 'PER_KG' ? '/kg' : '';
    const rateText = `${formatCurrency(item.carryCharge, currency)}${rateSuffix}`;

    return [
      idx + 1,
      item.productNameSnapshot,
      methodLabel,
      qtyOrWeight,
      rateText,
      formatCurrency(item.lineTotal, currency),
    ];
  });

  autoTable(doc, {
    startY: 88,
    head: [['#', 'Description (Item)', 'Charging Method', 'Qty / Weight', 'Carry Rate', 'Line Total']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [25, 45, 85],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 32, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
    },
  });

  // Calculate final Y after table
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 140;

  // Totals Box
  const startX = 120;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text('Subtotal Carry Charges:', startX, finalY);
  doc.text(formatCurrency(invoice.subtotal, currency), 195, finalY, { align: 'right' });

  if (invoice.discount > 0) {
    doc.text('Discount:', startX, finalY + 6);
    doc.text(`- ${formatCurrency(invoice.discount, currency)}`, 195, finalY + 6, { align: 'right' });
  }

  if (invoice.additionalCharges > 0) {
    doc.text('Additional Handling:', startX, finalY + 12);
    doc.text(`+ ${formatCurrency(invoice.additionalCharges, currency)}`, 195, finalY + 12, { align: 'right' });
  }

  const offset = (invoice.discount > 0 ? 6 : 0) + (invoice.additionalCharges > 0 ? 6 : 0);

  doc.setDrawColor(20, 40, 80);
  doc.setLineWidth(0.4);
  doc.line(startX, finalY + 6 + offset, 196, finalY + 6 + offset);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 30, 60);
  doc.text('Grand Total (Carry Charges):', startX, finalY + 13 + offset);
  doc.text(formatCurrency(invoice.grandTotal, currency), 195, finalY + 13 + offset, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text('Amount Paid:', startX, finalY + 19 + offset);
  doc.text(formatCurrency(invoice.amountPaid, currency), 195, finalY + 19 + offset, { align: 'right' });

  const balanceDue = Math.max(0, invoice.grandTotal - invoice.amountPaid);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(balanceDue > 0 ? 180 : 20, balanceDue > 0 ? 20 : 120, 20);
  doc.text('Balance Due:', startX, finalY + 25 + offset);
  doc.text(formatCurrency(balanceDue, currency), 195, finalY + 25 + offset, { align: 'right' });

  // Notes & Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(settings.invoiceFooterNote, 14, 275);
  doc.text(`Page 1 of 1 — Generated securely on ${new Date().toLocaleString()}`, 14, 280);

  doc.save(`${invoice.invoiceNumber}.pdf`);
}

/**
 * Generates and downloads a CUSTOMER ACCOUNT STATEMENT PDF.
 */
export function generateStatementPDF(
  customer: Customer,
  statement: {
    openingBalance: number;
    debits: number;
    credits: number;
    closingBalance: number;
    statementTransactions: Array<CustomerTransaction & { runningBalance: number }>;
  },
  settings: BusinessSettings,
  startDate?: string,
  endDate?: string
): void {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const currency = settings.currency || 'PKR';

  // --- Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 40, 80);
  doc.text(settings.businessName, 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`${settings.address} | Phone: ${settings.phone}`, 14, 26);

  doc.setDrawColor(20, 40, 80);
  doc.setLineWidth(0.5);
  doc.line(14, 30, 196, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(20, 40, 80);
  doc.text('CUSTOMER ACCOUNT STATEMENT', 14, 38);

  const periodText = startDate && endDate
    ? `Period: ${startDate} to ${endDate}`
    : 'Period: Complete Account History';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(periodText, 14, 43);

  // Customer Summary Box
  doc.setDrawColor(220);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 48, 182, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 40, 80);
  doc.text(`Customer: ${customer.fullName} (${customer.customerCode})`, 18, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80);
  doc.text(`Phone: ${customer.phone || 'N/A'} | Address: ${customer.address || 'N/A'}`, 18, 61);
  doc.text(
    `Opening Balance: ${formatCurrency(statement.openingBalance, currency)} | Total Charges: ${formatCurrency(statement.debits, currency)} | Total Paid: ${formatCurrency(statement.credits, currency)}`,
    18,
    67
  );

  // Statement Table
  const tableRows = statement.statementTransactions.map((tx) => [
    tx.transactionDate.split('T')[0],
    tx.referenceCode || '-',
    tx.description,
    tx.debit > 0 ? formatCurrency(tx.debit, currency) : '-',
    tx.credit > 0 ? formatCurrency(tx.credit, currency) : '-',
    formatCurrency(tx.runningBalance, currency),
  ]);

  autoTable(doc, {
    startY: 76,
    head: [['Date', 'Reference', 'Description / Note', 'Debit (Charges)', 'Credit (Paid)', 'Running Balance']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 60, 100],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 26 },
      2: { cellWidth: 64 },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
    },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 140;

  // Closing Balance Box
  doc.setFillColor(240, 244, 250);
  doc.setDrawColor(180, 200, 225);
  doc.roundedRect(120, finalY, 76, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.text('Closing Account Balance:', 124, finalY + 7);

  doc.setFontSize(12);
  const isOwed = statement.closingBalance > 0;
  doc.setTextColor(isOwed ? 180 : 20, isOwed ? 20 : 120, 20);
  const statusLabel = statement.closingBalance > 0
    ? '(Customer Owes)'
    : statement.closingBalance < 0
    ? '(Customer Advance Credit)'
    : '(Settled)';
  doc.text(`${formatCurrency(statement.closingBalance, currency)} ${statusLabel}`, 124, finalY + 14);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Saudi Carry Charges System — Official Statement of Account', 14, 280);

  doc.save(`Statement_${customer.customerCode}_${new Date().toISOString().split('T')[0]}.pdf`);
}

