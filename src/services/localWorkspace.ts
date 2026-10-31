import { StorageService } from './ledger';
export const LOCAL_WORKSPACE_KEY = 'carry-workspace-v1';
type BrowserStore = Pick<Storage, 'getItem' | 'setItem'>;
export function readLocalState(store: Pick<Storage, 'getItem'>): Record<string, unknown> {
  const saved = store.getItem(LOCAL_WORKSPACE_KEY);
  const empty = StorageService.emptyState();
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.version !== 1 || !parsed.state || typeof parsed.state !== 'object') throw new Error('Local workspace could not be read. Keep the stored data and restore a backup.');
    for (const [key, defaultValue] of Object.entries(empty)) {
      if (Array.isArray(defaultValue) && !Array.isArray(parsed.state[key])) throw new Error('Local workspace records are damaged. Restore a backup before continuing.');
    }
    if (!parsed.state.saudi_carry_settings || typeof parsed.state.saudi_carry_settings !== 'object') throw new Error('Local workspace settings are damaged.');
    return parsed.state;
  }
  // Preserve existing browser records from earlier versions. Fresh installs start empty.
  if (store.getItem('saudi_carry_initialized_v1')) {
    return Object.fromEntries(Object.entries(empty).map(([key, fallback]) => {
      const value = store.getItem(key);
      return [key, value ? JSON.parse(value) : fallback];
    }));
  }
  return empty;
}
export function commitLocal<T>(store: BrowserStore, operation: (ledger: StorageService) => T) {
  const ledger = new StorageService(readLocalState(store), 'local-owner');
  const result = operation(ledger);
  const state = ledger.exportState();
  // One write commits the invoice, payment, ledger and audit together.
  // Quota failures leave the prior persisted workspace intact.
  store.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify({ version: 1, state }));
  return { result, state };
}
