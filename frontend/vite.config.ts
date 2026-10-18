import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');

  return {
    plugins: [react()],
    envDir: '..',
    server: {
      port: Number(env.FRONTEND_PORT || 5173),
      proxy: {
        '/api': `http://127.0.0.1:${env.BACKEND_PORT || 3000}`,
      },
    },
  };
});
