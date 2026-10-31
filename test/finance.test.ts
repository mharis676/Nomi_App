import { describe, it, expect } from 'vitest';
import {
  calculateLineTotal,
  calculateOrderTotals,
  calculateBalance,
  roundToTwo,
  getChargeMethodLabel,
  getChargeUnitSuffix,
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

  it('3. Calculates PER_KG carry charges accurately for whole and decimal weights', () => {
    // Whole weight: 2 KG at 800 PKR/KG = 1,600.00
    expect(calculateLineTotal(2, 800, 'PER_KG')).toBe(1600);

    // Decimal weight: 0.5 KG at 800 PKR/KG = 400.00
    expect(calculateLineTotal(0.5, 800, 'PER_KG')).toBe(400);

    // Decimal weight: 1.25 KG at 650 PKR/KG = 812.50
    expect(calculateLineTotal(1.25, 650, 'PER_KG')).toBe(812.5);

    // Decimal weight: 2.75 KG at 1200 PKR/KG = 3,300.00
    expect(calculateLineTotal(2.75, 1200, 'PER_KG')).toBe(3300);
  });

  it('4. Prevents floating point inaccuracy (e.g. 0.1 + 0.2 precision)', () => {
    const total = calculateLineTotal(3, 0.1, 'PER_UNIT');
    expect(total).toBe(0.3);

    const rounded = roundToTwo(10.005);
    expect(rounded).toBe(10.01);
  });

  it('5. Calculates multi-item order totals with PER_UNIT, PER_KG, and PER_ORDER mixed', () => {
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
      {
        id: '3',
        productId: 'p3',
        productNameSnapshot: 'Madinah Pistachios (Weight Cargo)',
        quantity: 2.5,
        weightKg: 2.5,
        chargeMethod: 'PER_KG',
        carryCharge: 800, // 2.5 * 800 = 2000
        lineTotal: 0,
      },
    ];

    const result = calculateOrderTotals(items, 300, 100);
    // Subtotal: 2600 + 2000 + 2000 = 6600
    // Discount: 300
    // Additional charges: 100
    // Grand total: 6600 - 300 + 100 = 6400
    expect(result.subtotal).toBe(6600);
    expect(result.discount).toBe(300);
    expect(result.additionalCharges).toBe(100);
    expect(result.grandTotal).toBe(6400);
    expect(result.items[2].lineTotal).toBe(2000);
  });

  it('6. Rejects negative quantities, weights, or carry rates', () => {
    expect(() => calculateLineTotal(-1, 500, 'PER_UNIT')).toThrow();
    expect(() => calculateLineTotal(5, -100, 'PER_UNIT')).toThrow();
    expect(() => calculateLineTotal(-0.5, 800, 'PER_KG')).toThrow();
  });

  it('7. Rejects discount exceeding total carry charges', () => {
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

  it('8. Helper functions return correct labels and suffixes for all 3 charge methods', () => {
    expect(getChargeMethodLabel('PER_UNIT')).toBe('Per Unit');
    expect(getChargeMethodLabel('PER_KG')).toBe('Per KG');
    expect(getChargeMethodLabel('PER_ORDER')).toBe('Per Order');

    expect(getChargeUnitSuffix('PER_UNIT')).toBe('/ unit');
    expect(getChargeUnitSuffix('PER_KG')).toBe('/ kg');
    expect(getChargeUnitSuffix('PER_ORDER')).toBe('flat');
  });

  it('9. Calculates running ledger balance strictly according to formula', () => {
    // Closing = Opening + Debits - Credits
    // Opening: 1000, Debits (Invoices): 2500, Credits (Payments): 2000 => Closing: 1500
    const balance1 = calculateBalance(1000, 2500, 2000);
    expect(balance1).toBe(1500);

    // Advance payment: Opening: 0, Debits: 1000, Credits: 1500 => Closing: -500 (Customer Credit)
    const balance2 = calculateBalance(0, 1000, 1500);
    expect(balance2).toBe(-500);
  });
});
