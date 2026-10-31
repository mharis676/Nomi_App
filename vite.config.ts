import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: (!env.VITE_DATA_MODE || env.VITE_DATA_MODE === 'local') ? './' : '/',
    plugins: [react(), { name: 'deployment-config', generateBundle() { this.emitFile({ type: 'asset', fileName: 'build-config.json', source: JSON.stringify({ dataMode: env.VITE_DATA_MODE || 'local', supabaseUrl: env.VITE_SUPABASE_URL || '' }) }); } }],
    build: { rollupOptions: { output: { manualChunks(id) { if (env.VITE_SUPABASE_URL && env.VITE_DATA_MODE !== 'demo' && id.includes('@supabase/')) return 'supabase'; } } } },
    server: { port: 5173, host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:3000' } },
  };
});
