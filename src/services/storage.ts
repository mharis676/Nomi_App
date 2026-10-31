import { Capacitor } from '@capacitor/core';
import { commitLocal, readLocalState } from './localWorkspace';
import { StorageService } from './ledger';
import { isDemo, isLocal, supabase } from './backend';

const local = isDemo ? new StorageService() : new StorageService(StorageService.emptyState());
let revision = 0;
let epoch = 0;
const pending = new Map<string, string>();
export function clearRemoteData() { epoch++; local.replaceState(StorageService.emptyState()); revision = 0; pending.clear(); }
async function request(path: string, init: RequestInit = {}) {
  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw new Error('Please sign in to continue.');
  const response = await fetch('/api/' + path, { ...init, signal: AbortSignal.timeout(30_000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.');
  return body;
}
export async function refreshRemoteData() {
  if (isDemo) return;
  if (isLocal) { local.replaceState(readLocalState(window.localStorage)); return; }
  const current = epoch;
  const data = await request('state');
  if (current === epoch && data.revision >= revision) { local.replaceState(data.state); revision = data.revision; }
}
const mutations = ['saveCustomer', 'archiveCustomer', 'saveProduct', 'archiveProduct', 'confirmOrder', 'reviseInvoice', 'cancelInvoice', 'recordRefund', 'recordPayment', 'updateBusinessSettings'] as const;
type Mutation = typeof mutations[number];
type AsyncMutations = { [K in Mutation]: (...args: Parameters<StorageService[K]>) => Promise<ReturnType<StorageService[K]>> };
export const storage = new Proxy(local, {
  get(target, property) {
    if (mutations.includes(property as Mutation)) return async (...args: unknown[]) => {
      if (isDemo) return (target[property as Mutation] as (...args: unknown[]) => unknown).apply(target, args);
      if (isLocal) {
        const commit = () => {
          const saved = commitLocal(window.localStorage, ledger => (ledger[property as Mutation] as (...args: unknown[]) => unknown).apply(ledger, args));
          target.replaceState(saved.state);
          return saved.result;
        };
        if (navigator.locks) return navigator.locks.request('carry-local-workspace', commit);
        // Native Android runs one WebView; synchronous snapshot commits cannot overlap there.
        if (Capacitor.isNativePlatform()) return commit();
        throw new Error('Use a current browser over HTTPS or localhost to save records safely.');
      }
      const current = epoch;
      const signature = JSON.stringify([property, args]);
      const requestId = pending.get(signature) || crypto.randomUUID();
      pending.set(signature, requestId);
      try {
        const data = await request('mutate', { method: 'POST', body: JSON.stringify({ operation: property, args, revision, requestId }) });
        pending.delete(signature);
        if (current === epoch && data.revision >= revision) { local.replaceState(data.state); revision = data.revision; }
        return data.result;
      } catch (error) {
        // Refresh after an uncertain response; retry retains the same request ID.
        await refreshRemoteData().catch(() => undefined);
        throw error;
      }
    };
    if (property === 'init' && !isDemo) return () => { throw new Error('Reset is available only in demo mode.'); };
    const value = Reflect.get(target, property);
    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as unknown as Omit<StorageService, Mutation> & AsyncMutations;
