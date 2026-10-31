import {
  Customer,
  Product,
  Order,
  Invoice,
  InvoiceRevision,
  Payment,
  CustomerTransaction,
  BusinessSettings,
  AuditLog,
  OrderItem,
} from '../types';
import { calculateOrderTotals, calculateBalance, roundToTwo } from '../utils/finance';

const STORAGE_KEYS = {
  CUSTOMERS: 'saudi_carry_customers',
  PRODUCTS: 'saudi_carry_products',
  ORDERS: 'saudi_carry_orders',
  INVOICES: 'saudi_carry_invoices',
  REVISIONS: 'saudi_carry_revisions',
  PAYMENTS: 'saudi_carry_payments',
  TRANSACTIONS: 'saudi_carry_transactions',
  SETTINGS: 'saudi_carry_settings',
  AUDIT: 'saudi_carry_audit',
  INITIALIZED: 'saudi_carry_initialized_v1',
};

// Default business settings
const DEFAULT_SETTINGS: BusinessSettings = {
  id: 'default-settings',
  businessName: 'Saudi Carry Express & Logistics',
  phone: '+92 321 4567890',
  email: 'operations@saudicarry.pk',
  address: 'Shop 14, Madina Market, Lahore, Pakistan',
  logoUrl: '',
  currency: 'PKR',
  invoiceFooterNote: 'Carry charges only; product purchase/selling prices are not included.',
  updatedAt: new Date().toISOString(),
};

// Default seed data for initial testing and demonstration
const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    customerCode: 'CUST-001',
    fullName: 'Haji Muhammad Iqbal',
    phone: '+92 300 1234567',
    address: 'Gulberg III, Lahore',
    notes: 'Regular merchant, carries perfumes and dates.',
    openingBalance: 0,
    isActive: true,
    createdAt: new Date('2026-01-10T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-10T10:00:00Z').toISOString(),
  },
  {
    id: 'cust-2',
    customerCode: 'CUST-002',
    fullName: 'Tariq Mehmood Traders',
    phone: '+92 321 9876543',
    address: 'Saddar Bazaar, Rawalpindi',
    notes: 'Bulk electronics & fabrics.',
    openingBalance: 5000,
    isActive: true,
    createdAt: new Date('2026-01-15T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-15T10:00:00Z').toISOString(),
  },
  {
    id: 'cust-3',
    customerCode: 'CUST-003',
    fullName: 'Sheikh Abdul Rehman',
    phone: '+92 333 5551212',
    address: 'F-7 Markaz, Islamabad',
    notes: 'Personal consignments.',
    openingBalance: 0,
    isActive: true,
    createdAt: new Date('2026-02-01T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-02-01T10:00:00Z').toISOString(),
  },
];

const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'AJWA-KG',
    name: 'Ajwa Al-Madinah VIP Dates (1 Kg Box)',
    category: 'Food & Dates',
    defaultCarryCharge: 650,
    chargeMethod: 'PER_UNIT',
    currency: 'PKR',
    notes: 'Per kg freight charge from Madinah',
    isActive: true,
    createdAt: new Date('2026-01-05T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-05T10:00:00Z').toISOString(),
  },
  {
    id: 'prod-2',
    sku: 'OUD-BTL',
    name: 'Saudi Kalakas Pure Dehn Al-Oud (6ml bottle)',
    category: 'Fragrance',
    defaultCarryCharge: 1200,
    chargeMethod: 'PER_UNIT',
    currency: 'PKR',
    notes: 'Fragile handling carry fee',
    isActive: true,
    createdAt: new Date('2026-01-05T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-05T10:00:00Z').toISOString(),
  },
  {
    id: 'prod-3',
    sku: 'ABAYA-BOX',
    name: 'Designer Dubai-Cut Saudi Abaya Parcel',
    category: 'Garments',
    defaultCarryCharge: 2500,
    chargeMethod: 'PER_ORDER',
    currency: 'PKR',
    notes: 'Flat consignment charge per box regardless of count',
    isActive: true,
    createdAt: new Date('2026-01-05T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-05T10:00:00Z').toISOString(),
  },
  {
    id: 'prod-4',
    sku: 'PRAYER-MAT',
    name: 'Rawdah Silk Embossed Janamaz',
    category: 'Souvenirs',
    defaultCarryCharge: 400,
    chargeMethod: 'PER_UNIT',
    currency: 'PKR',
    notes: 'Standard carry rate per mat',
    isActive: true,
    createdAt: new Date('2026-01-05T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-05T10:00:00Z').toISOString(),
  },
  {
    id: 'prod-5',
    sku: 'SAUDI-NUTS-KG',
    name: 'Madinah Pistachio & Mixed Dry Fruits (Weight Cargo)',
    category: 'Food & Dates',
    defaultCarryCharge: 800,
    chargeMethod: 'PER_KG',
    currency: 'PKR',
    notes: 'Freight charge per kilogram based on luggage scale weight',
    isActive: true,
    createdAt: new Date('2026-01-05T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-05T10:00:00Z').toISOString(),
  },
];

