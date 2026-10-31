import { z } from 'zod';
const money = z.number().finite().min(0).max(999999999999.99).multipleOf(0.01);
const text = z.string().trim().max(2000);
const id = z.string().min(1).max(150);
const method = z.enum(['CASH', 'BANK_TRANSFER', 'ONLINE', 'OTHER']);
const charge = z.enum(['PER_UNIT', 'PER_KG', 'PER_ORDER']);
const item = z.object({ id, productId: id, productNameSnapshot: text.min(1), quantity: z.number().finite().positive().max(999999), weightKg: z.number().finite().positive().max(999999).optional(), chargeMethod: charge, carryCharge: money, lineTotal: money });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const parsed = new Date(value); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; }, 'Invalid date');
const schemas = {
  saveCustomer: z.tuple([z.object({ id: id.optional(), customerCode: text.max(100), fullName: text.min(1), phone: text.optional(), address: text.optional(), notes: text.optional(), openingBalance: z.number().finite().min(-999999999999).max(999999999999), isActive: z.boolean() })]),
  archiveCustomer: z.tuple([id]),
  saveProduct: z.tuple([z.object({ id: id.optional(), name: text.min(1), sku: text.max(100).optional(), category: text.optional(), defaultCarryCharge: money, chargeMethod: charge, currency: z.literal('PKR'), notes: text.optional(), isActive: z.boolean() })]),
  archiveProduct: z.tuple([id]),
  confirmOrder: z.tuple([z.object({ customerId: id, items: z.array(item).min(1).max(200), discount: money.optional(), additionalCharges: money.optional(), notes: text.optional() })]),
  reviseInvoice: z.tuple([id, z.array(item).min(1).max(200), money, money, text.min(1)]),
  cancelInvoice: z.tuple([id, text.min(1)]),
  recordRefund: z.tuple([z.object({ customerId: id, amount: money.positive(), paymentMethod: method, reason: text.min(1) })]),
  recordPayment: z.tuple([z.object({ customerId: id, invoiceId: id.optional(), amount: money.positive(), paymentMethod: method, paymentDate: date.optional(), referenceNumber: text.optional(), notes: text.optional(), idempotencyKey: id.optional() })]),
  updateBusinessSettings: z.tuple([z.object({ businessName: text.min(1), phone: text, email: z.union([z.email(), z.literal('')]), address: text, currency: z.literal('PKR'), invoiceFooterNote: text })]),
};
export type Operation = keyof typeof schemas;
export const envelope = z.object({ operation: z.enum(Object.keys(schemas) as [Operation, ...Operation[]]), args: z.array(z.unknown()), requestId: z.uuid(), revision: z.number().int().nonnegative() });
export function validateArgs(operation: Operation, args: unknown[]) { return schemas[operation].parse(args); }
