import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api/* is forwarded to the backend (backend/ runs on port 8000).
// In production set VITE_API_URL to the deployed backend URL instead.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:8000', changeOrigin: true },
    },
  },
});