export class StorageService {
  private memoryCache: Record<string, unknown> = {};

  constructor(private serverState?: Record<string, unknown>, private actorId?: string) {
    if (serverState) this.memoryCache = structuredClone(serverState);
    else this.init();
  }

  public exportState(): Record<string, unknown> { return structuredClone(this.memoryCache); }
  public replaceState(state: Record<string, unknown>): void { this.memoryCache = structuredClone(state); }
  public static emptyState(): Record<string, unknown> {
    return Object.fromEntries(Object.entries(STORAGE_KEYS).map(([name, key]) => [key,
      name === 'INITIALIZED' ? true : name === 'SETTINGS' ? {
        ...DEFAULT_SETTINGS, businessName: 'Carry Charges', phone: '', email: '', address: '',
      } : []]));
  }

  private isBrowser(): boolean {
    return !this.serverState && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private getItem<T>(key: string, defaultValue: T): T {
    if (this.isBrowser()) {
      try {
        const item = window.localStorage.getItem(key);
        if (item) return JSON.parse(item) as T;
      } catch (err) {
        throw new Error(`Could not read browser storage (${key}). Data may be unavailable or corrupted.`, { cause: err });
      }
    }
    return (this.memoryCache[key] as T) ?? defaultValue;
  }

  private setItem<T>(key: string, value: T): void {
    if (this.isBrowser()) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        throw new Error(`Could not save to browser storage (${key}). The change was not saved.`, { cause: err });
      }
    }
    this.memoryCache[key] = value;
  }

  public init(forceReset = false): void {
    if (!this.getItem(STORAGE_KEYS.INITIALIZED, false) || forceReset) {
      this.setItem(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
      this.setItem(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
      this.setItem(STORAGE_KEYS.ORDERS, []);
      this.setItem(STORAGE_KEYS.INVOICES, []);
      this.setItem(STORAGE_KEYS.REVISIONS, []);
      this.setItem(STORAGE_KEYS.PAYMENTS, []);
      this.setItem(STORAGE_KEYS.TRANSACTIONS, [
        // Seed opening balance transaction for customer 2
        {
          id: 'trans-init-2',
          customerId: 'cust-2',
          transactionDate: new Date('2026-01-15T10:00:00Z').toISOString(),
          transactionType: 'OPENING_BALANCE',
          referenceCode: 'BAL-FWD',
          description: 'Opening balance brought forward',
          debit: 5000,
          credit: 0,
          createdAt: new Date('2026-01-15T10:00:00Z').toISOString(),
        },
      ]);
      this.setItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      this.setItem(STORAGE_KEYS.AUDIT, [
        {
          id: 'audit-init',
          action: 'SYSTEM_INITIALIZED',
          tableName: 'system',
          createdAt: new Date().toISOString(),
          payload: { message: 'Database state initialized with seed dataset' },
        },
      ]);
      this.setItem(STORAGE_KEYS.INITIALIZED, true);
    }
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    return this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  }

  public getCustomer(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  public saveCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Customer {
    if (!customer.fullName?.trim()) throw new Error('Customer name is required.');
    if (!Number.isFinite(customer.openingBalance)) throw new Error('Opening balance must be finite.');
    const customers = this.getCustomers();
    if (customers.some(c => c.id !== customer.id && c.customerCode === customer.customerCode && customer.customerCode)) throw new Error('Customer code already exists.');
    const now = new Date().toISOString();

    if (customer.id) {
      const index = customers.findIndex((c) => c.id === customer.id);
      if (index === -1) throw new Error('Customer not found');
      if (customer.openingBalance !== customers[index].openingBalance) throw new Error('Opening balance cannot be changed after creation.');
      const updated: Customer = {
        ...customers[index],
        ...customer,
        id: customer.id,
        updatedAt: now,
      };
      customers[index] = updated;
      this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
      this.logAudit('UPDATE_CUSTOMER', 'customers', updated.id, updated);
      return updated;
    } else {
      const count = customers.length + 1;
      const customerCode = customer.customerCode || `CUST-${String(count).padStart(3, '0')}`;
      const newCustomer: Customer = {
        ...customer,
        id: 'cust-' + crypto.randomUUID(),
        customerCode,
        createdAt: now,
        updatedAt: now,
      };
      customers.push(newCustomer);
      this.setItem(STORAGE_KEYS.CUSTOMERS, customers);

      // Record opening balance if > 0
      if (newCustomer.openingBalance !== 0) {
        this.addTransaction({
          customerId: newCustomer.id,
          transactionDate: now,
          transactionType: 'OPENING_BALANCE',
          referenceCode: 'INIT-BAL',
          description: 'Account opening balance brought forward',
          debit: Math.max(0, newCustomer.openingBalance),
          credit: Math.max(0, -newCustomer.openingBalance),
        });
      }

      this.logAudit('CREATE_CUSTOMER', 'customers', newCustomer.id, newCustomer);
      return newCustomer;
    }
  }

  public archiveCustomer(id: string): boolean {
    const customers = this.getCustomers();
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) return false;
    customers[index].isActive = false;
    customers[index].updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    this.logAudit('ARCHIVE_CUSTOMER', 'customers', id, { isActive: false });
    return true;
  }

  // --- Products ---
  public getProducts(): Product[] {
    return this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  }

  public getProduct(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  public saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Product {
    if (!product.name || !product.name.trim()) {
      throw new Error('Product name is required.');
    }
    if (product.defaultCarryCharge === undefined || product.defaultCarryCharge === null || !Number.isFinite(product.defaultCarryCharge) || Number(product.defaultCarryCharge) < 0) {
      throw new Error('Default carry charge cannot be negative.');
    }
    const validMethods = ['PER_UNIT', 'PER_ORDER', 'PER_KG'];
    if (!validMethods.includes(product.chargeMethod)) {
      throw new Error('Invalid charging method. Must be Per Unit, Per Order, or Per KG.');
    }

    const products = this.getProducts();
    const now = new Date().toISOString();

    const trimmedName = product.name.trim().toLowerCase();
    const trimmedSku = product.sku && product.sku.trim() ? product.sku.trim().toLowerCase() : null;

    // Check for accidental duplicate products
    const duplicate = products.find(
      (p) =>
        p.id !== product.id &&
        p.isActive &&
        (p.name.trim().toLowerCase() === trimmedName ||
          (trimmedSku && p.sku && p.sku.trim().toLowerCase() === trimmedSku))
    );

    if (duplicate) {
      if (trimmedSku && duplicate.sku && duplicate.sku.trim().toLowerCase() === trimmedSku) {
        throw new Error(`A product with SKU "${duplicate.sku}" already exists ("${duplicate.name}").`);
      }
      throw new Error(`A product with the name "${duplicate.name}" already exists in the catalog.`);
    }

    if (product.id) {
      const index = products.findIndex((p) => p.id === product.id);
      if (index === -1) throw new Error('Product not found');
      const updated: Product = {
        ...products[index],
        ...product,
        name: product.name.trim(),
        sku: product.sku?.trim() || undefined,
        category: product.category?.trim() || undefined,
        notes: product.notes?.trim() || undefined,
        id: product.id,
        updatedAt: now,
      };
      products[index] = updated;
      this.setItem(STORAGE_KEYS.PRODUCTS, products);
      this.logAudit('UPDATE_PRODUCT', 'products', updated.id, updated);
      return updated;
    } else {
      const newProduct: Product = {
        ...product,
        name: product.name.trim(),
        sku: product.sku?.trim() || undefined,
        category: product.category?.trim() || undefined,
        notes: product.notes?.trim() || undefined,
        id: 'prod-' + crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      products.push(newProduct);
      this.setItem(STORAGE_KEYS.PRODUCTS, products);
      this.logAudit('CREATE_PRODUCT', 'products', newProduct.id, newProduct);
      return newProduct;
    }
  }

  public archiveProduct(id: string): boolean {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return false;
    products[index].isActive = false;
    products[index].updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.logAudit('ARCHIVE_PRODUCT', 'products', id, { isActive: false });
    return true;
  }

  // --- Orders & Invoices ---
  public getOrders(): Order[] {
    return this.getItem<Order[]>(STORAGE_KEYS.ORDERS, []);
  }

  public getInvoices(): Invoice[] {
    return this.getItem<Invoice[]>(STORAGE_KEYS.INVOICES, []);
  }

  public getInvoice(id: string): Invoice | undefined {
    return this.getInvoices().find((inv) => inv.id === id || inv.invoiceNumber === id);
  }

  public getInvoiceRevisions(invoiceId: string): InvoiceRevision[] {
    return this.getItem<InvoiceRevision[]>(STORAGE_KEYS.REVISIONS, []).filter(
      (r) => r.invoiceId === invoiceId
    );
  }

  /**
   * Confirms an order, generates an invoice, and posts debit to the customer ledger atomically.
   */
  public confirmOrder(orderData: {
    customerId: string;
    items: OrderItem[];
    discount?: number;
    additionalCharges?: number;
    notes?: string;
  }): { order: Order; invoice: Invoice } {
    const customer = this.getCustomer(orderData.customerId);
    if (!customer || !customer.isActive) throw new Error('Select an active customer.');
    for (const item of orderData.items || []) {
      const product = this.getProduct(item.productId);
      if (!product || !product.isActive) throw new Error('Order contains an unavailable product.');
      if (item.quantity <= 0) throw new Error('Item quantity must be positive.');
    }
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    const totals = calculateOrderTotals(
      orderData.items,
      orderData.discount || 0,
      orderData.additionalCharges || 0
    );

    const now = new Date().toISOString();
    const orderCount = this.getOrders().length + 1;
    const invoiceCount = this.getInvoices().length + 1;

    const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCount).padStart(4, '0')}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount).padStart(4, '0')}`;

    const orderId = 'ord-' + crypto.randomUUID();
    const invoiceId = 'inv-' + crypto.randomUUID();

    const order: Order = {
      id: orderId,
      orderNumber,
      customerId: customer.id,
      status: 'CONFIRMED',
      currency: 'PKR',
      items: totals.items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      additionalCharges: totals.additionalCharges,
      totalCarryCharge: totals.grandTotal,
      notes: orderData.notes,
      createdAt: now,
      updatedAt: now,
    };

    const invoiceSnapshot = {
      invoiceNumber,
      issueDate: now.split('T')[0],
      customer: {
        id: customer.id,
        customerCode: customer.customerCode,
        fullName: customer.fullName,
        phone: customer.phone,
        address: customer.address,
      },
      items: totals.items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      additionalCharges: totals.additionalCharges,
      grandTotal: totals.grandTotal,
      currency: 'PKR',
      notes: orderData.notes,
      revision: 1,
    };

    const invoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      orderId,
      customerId: customer.id,
      issueDate: now.split('T')[0],
      currency: 'PKR',
      subtotal: totals.subtotal,
      discount: totals.discount,
      additionalCharges: totals.additionalCharges,
      grandTotal: totals.grandTotal,
      amountPaid: 0,
      currentRevision: 1,
      status: 'UNPAID',
      snapshotData: invoiceSnapshot,
      createdAt: now,
      updatedAt: now,
    };

    // Save Order & Invoice
    const orders = this.getOrders();
    orders.push(order);
    this.setItem(STORAGE_KEYS.ORDERS, orders);

    const invoices = this.getInvoices();
    invoices.push(invoice);
    this.setItem(STORAGE_KEYS.INVOICES, invoices);

    // Post exactly one debit to customer ledger
    this.addTransaction({
      customerId: customer.id,
      transactionDate: now,
      transactionType: 'INVOICE',
      referenceId: invoiceId,
      referenceCode: invoiceNumber,
      description: `Carry Charges Invoice ${invoiceNumber}`,
      debit: totals.grandTotal,
      credit: 0,
    });

    this.logAudit('CONFIRM_ORDER_AND_INVOICE', 'invoices', invoiceId, {
      orderNumber,
      invoiceNumber,
      grandTotal: totals.grandTotal,
    });

    return { order, invoice };
  }

  /**
   * Revises an existing invoice, saves immutable revision record,
   * and posts a balanced differential transaction to customer ledger.
   */
  public reviseInvoice(
    invoiceId: string,
    updatedItems: OrderItem[],
    discount: number = 0,
    additionalCharges: number = 0,
    reason: string
  ): Invoice {
    if (!reason || reason.trim() === '') {
      throw new Error('A reason is mandatory for revising an invoice.');
    }

    const invoices = this.getInvoices();
    const index = invoices.findIndex((inv) => inv.id === invoiceId);
    if (index === -1) throw new Error('Invoice not found');

    const invoice = invoices[index];
    if (invoice.status === 'CANCELLED') throw new Error('Cancelled invoices cannot be revised.');
    if (!updatedItems.length) throw new Error('An invoice must contain at least one item.');
    const previousSnapshot = invoice.snapshotData;
    const previousTotal = invoice.grandTotal;

    const totals = calculateOrderTotals(updatedItems, discount, additionalCharges);
    const newTotal = totals.grandTotal;
    const difference = roundToTwo(newTotal - previousTotal);

    const now = new Date().toISOString();
    const nextRevision = invoice.currentRevision + 1;

    const newSnapshot = {
      ...previousSnapshot,
      items: totals.items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      additionalCharges: totals.additionalCharges,
      grandTotal: newTotal,
      revision: nextRevision,
    };

    // Create immutable revision
    const revision: InvoiceRevision = {
      id: 'rev-' + crypto.randomUUID(),
      invoiceId,
      revisionNumber: nextRevision,
      previousSnapshot,
      newSnapshot,
      previousTotal,
      newTotal,
      difference,
      reason,
      createdAt: now,
    };

    const revisions = this.getItem<InvoiceRevision[]>(STORAGE_KEYS.REVISIONS, []);
    revisions.push(revision);
    this.setItem(STORAGE_KEYS.REVISIONS, revisions);

    // Update invoice record
    const updatedInvoice: Invoice = {
      ...invoice,
      subtotal: totals.subtotal,
      discount: totals.discount,
      additionalCharges: totals.additionalCharges,
      grandTotal: newTotal,
      currentRevision: nextRevision,
      status: invoice.amountPaid >= newTotal ? 'PAID' : (invoice.amountPaid > 0 ? 'PARTIAL' : 'REVISED'),
      snapshotData: newSnapshot,
      updatedAt: now,
    };

    invoices[index] = updatedInvoice;
    this.setItem(STORAGE_KEYS.INVOICES, invoices);

    // Post ledger adjustment for the difference
    if (difference !== 0) {
      if (difference > 0) {
        // Customer owes more -> Debit adjustment
        this.addTransaction({
          customerId: invoice.customerId,
          transactionDate: now,
          transactionType: 'ADJUSTMENT',
          referenceId: invoice.id,
          referenceCode: `${invoice.invoiceNumber}-R${nextRevision}`,
          description: `Invoice revision adjustment (Increase): ${reason}`,
          debit: difference,
          credit: 0,
        });
      } else {
        // Customer owes less -> Credit adjustment
        this.addTransaction({
          customerId: invoice.customerId,
          transactionDate: now,
          transactionType: 'ADJUSTMENT',
          referenceId: invoice.id,
          referenceCode: `${invoice.invoiceNumber}-R${nextRevision}`,
          description: `Invoice revision adjustment (Reduction): ${reason}`,
          debit: 0,
          credit: Math.abs(difference),
        });
      }
    }

    this.logAudit('REVISE_INVOICE', 'invoices', invoiceId, {
      revisionNumber: nextRevision,
      previousTotal,
      newTotal,
      difference,
      reason,
    });

    return updatedInvoice;
  }

  /**
   * Cancels an invoice by marking status CANCELLED and posting a credit reversal
   * to the customer ledger for the unpaid/total amount, preserving all payment records.
   */
  public cancelInvoice(invoiceId: string, reason: string): Invoice {
    if (!reason || reason.trim() === '') {
      throw new Error('A reason is mandatory for cancelling an invoice.');
    }

    const invoices = this.getInvoices();
    const index = invoices.findIndex((i) => i.id === invoiceId);
    if (index === -1) throw new Error('Invoice not found');

    const invoice = invoices[index];
    if (invoice.status === 'CANCELLED') {
      throw new Error('Invoice is already cancelled.');
    }

    const now = new Date().toISOString();
    invoices[index] = {
      ...invoice,
      status: 'CANCELLED',
      updatedAt: now,
    };
    this.setItem(STORAGE_KEYS.INVOICES, invoices);

    // Reversal entry: Credit the customer for the invoice grand total
    this.addTransaction({
      customerId: invoice.customerId,
      transactionDate: now,
      transactionType: 'ADJUSTMENT',
      referenceId: invoice.id,
      referenceCode: `${invoice.invoiceNumber}-CANCEL`,
      description: `Invoice cancellation reversal: ${reason}`,
      debit: 0,
      credit: invoice.grandTotal,
    });

    this.logAudit('CANCEL_INVOICE', 'invoices', invoiceId, { reason });
    return invoices[index];
  }

  /**
   * Records a cash or bank refund returned to customer, which increases customer balance (Debit).
   */
  public recordRefund(data: {
    customerId: string;
    amount: number;
    paymentMethod: Payment['paymentMethod'];
    reason: string;
  }): CustomerTransaction {
    const customer = this.getCustomer(data.customerId);
    if (!customer) throw new Error('Customer not found');
    if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error('Refund amount must be positive');
    if (!data.reason?.trim()) throw new Error('Refund reason is required.');
    const available = -this.getCustomerStatement(customer.id).closingBalance;
    if (roundToTwo(data.amount) > available) throw new Error('Refund exceeds available customer credit.');

    const now = new Date().toISOString();
    const tx = this.addTransaction({
      customerId: customer.id,
      transactionDate: now,
      transactionType: 'REFUND',
      referenceCode: 'REFUND-' + Date.now().toString().slice(-4),
      description: `Customer refund paid (${data.paymentMethod}): ${data.reason}`,
      debit: data.amount,
      credit: 0,
    });

    this.logAudit('RECORD_REFUND', 'customer_transactions', tx.id, data);
    return tx;
  }

  // --- Payments & Ledger ---
  public getPayments(): Payment[] {
    return this.getItem<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
  }

  public recordPayment(paymentData: {
    customerId: string;
    invoiceId?: string;
    amount: number;
    paymentMethod: Payment['paymentMethod'];
    paymentDate?: string;
    referenceNumber?: string;
    notes?: string;
    idempotencyKey?: string;
  }): Payment {
    const customer = this.getCustomer(paymentData.customerId);
    if (!customer) throw new Error('Customer not found');

    if (!Number.isFinite(paymentData.amount)) throw new Error('Payment amount must be a finite number');
    const amount = roundToTwo(paymentData.amount);
    if (amount <= 0) throw new Error('Payment amount must be greater than zero');

    // Idempotency check
    const payments = this.getPayments();
    if (paymentData.idempotencyKey) {
      const existing = payments.find((p) => p.idempotencyKey === paymentData.idempotencyKey);
      if (existing) {
        if (existing.customerId !== paymentData.customerId || existing.invoiceId !== paymentData.invoiceId || existing.amount !== amount || existing.paymentMethod !== paymentData.paymentMethod) {
          throw new Error('This payment key has already been used for a different payment.');
        }
        return existing;
      }
    }

    if (paymentData.invoiceId) {
      const invoice = this.getInvoice(paymentData.invoiceId);
      if (!invoice) throw new Error('Invoice not found.');
      if (invoice.customerId !== customer.id) throw new Error('Invoice does not belong to this customer.');
      if (invoice.status === 'CANCELLED') throw new Error('Cannot pay a cancelled invoice.');
    }

    const now = new Date().toISOString();
    const count = payments.length + 1;
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const paymentId = 'pay-' + crypto.randomUUID();

    const payment: Payment = {
      id: paymentId,
      paymentNumber,
      customerId: customer.id,
      invoiceId: paymentData.invoiceId,
      paymentDate: paymentData.paymentDate || now.split('T')[0],
      amount,
      paymentMethod: paymentData.paymentMethod,
      referenceNumber: paymentData.referenceNumber,
      notes: paymentData.notes,
      idempotencyKey: paymentData.idempotencyKey,
      createdAt: now,
    };

    payments.push(payment);
    this.setItem(STORAGE_KEYS.PAYMENTS, payments);

    // Update invoice paid amount if tied to a specific invoice
    if (paymentData.invoiceId) {
      const invoices = this.getInvoices();
      const invIndex = invoices.findIndex((i) => i.id === paymentData.invoiceId);
      if (invIndex !== -1) {
        const inv = invoices[invIndex];
        const newPaid = roundToTwo(inv.amountPaid + amount);
        const status = newPaid >= inv.grandTotal ? 'PAID' : 'PARTIAL';
        invoices[invIndex] = { ...inv, amountPaid: newPaid, status, updatedAt: now };
        this.setItem(STORAGE_KEYS.INVOICES, invoices);
      }
    }

    // Post payment credit to customer ledger
    this.addTransaction({
      customerId: customer.id,
      transactionDate: now,
      transactionType: 'PAYMENT',
      referenceId: paymentId,
      referenceCode: paymentNumber,
      description: paymentData.invoiceId
        ? `Payment received for Invoice (${payment.paymentMethod})`
        : `Advance payment received (${payment.paymentMethod})`,
      debit: 0,
      credit: amount,
    });

    this.logAudit('RECORD_PAYMENT', 'payments', paymentId, {
      paymentNumber,
      amount,
      customerId: customer.id,
      invoiceId: paymentData.invoiceId,
    });

    return payment;
  }

  // --- Transactions & Customer Statement ---
  public getTransactions(customerId?: string): CustomerTransaction[] {
    const list = this.getItem<CustomerTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    if (customerId) {
      return list.filter((t) => t.customerId === customerId);
    }
    return list;
  }

  private addTransaction(
    item: Omit<CustomerTransaction, 'id' | 'createdAt'> & { id?: string }
  ): CustomerTransaction {
    const transactions = this.getItem<CustomerTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const transaction: CustomerTransaction = {
      ...item,
      id: item.id || 'trans-' + crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    transactions.push(transaction);
    this.setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
    return transaction;
  }

  /**
   * Builds an authoritative statement for a customer, calculating:
   * - openingBalance before date range
   * - debits in date range
   * - credits in date range
   * - closingBalance = opening + debits - credits
   */
  public getCustomerStatement(
    customerId: string,
    startDate?: string,
    endDate?: string
  ): {
    customer: Customer;
    openingBalance: number;
    debits: number;
    credits: number;
    closingBalance: number;
    statementTransactions: Array<CustomerTransaction & { runningBalance: number }>;
  } {
    const customer = this.getCustomer(customerId);
    if (!customer) throw new Error('Customer not found');

    const allCustomerTransactions = this.getTransactions(customerId).sort(
      (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    let priorDebits = 0;
    let priorCredits = 0;
    const inRangeTransactions: CustomerTransaction[] = [];

    const startTs = startDate ? new Date(startDate).getTime() : 0;
    const endTs = endDate ? new Date(endDate).getTime() + 86400000 : Infinity; // inclusive end of day

    // Base opening balance
    let baseOpening = customer.openingBalance || 0;

    for (const t of allCustomerTransactions) {
      const tTime = new Date(t.transactionDate).getTime();
      if (t.transactionType === 'OPENING_BALANCE') {
        // OPENING_BALANCE transaction represents initial balance brought forward
        baseOpening = roundToTwo(t.debit - t.credit);
        continue;
      }

      if (tTime < startTs) {
        priorDebits += t.debit;
        priorCredits += t.credit;
      } else if (tTime < endTs) {
        inRangeTransactions.push(t);
      }
    }

    const openingBalance = calculateBalance(baseOpening, priorDebits, priorCredits);

    let currentRunning = openingBalance;
    let totalRangeDebits = 0;
    let totalRangeCredits = 0;

    const statementTransactions = inRangeTransactions.map((tx) => {
      totalRangeDebits += tx.debit;
      totalRangeCredits += tx.credit;
      currentRunning = calculateBalance(currentRunning, tx.debit, tx.credit);
      return {
        ...tx,
        runningBalance: currentRunning,
      };
    });

    const closingBalance = calculateBalance(openingBalance, totalRangeDebits, totalRangeCredits);

    return {
      customer,
      openingBalance,
      debits: roundToTwo(totalRangeDebits),
      credits: roundToTwo(totalRangeCredits),
      closingBalance,
      statementTransactions,
    };
  }

  // --- Settings & Audit ---
  public getBusinessSettings(): BusinessSettings {
    return this.getItem<BusinessSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  public updateBusinessSettings(settings: Partial<BusinessSettings>): BusinessSettings {
    const current = this.getBusinessSettings();
    const updated: BusinessSettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    this.setItem(STORAGE_KEYS.SETTINGS, updated);
    this.logAudit('UPDATE_SETTINGS', 'business_settings', updated.id, updated);
    return updated;
  }

  public getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT, []).reverse();
  }

  private logAudit(action: string, tableName: string, recordId?: string, payload?: unknown): void {
    const logs = this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT, []);
    const log: AuditLog = {
      id: 'audit-' + crypto.randomUUID(),
      action,
      actorId: this.actorId,
      tableName,
      recordId,
      payload,
      createdAt: new Date().toISOString(),
    };
    logs.push(log);
    this.setItem(STORAGE_KEYS.AUDIT, logs);
  }

  // --- Dashboard Aggregations ---
  public getDashboardMetrics() {
    const customers = this.getCustomers();
    const products = this.getProducts();
    const orders = this.getOrders();
    const invoices = this.getInvoices();
    const payments = this.getPayments();

    let totalInvoicedCarryCharges = 0;
    let totalPaymentsCollected = 0;
    let totalReceivables = 0; // customers who owe money
    let totalAdvanceCredits = 0; // customers with negative balance

    for (const c of customers) {
      const stmt = this.getCustomerStatement(c.id);
      if (stmt.closingBalance > 0) {
        totalReceivables += stmt.closingBalance;
      } else if (stmt.closingBalance < 0) {
        totalAdvanceCredits += Math.abs(stmt.closingBalance);
      }
    }

    for (const inv of invoices) {
      if (inv.status !== 'CANCELLED') {
        totalInvoicedCarryCharges += inv.grandTotal;
      }
    }

    for (const p of payments) {
      totalPaymentsCollected += p.amount;
    }

    return {
      activeCustomersCount: customers.filter((c) => c.isActive).length,
      activeProductsCount: products.filter((p) => p.isActive).length,
      ordersCount: orders.length,
      invoicesCount: invoices.length,
      totalInvoicedCarryCharges: roundToTwo(totalInvoicedCarryCharges),
      totalPaymentsCollected: roundToTwo(totalPaymentsCollected),
      totalReceivables: roundToTwo(totalReceivables),
      totalAdvanceCredits: roundToTwo(totalAdvanceCredits),
    };
  }
}


