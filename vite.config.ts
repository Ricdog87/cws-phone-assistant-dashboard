/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { readLlmConfig } from './server/briefingHandler';
import { briefingProxyPlugin } from './server/briefingProxyPlugin';

export default defineConfig(({ mode }) => {
  // Alle Variablen laden, aber nur serverseitig verwenden. Der Browser sieht ausschließlich VITE_*.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), briefingProxyPlugin(readLlmConfig(env))],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['tests/setup.ts'],
    },
  };
});
