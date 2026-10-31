# QA PLAN & TEST STRATEGY

## Saudi Carry Charges & Customer Account Management System

### 1. Quality Objectives
- **Zero Financial Discrepancies**: 100% precision in financial calculations using decimal arithmetic.
- **Ledger Invariant Guarantee**: $\text{Closing Balance} = \text{Opening Balance} + \text{Debits} - \text{Credits}$ must hold for every statement and customer ledger at all times.
- **Snapshot Integrity**: Once an invoice is confirmed, modifying the product catalog must NEVER mutate historical invoices.
- **Immutable Revision History**: Invoice edits must record prior snapshot, new snapshot, difference, and post an adjustment to the customer ledger without modifying historical payments.
- **Complete Test Coverage**: Unit tests for finance, integration tests for ledger and orders, E2E browser automation for user flows.

---

### 2. Test Suites

#### 2.1 Financial Calculation Unit Tests (`test/finance.test.ts`)
- [ ] Test 1: Per-unit carry charge ($5 \times 250.00 = 1,250.00$).
- [ ] Test 2: Per-order carry charge ($1 \times 1,500.00 = 1,500.00$, unaffected by quantity).
- [ ] Test 3: Multi-product composite invoice calculation.
- [ ] Test 4: Quantity adjustments and recalculations.
- [ ] Test 5: Order-level carry price override (override from 300 to 280, verify catalog remains 300).
- [ ] Test 6: Discount calculation and rounding limits (discount cannot exceed subtotal).
- [ ] Test 7: Invalid edge cases: zero quantity, negative quantity, negative carry charges.
- [ ] Test 8: Fixed-precision decimal rounding behavior.

#### 2.2 Customer Ledger Reconciliation Tests (`test/ledger.test.ts`)
- [ ] Test 1: New confirmed invoice generates exactly one debit entry.
- [ ] Test 2: Full payment generates exactly one credit entry, reducing balance to 0.00.
- [ ] Test 3: Partial payment reduces balance accurately.
- [ ] Test 4: Multiple payments accumulate and balance correctly.
- [ ] Test 5: Advance payment (amount > balance) produces negative balance (advance credit).
- [ ] Test 6: Opening balance migration carries forward correctly.
- [ ] Test 7: Invoice revision (increase) posts debit adjustment for the difference.
- [ ] Test 8: Invoice revision (decrease) posts credit adjustment for the difference.
- [ ] Test 9: Invoice revision preserves historical payment records intact.
- [ ] Test 10: Cancellation posts a full reversal adjustment.
- [ ] Test 11: Duplicate payment prevention (idempotency key verification).
- [ ] Test 12: Ledger formula verification: Opening + Sum(Debits) - Sum(Credits) = Closing.

#### 2.3 End-to-End Scenarios (Playwright / Integration)
- **Scenario A: First Customer Order Flow**: Create customer -> Create catalog items -> Build multi-item order -> Confirm invoice -> Inspect debit posting -> Export PDF.
- **Scenario B: Returning Customer & Price Override**: Select customer -> Add item -> Override carry price -> Verify invoice -> Confirm catalog default is unchanged.
- **Scenario C: Partial & Advance Payments**: Record partial payment -> Verify invoice balance -> Post extra payment -> Verify customer credit in statement.
- **Scenario D: Invoice Revision Lifecycle**: Edit confirmed invoice -> Record change justification -> Verify revision log -> Verify ledger differential.
- **Scenario E: Account Statement**: Select customer -> Filter date range -> Check statement summary -> Download Statement PDF.
- **Scenario F: State Persistence & Reload**: Verify all records survive page refresh and re-authentication.
- **Scenario G: Access Control & Authorization**: Verify unauthenticated/unauthorized data access is blocked.

---

### 3. Execution Commands
```bash
# Unit & integration tests
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint

# Production build check
npm run build
```
