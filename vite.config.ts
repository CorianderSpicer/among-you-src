import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { target: 'es2020', chunkSizeWarningLimit: 5000, assetsInlineLimit: 100000000, cssCodeSplit: false },
  server: { host: '127.0.0.1', port: 5173 },
});
