// Domain Entity Types for Saudi Carry Charges System

export type ChargeMethod = 'PER_UNIT' | 'PER_ORDER' | 'PER_KG';
export type UserRole = 'OWNER' | 'STAFF' | 'VIEWER';
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REVISED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'ONLINE' | 'OTHER';
export type TransactionType = 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT' | 'REFUND' | 'OPENING_BALANCE';

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface Customer {
  id: string;
  customerCode: string;
  fullName: string;
  phone?: string;
  address?: string;
  notes?: string;
  openingBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku?: string;
  name: string;
  category?: string;
  defaultCarryCharge: number;
  chargeMethod: ChargeMethod;
  currency: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId?: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number; // Unit quantity or Weight in KG if chargeMethod is PER_KG
  weightKg?: number; // Explicit weight in KG when chargeMethod is PER_KG
  chargeMethod: ChargeMethod;
  carryCharge: number; // Snapshot of applied carry rate
  lineTotal: number;
  createdAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  currency: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  additionalCharges: number;
  totalCarryCharge: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceSnapshot {
  invoiceNumber: string;
  issueDate: string;
  customer: {
    id: string;
    customerCode: string;
    fullName: string;
    phone?: string;
    address?: string;
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  additionalCharges: number;
  grandTotal: number;
  currency: string;
  notes?: string;
  revision: number;
}

export interface InvoiceRevision {
  id: string;
  invoiceId: string;
  revisionNumber: number;
  previousSnapshot: InvoiceSnapshot;
  newSnapshot: InvoiceSnapshot;
  previousTotal: number;
  newTotal: number;
  difference: number; // positive = increased owed, negative = decreased owed
  reason: string;
  revisedBy?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  customerId: string;
  issueDate: string;
  currency: string;
  subtotal: number;
  discount: number;
  additionalCharges: number;
  grandTotal: number;
  amountPaid: number;
  currentRevision: number;
  status: InvoiceStatus;
  snapshotData: InvoiceSnapshot;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  customerId: string;
  invoiceId?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  idempotencyKey?: string;
  createdBy?: string;
  createdAt: string;
}

export interface CustomerTransaction {
  id: string;
  customerId: string;
  transactionDate: string;
  transactionType: TransactionType;
  referenceId?: string;
  referenceCode?: string;
  description: string;
  debit: number;  // increases customer debt
  credit: number; // decreases customer debt (payments)
  createdBy?: string;
  createdAt: string;
}

export interface BusinessSettings {
  id: string;
  businessName: string;
  phone: string;
  email: string;
  address: string;
  logoUrl?: string;
  currency: string;
  invoiceFooterNote: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  tableName: string;
  recordId?: string;
  actorId?: string;
  payload?: unknown;
  createdAt: string;
}
