import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// "REPO_NAME" is injected by Actions. Local development and previews use "/".
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const owner = process.env.GITHUB_REPOSITORY?.split('/')[0];
const isUserSite = repo === `${owner}.github.io`;
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || (repo && !isUserSite ? `/${repo}/` : '/'),
  build: { target: 'es2022', chunkSizeWarningLimit: 1600 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] }
});
