import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../src/services/storage';

describe('Customer Ledger & Financial Reconciliation Suite', () => {
  beforeEach(() => {
    storage.init(true); // clean isolated state
  });

  it('1. Confirmed invoice posts exactly one debit to customer ledger', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-001',
      fullName: 'Customer One',
      openingBalance: 0,
      isActive: true,
    });

    const products = storage.getProducts();
    const result = storage.confirmOrder({
      customerId: customer.id,
      items: [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 2,
          chargeMethod: 'PER_UNIT',
          carryCharge: 500,
          lineTotal: 1000,
        },
      ],
    });

    expect(result.invoice.grandTotal).toBe(1000);

    const statement = storage.getCustomerStatement(customer.id);
    expect(statement.openingBalance).toBe(0);
    expect(statement.debits).toBe(1000);
    expect(statement.credits).toBe(0);
    expect(statement.closingBalance).toBe(1000);
    expect(statement.statementTransactions.length).toBe(1);
    expect(statement.statementTransactions[0].transactionType).toBe('INVOICE');
    expect(statement.statementTransactions[0].debit).toBe(1000);
  });

  it('2. Full payment posts exactly one credit and settles balance to zero', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-002',
      fullName: 'Customer Two',
      openingBalance: 0,
      isActive: true,
    });

    const products = storage.getProducts();
    const { invoice } = storage.confirmOrder({
      customerId: customer.id,
      items: [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 1,
          chargeMethod: 'PER_UNIT',
          carryCharge: 1500,
          lineTotal: 1500,
        },
      ],
    });

    storage.recordPayment({
      customerId: customer.id,
      invoiceId: invoice.id,
      amount: 1500,
      paymentMethod: 'CASH',
    });

    const statement = storage.getCustomerStatement(customer.id);
    expect(statement.debits).toBe(1500);
    expect(statement.credits).toBe(1500);
    expect(statement.closingBalance).toBe(0);

    const updatedInvoice = storage.getInvoice(invoice.id);
    expect(updatedInvoice?.status).toBe('PAID');
    expect(updatedInvoice?.amountPaid).toBe(1500);
  });

  it('3. Partial payment leaves the exact calculated remaining balance', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-003',
      fullName: 'Customer Three',
      openingBalance: 0,
      isActive: true,
    });

    const products = storage.getProducts();
    const { invoice } = storage.confirmOrder({
      customerId: customer.id,
      items: [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 2,
          chargeMethod: 'PER_UNIT',
          carryCharge: 1000,
          lineTotal: 2000,
        },
      ],
    });

    storage.recordPayment({
      customerId: customer.id,
      invoiceId: invoice.id,
      amount: 750,
      paymentMethod: 'BANK_TRANSFER',
    });

    const statement = storage.getCustomerStatement(customer.id);
    expect(statement.debits).toBe(2000);
    expect(statement.credits).toBe(750);
    expect(statement.closingBalance).toBe(1250);

    const updatedInvoice = storage.getInvoice(invoice.id);
    expect(updatedInvoice?.status).toBe('PARTIAL');
    expect(updatedInvoice?.amountPaid).toBe(750);
  });

  it('4. Multiple payments accumulate and reconcile without discrepancy', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-004',
      fullName: 'Customer Four',
      openingBalance: 0,
      isActive: true,
    });

    const products = storage.getProducts();
    const { invoice } = storage.confirmOrder({
      customerId: customer.id,
      items: [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 1,
          chargeMethod: 'PER_UNIT',
          carryCharge: 3000,
          lineTotal: 3000,
        },
      ],
    });

    storage.recordPayment({
      customerId: customer.id,
      invoiceId: invoice.id,
      amount: 1000,
      paymentMethod: 'CASH',
    });
    storage.recordPayment({
      customerId: customer.id,
      invoiceId: invoice.id,
      amount: 1200,
      paymentMethod: 'ONLINE',
    });

    const statement = storage.getCustomerStatement(customer.id);
    expect(statement.credits).toBe(2200);
    expect(statement.closingBalance).toBe(800);
  });

  it('5. Advance payment creates customer credit (negative balance)', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-005',
      fullName: 'Customer Five',
      openingBalance: 0,
      isActive: true,
    });

    storage.recordPayment({
      customerId: customer.id,
      amount: 5000,
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Advance security deposit for upcoming Umrah luggage',
    });

    const statement = storage.getCustomerStatement(customer.id);
    expect(statement.debits).toBe(0);
    expect(statement.credits).toBe(5000);
    expect(statement.closingBalance).toBe(-5000);
  });

  it('6. Opening balance is carried forward into the account ledger', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-006',
      fullName: 'Customer Six',
      openingBalance: 3500,
      isActive: true,
    });

    const statement = storage.getCustomerStatement(customer.id);
    expect(statement.openingBalance).toBe(3500);
    expect(statement.closingBalance).toBe(3500);
  });

  it('7. Invoice revision (increase) posts debit adjustment for the difference', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-007',
      fullName: 'Customer Seven',
      openingBalance: 0,
      isActive: true,
    });

    const products = storage.getProducts();
    const { invoice } = storage.confirmOrder({
      customerId: customer.id,
      items: [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 2,
          chargeMethod: 'PER_UNIT',
          carryCharge: 500,
          lineTotal: 1000,
        },
      ],
    });

    // Revise to 3 units (1500)
    const revised = storage.reviseInvoice(
      invoice.id,
      [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 3,
          chargeMethod: 'PER_UNIT',
          carryCharge: 500,
          lineTotal: 1500,
        },
      ],
      0,
      0,
      'Increased box count'
    );

    expect(revised.grandTotal).toBe(1500);
    const statement = storage.getCustomerStatement(customer.id);
    expect(statement.debits).toBe(1500); // 1000 initial + 500 adjustment
    expect(statement.closingBalance).toBe(1500);
  });

  it('8. Invoice revision (decrease) posts credit adjustment for the difference', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-008',
      fullName: 'Customer Eight',
      openingBalance: 0,
      isActive: true,
    });

    const products = storage.getProducts();
    const { invoice } = storage.confirmOrder({
      customerId: customer.id,
      items: [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 4,
          chargeMethod: 'PER_UNIT',
          carryCharge: 500,
          lineTotal: 2000,
        },
      ],
    });

    // Revise down to 2 units (1000)
    storage.reviseInvoice(
      invoice.id,
      [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 2,
          chargeMethod: 'PER_UNIT',
          carryCharge: 500,
          lineTotal: 1000,
        },
      ],
      0,
      0,
      'Customer reduced order quantity'
    );

    const statement = storage.getCustomerStatement(customer.id);
    expect(statement.debits).toBe(2000); // initial
    expect(statement.credits).toBe(1000); // reduction adjustment
    expect(statement.closingBalance).toBe(1000); // net 1000 owed
  });

  it('9. Invoice revision after partial payment preserves payment records', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-009',
      fullName: 'Customer Nine',
      openingBalance: 0,
      isActive: true,
    });

    const products = storage.getProducts();
    const { invoice } = storage.confirmOrder({
      customerId: customer.id,
      items: [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 2,
          chargeMethod: 'PER_UNIT',
          carryCharge: 1000,
          lineTotal: 2000,
        },
      ],
    });

    // Customer pays 1200
    storage.recordPayment({
      customerId: customer.id,
      invoiceId: invoice.id,
      amount: 1200,
      paymentMethod: 'CASH',
    });

    // Revise from 2000 to 2500
    storage.reviseInvoice(
      invoice.id,
      [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 2.5,
          chargeMethod: 'PER_UNIT',
          carryCharge: 1000,
          lineTotal: 2500,
        },
      ],
      0,
      0,
      'Additional weight carry charge'
    );

    const payments = storage.getPayments().filter((p) => p.customerId === customer.id);
    expect(payments.length).toBe(1);
    expect(payments[0].amount).toBe(1200);

    const statement = storage.getCustomerStatement(customer.id);
    expect(statement.debits).toBe(2500); // 2000 + 500
    expect(statement.credits).toBe(1200);
    expect(statement.closingBalance).toBe(1300);
  });

  it('10. Revision that creates an overpayment results in customer credit', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-010',
      fullName: 'Customer Ten',
      openingBalance: 0,
      isActive: true,
    });

    const products = storage.getProducts();
    const { invoice } = storage.confirmOrder({
      customerId: customer.id,
      items: [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 2,
          chargeMethod: 'PER_UNIT',
          carryCharge: 1000,
          lineTotal: 2000,
        },
      ],
    });

    // Paid full 2000
    storage.recordPayment({
      customerId: customer.id,
      invoiceId: invoice.id,
      amount: 2000,
      paymentMethod: 'BANK_TRANSFER',
    });

    // Revise invoice down to 1500
    storage.reviseInvoice(
      invoice.id,
      [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 1.5,
          chargeMethod: 'PER_UNIT',
          carryCharge: 1000,
          lineTotal: 1500,
        },
      ],
      0,
      0,
      'Agreed price discount adjustment'
    );

    const statement = storage.getCustomerStatement(customer.id);
    // Debits: 2000, Credits: 2000 (payment) + 500 (adjustment) = 2500
    // Closing: 2000 - 2500 = -500 (Customer Advance Credit)
    expect(statement.closingBalance).toBe(-500);
  });

  it('11. Cancellation posts the correct reversal and preserves invoices', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-011',
      fullName: 'Customer Eleven',
      openingBalance: 0,
      isActive: true,
    });

    const products = storage.getProducts();
    const { invoice } = storage.confirmOrder({
      customerId: customer.id,
      items: [
        {
          id: 'item-1',
          productId: products[0].id,
          productNameSnapshot: products[0].name,
          quantity: 1,
          chargeMethod: 'PER_UNIT',
          carryCharge: 1800,
          lineTotal: 1800,
        },
      ],
    });

    storage.cancelInvoice(invoice.id, 'Flight delayed / luggage not accepted');

    const updated = storage.getInvoice(invoice.id);
    expect(updated?.status).toBe('CANCELLED');

    const statement = storage.getCustomerStatement(customer.id);
    expect(statement.debits).toBe(1800);
    expect(statement.credits).toBe(1800); // cancelled reversal credit
    expect(statement.closingBalance).toBe(0);
  });

  it('12. Refund is represented by a separate refund transaction', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-012',
      fullName: 'Customer Twelve',
      openingBalance: 0,
      isActive: true,
    });

    // Customer deposited advance of 3000
    storage.recordPayment({
      customerId: customer.id,
      amount: 3000,
      paymentMethod: 'CASH',
    });

    // Refund 1000 back to customer
    storage.recordRefund({
      customerId: customer.id,
      amount: 1000,
      paymentMethod: 'CASH',
      reason: 'Partial return of unused advance credit',
    });

    const statement = storage.getCustomerStatement(customer.id);
    // Refund debits the ledger by 1000 (reducing the advance credit)
    // Debits: 1000, Credits: 3000 => Closing: -2000 (Credit remaining: 2000)
    expect(statement.debits).toBe(1000);
    expect(statement.credits).toBe(3000);
    expect(statement.closingBalance).toBe(-2000);
  });

  it('13. Idempotency keys prevent duplicate payments on retry', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-013',
      fullName: 'Customer Thirteen',
      openingBalance: 0,
      isActive: true,
    });

    const idempotencyKey = 'unique-key-xyz-987';
    const pay1 = storage.recordPayment({
      customerId: customer.id,
      amount: 1500,
      paymentMethod: 'ONLINE',
      idempotencyKey,
    });

    const pay2 = storage.recordPayment({
      customerId: customer.id,
      amount: 1500,
      paymentMethod: 'ONLINE',
      idempotencyKey,
    });

    expect(pay1.id).toBe(pay2.id);
    const payments = storage.getPayments().filter((p) => p.customerId === customer.id);
    expect(payments.length).toBe(1);
  });

  it('14. Historical price snapshot is maintained even after catalog price changes', () => {
    const customer = storage.saveCustomer({
      customerCode: 'TEST-014',
      fullName: 'Customer Fourteen',
      openingBalance: 0,
      isActive: true,
    });

    const product = storage.saveProduct({
      name: 'Special Luggage',
      defaultCarryCharge: 500,
      chargeMethod: 'PER_UNIT',
      currency: 'PKR',
      isActive: true,
    });

    const { invoice } = storage.confirmOrder({
      customerId: customer.id,
      items: [
        {
          id: 'item-1',
          productId: product.id,
          productNameSnapshot: product.name,
          quantity: 2,
          chargeMethod: product.chargeMethod,
          carryCharge: product.defaultCarryCharge, // 500
          lineTotal: 1000,
        },
      ],
    });

    // Update catalog product default carry charge from 500 to 900
    storage.saveProduct({
      id: product.id,
      name: product.name,
      defaultCarryCharge: 900,
      chargeMethod: product.chargeMethod,
      currency: product.currency,
      isActive: true,
    });

    // Check catalog is updated
    const updatedCatalogProduct = storage.getProduct(product.id);
    expect(updatedCatalogProduct?.defaultCarryCharge).toBe(900);

    // Verify historical invoice remains completely untouched at 500 / 1000
    const historicalInvoice = storage.getInvoice(invoice.id);
    expect(historicalInvoice?.grandTotal).toBe(1000);
    expect(historicalInvoice?.snapshotData.items[0].carryCharge).toBe(500);
    expect(historicalInvoice?.snapshotData.items[0].lineTotal).toBe(1000);
  });
});
