/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const dir = import.meta.dirname;

export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
  build: {
    target: 'es2022',
    rollupOptions: { input: { main: resolve(dir, 'index.html'), ui: resolve(dir, 'ui/index.html') } },
  },
});
