import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['playwright-tests/**'],
    environment: 'happy-dom',
  },
});