import { spawnSync } from 'node:child_process';
const env = { ...process.env, VITE_DATA_MODE: 'local', VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };
for (const args of [
  ['node_modules/typescript/bin/tsc'],
  ['node_modules/vite/bin/vite.js', 'build'],
  ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android'],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
