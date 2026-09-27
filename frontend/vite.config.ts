import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');

  return {
    plugins: [react()],
    envDir: '..',
    define:
      mode === 'test' ? { 'import.meta.env.VITE_DEMO_MODE': JSON.stringify('true') } : undefined,
    server: {
      port: Number(env.FRONTEND_PORT || 5173),
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 15_000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'html'],
        reportsDirectory: 'coverage',
        include: [
          'src/App.tsx',
          'src/api/**/*.ts',
          'src/components/**/*.tsx',
          'src/data/**/*.ts',
          'src/views/**/*.tsx',
        ],
        exclude: ['src/**/*.test.{ts,tsx}'],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
      },
    },
  };
});
