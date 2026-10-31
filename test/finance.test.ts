import { describe, it, expect } from 'vitest';
import {
  calculateLineTotal,
  calculateOrderTotals,
  calculateBalance,
  roundToTwo,
} from '../src/utils/finance';
import { OrderItem } from '../src/types';

describe('Financial Calculation Engine', () => {
  it('1. Calculates PER_UNIT carry charges accurately (quantity * rate)', () => {
    // 5 units at PKR 250.00 each = 1,250.00
    const total = calculateLineTotal(5, 250, 'PER_UNIT');
    expect(total).toBe(1250);
  });

  it('2. Calculates PER_ORDER carry charges accurately (flat rate independent of quantity)', () => {
    // 10 units of an abaya box at PKR 2500 per order = 2,500.00
    const total = calculateLineTotal(10, 2500, 'PER_ORDER');
    expect(total).toBe(2500);
  });

  it('3. Prevents floating point inaccuracy (e.g. 0.1 + 0.2 precision)', () => {
    const total = calculateLineTotal(3, 0.1, 'PER_UNIT');
    expect(total).toBe(0.3);

    const rounded = roundToTwo(10.005);
    expect(rounded).toBe(10.01);
  });

  it('4. Calculates multi-item order totals and discounts correctly', () => {
    const items: OrderItem[] = [
      {
        id: '1',
        productId: 'p1',
        productNameSnapshot: 'Ajwa Dates',
        quantity: 4,
        chargeMethod: 'PER_UNIT',
        carryCharge: 650, // 4 * 650 = 2600
        lineTotal: 0,
      },
      {
        id: '2',
        productId: 'p2',
        productNameSnapshot: 'Saudi Abaya Consignment',
        quantity: 2,
        chargeMethod: 'PER_ORDER',
        carryCharge: 2000, // flat 2000
        lineTotal: 0,
      },
    ];

    const result = calculateOrderTotals(items, 150, 50);
    // Subtotal: 2600 + 2000 = 4600
    // Discount: 150
    // Additional charges: 50
    // Grand total: 4600 - 150 + 50 = 4500
    expect(result.subtotal).toBe(4600);
    expect(result.discount).toBe(150);
    expect(result.additionalCharges).toBe(50);
    expect(result.grandTotal).toBe(4500);
  });

  it('5. Rejects negative quantities or carry rates', () => {
    expect(() => calculateLineTotal(-1, 500, 'PER_UNIT')).toThrow();
    expect(() => calculateLineTotal(5, -100, 'PER_UNIT')).toThrow();
  });

  it('6. Rejects discount exceeding total carry charges', () => {
    const items: OrderItem[] = [
      {
        id: '1',
        productId: 'p1',
        productNameSnapshot: 'Item',
        quantity: 1,
        chargeMethod: 'PER_UNIT',
        carryCharge: 100,
        lineTotal: 100,
      },
    ];

    expect(() => calculateOrderTotals(items, 150)).toThrow(/Discount cannot exceed/);
  });

  it('7. Calculates running ledger balance strictly according to formula', () => {
    // Closing = Opening + Debits - Credits
    // Opening: 1000, Debits (Invoices): 2500, Credits (Payments): 2000 => Closing: 1500
    const balance1 = calculateBalance(1000, 2500, 2000);
    expect(balance1).toBe(1500);

    // Advance payment: Opening: 0, Debits: 1000, Credits: 1500 => Closing: -500 (Customer Credit)
    const balance2 = calculateBalance(0, 1000, 1500);
    expect(balance2).toBe(-500);
  });
});
