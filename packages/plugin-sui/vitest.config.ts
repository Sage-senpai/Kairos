import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Resolve @kairos-sui/core to source so tests run without a prior build.
export default defineConfig({
  resolve: {
    alias: {
      '@kairos-sui/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
});
