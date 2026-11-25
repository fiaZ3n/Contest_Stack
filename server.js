import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contestStackApi } from './server/contestStackApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 10000);
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY || '';

// Health check used by Render. Keep this fast and independent of third-party APIs.
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'contest-stack',
    crawler: { firecrawlConfigured: Boolean(firecrawlApiKey) }
  });
});

// Reuse exactly the same validated API routes used by the Vite development server.
// The routes include Codeforces metadata, AtCoder datasets, and statement crawling.
const apiPlugin = contestStackApi({ firecrawlApiKey });
apiPlugin.configureServer({ middlewares: app });

const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir, {
  index: false,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  setHeaders(res, filePath) {
    if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// React Router / client-side navigation fallback.
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Contest Stack is listening on 0.0.0.0:${port}`);
  console.log(`Firecrawl: ${firecrawlApiKey ? 'configured' : 'not configured (crawler fallbacks only)'}`);
});
