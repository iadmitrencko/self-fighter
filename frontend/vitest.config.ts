import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text'],
      thresholds: {
        // The rules that decide who wins must be fully covered (§17.3 of the specification).
        'src/domain/**': { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
    },
  },
});
