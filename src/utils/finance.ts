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
 * - PER_KG: Weight (KG) * CarryChargePerKg
 * - PER_ORDER: CarryChargeForOrder (independent of quantity/weight)
 */
export function calculateLineTotal(
  quantityOrWeight: number | string,
  carryCharge: number | string,
  chargeMethod: ChargeMethod
): number {
  const val = new Decimal(quantityOrWeight === "" ? 0 : quantityOrWeight);
  const rate = new Decimal(carryCharge === "" ? 0 : carryCharge);

  if (!val.isFinite() || !rate.isFinite()) throw new Error('Quantity and carry charge must be finite numbers.');
  if (!['PER_UNIT', 'PER_KG', 'PER_ORDER'].includes(chargeMethod)) throw new Error('Invalid charge method.');
  if (val.isNegative() || rate.isNegative()) {
    throw new Error('Quantity/Weight and carry charge cannot be negative.');
  }

  if (chargeMethod === 'PER_ORDER') {
    return roundToTwo(rate);
  }

  // PER_UNIT or PER_KG
  return roundToTwo(val.times(rate));
}

/**
 * Returns human-readable label for the charging method.
 */
export function getChargeMethodLabel(method: ChargeMethod): string {
  switch (method) {
    case 'PER_KG':
      return 'Per KG';
    case 'PER_ORDER':
      return 'Per Order';
    case 'PER_UNIT':
    default:
      return 'Per Unit';
  }
}

/**
 * Returns unit suffix for rates (e.g., "/ kg", "/ unit").
 */
export function getChargeUnitSuffix(method: ChargeMethod): string {
  switch (method) {
    case 'PER_KG':
      return '/ kg';
    case 'PER_ORDER':
      return 'flat';
    case 'PER_UNIT':
    default:
      return '/ unit';
  }
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
    const measure = item.chargeMethod === 'PER_KG' ? (item.weightKg ?? item.quantity) : item.quantity;
    const lineTotal = calculateLineTotal(measure, item.carryCharge, item.chargeMethod);
    return {
      ...item,
      quantity: measure,
      weightKg: item.chargeMethod === 'PER_KG' ? measure : item.weightKg,
      lineTotal,
    };
  });

  const subtotal = calculatedItems.reduce((acc, item) => {
    return acc.plus(new Decimal(item.lineTotal));
  }, new Decimal(0));

  const disc = new Decimal(discount === "" ? 0 : discount);
  const extra = new Decimal(additionalCharges === "" ? 0 : additionalCharges);

  if (!disc.isFinite() || !extra.isFinite()) throw new Error('Order adjustments must be finite numbers.');
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
  if (grandTotal.greaterThan('999999999999.99') || subtotal.greaterThan('999999999999.99')) throw new Error('Order exceeds the supported monetary limit.');

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

