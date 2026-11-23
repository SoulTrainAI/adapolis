import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  esbuild: { jsx: 'automatic' },
  // Pure modules still import the Supabase client at load; it never connects in tests.
  test: { include: ['src/**/*.test.ts'], env: { NEXT_PUBLIC_SUPABASE_URL: 'http://localhost', SUPABASE_SERVICE_ROLE_KEY: 'test' } },
});
