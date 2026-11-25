import { loadEnv, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { contestStackApi } from './server/contestStackApi.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const firecrawlApiKey = env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_API_KEY || '';
  return { plugins: [react(), contestStackApi({ firecrawlApiKey })] };
});
