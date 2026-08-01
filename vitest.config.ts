import { defineConfig, loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      env: {
        NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ?? env.API_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY:
          env.SUPABASE_SERVICE_ROLE_KEY ?? env.SERVICE_ROLE_KEY,
      },
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
