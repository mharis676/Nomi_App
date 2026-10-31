import Decimal from 'decimal.js';
import { ChargeMethod, OrderItem } from '../types';

// Configure Decimal for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Rounds a number to exactly two decimal places.
 */
export function roundToTwo(num: number | string | Decimal): number {
  return new Decimal(num).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Calculates line total for an item based on its charge method.
 * - PER_UNIT: Quantity * CarryChargePerUnit
 * - PER_ORDER: CarryChargeForOrder (independent of quantity)
 */
export function calculateLineTotal(
  quantity: number | string,
  carryCharge: number | string,
  chargeMethod: ChargeMethod
): number {
  const qty = new Decimal(quantity || 0);
  const rate = new Decimal(carryCharge || 0);

  if (qty.isNegative() || rate.isNegative()) {
    throw new Error('Quantity and carry charge cannot be negative.');
  }

  if (chargeMethod === 'PER_ORDER') {
    return roundToTwo(rate);
  }

  // PER_UNIT
  return roundToTwo(qty.times(rate));
}

export interface OrderCalculationResult {
  subtotal: number;
  discount: number;
  additionalCharges: number;
  grandTotal: number;
  items: OrderItem[];
}

/**
 * Calculates complete order totals with decimal safety.
 */
export function calculateOrderTotals(
  items: OrderItem[],
  discount: number | string = 0,
  additionalCharges: number | string = 0
): OrderCalculationResult {
  const calculatedItems = items.map((item) => {
    const lineTotal = calculateLineTotal(item.quantity, item.carryCharge, item.chargeMethod);
    return {
      ...item,
      lineTotal,
    };
  });

  const subtotal = calculatedItems.reduce((acc, item) => {
    return acc.plus(new Decimal(item.lineTotal));
  }, new Decimal(0));

  const disc = new Decimal(discount || 0);
  const extra = new Decimal(additionalCharges || 0);

  if (disc.isNegative()) {
    throw new Error('Discount cannot be negative.');
  }
  if (extra.isNegative()) {
    throw new Error('Additional charges cannot be negative.');
  }
  if (disc.greaterThan(subtotal.plus(extra))) {
    throw new Error('Discount cannot exceed the total order charges.');
  }

  const grandTotal = subtotal.minus(disc).plus(extra);

  return {
    subtotal: roundToTwo(subtotal),
    discount: roundToTwo(disc),
    additionalCharges: roundToTwo(extra),
    grandTotal: roundToTwo(grandTotal),
    items: calculatedItems,
  };
}

/**
 * Formats a monetary number for display (default PKR).
 */
export function formatCurrency(amount: number, currency: string = 'PKR'): string {
  const formatted = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${currency} ${formatted}`;
}

/**
 * Calculates customer running closing balance:
 * Closing Balance = Opening Balance + Debits - Credits
 * Positive = Customer owes business (Receivable)
 * Zero = Settled
 * Negative = Advance Credit (Liability to customer)
 */
export function calculateBalance(
  openingBalance: number,
  debits: number,
  credits: number
): number {
  const op = new Decimal(openingBalance || 0);
  const deb = new Decimal(debits || 0);
  const cred = new Decimal(credits || 0);
  return roundToTwo(op.plus(deb).minus(cred));
}
