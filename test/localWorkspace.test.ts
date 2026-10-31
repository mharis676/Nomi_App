import { describe, it, expect } from 'vitest';
import { commitLocal, readLocalState, LOCAL_WORKSPACE_KEY } from '../src/services/localWorkspace';

describe('local workspace persistence', () => {
  it('starts empty and preserves old browser records when upgrading', () => {
    expect(readLocalState({ getItem: () => null }).saudi_carry_customers).toEqual([]);
    const old = new Map([['saudi_carry_initialized_v1','true'],['saudi_carry_customers', '[{"id":"existing"}]']]);
    expect(readLocalState({ getItem: key => old.get(key) ?? null }).saudi_carry_customers).toEqual([{ id: 'existing' }]);
  });
  it('commits all records together and leaves the prior state intact when storage is full', () => {
    const data = new Map<string,string>();
    const store = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key,value); } };
    commitLocal(store, ledger => ledger.saveCustomer({ fullName:'Local customer',customerCode:'LOCAL',openingBalance:0,isActive:true }));
    const before = data.get(LOCAL_WORKSPACE_KEY);
    const full = { ...store, setItem: () => { throw new Error('Storage is full'); } };
    expect(() => commitLocal(full, ledger => ledger.recordPayment({ customerId: ledger.getCustomers()[0].id, amount: 10, paymentMethod: 'CASH' }))).toThrow(/full/);
    expect(data.get(LOCAL_WORKSPACE_KEY)).toBe(before);
    expect(readLocalState(store).saudi_carry_payments).toEqual([]);
  });
});
