import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        'src/modules/attendance/services/**': {
          statements: 95,
          lines: 95,
        },
        'src/modules/attendance/utils/**': {
          statements: 90,
          lines: 90,
        },
        'src/modules/attendance/controllers/**': {
          statements: 85,
          lines: 85,
        },
        'src/modules/attendance/routes/**': {
          statements: 100,
          lines: 100,
        },
        'src/modules/attendance/validators/**': {
          statements: 95,
          lines: 95,
        },
      },
      exclude: [
        'node_modules/',
        'tests/',
        'src/server.js',
        'docs/',
        'coverage/',
        'vitest.config.js'
      ],
    },
    alias: {
      '#@': path.resolve(__dirname, './src'),
      '#': path.resolve(__dirname, './src'),
    },
    fileParallelism: false, // Run test files sequentially for clean database isolation
  },
});
