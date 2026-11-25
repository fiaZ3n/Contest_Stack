import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const metadataCache = new Map();
const METADATA_TTL = 30 * 60 * 1000;

async function fetchAndCacheMetadata(cacheKey, candidateUrls, { codeforcesApi = false } = {}) {
  const cached = metadataCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.body;

  const failures = [];
  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'ContestStack/1.0 (problem catalogue)' },
        signal: AbortSignal.timeout(25000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      // Codeforces wraps API results in { status: "OK", result: ... }.
      // AtCoder Problems resources are plain JSON arrays/maps, so do not apply
      // the Codeforces envelope check to those datasets.
      if (codeforcesApi && body?.status !== 'OK') {
        throw new Error(body?.comment || 'Codeforces API returned an invalid response.');
      }
      metadataCache.set(cacheKey, { body, expiresAt: Date.now() + METADATA_TTL });
      return body;
    } catch (error) {
      failures.push(`${new URL(url).hostname}: ${error.message || 'request failed'}`);
    }
  }
  throw new Error(`Could not load public problem metadata: ${failures.join(' • ')}`);
}

function sendJson(res, statusCode, payload, cacheControl = 'no-store') {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.end(JSON.stringify(payload));
}

function contestStackMetadataApi() {
  const installMiddleware = (server) => {
    server.middlewares.use('/api/codeforces', async (req, res, next) => {
      if (req.method !== 'GET') return next();
      try {
        const requestUrl = new URL(req.url || '/', 'http://localhost');
        const method = requestUrl.pathname.replace(/^\//, '');
        const allowedMethods = new Set(['problemset.problems', 'contest.list']);
        if (!allowedMethods.has(method)) return sendJson(res, 404, { error: 'Unsupported Codeforces API method.' });

        const query = new URLSearchParams(requestUrl.searchParams);
        if (method === 'contest.list' && !query.has('gym')) query.set('gym', 'false');
        const suffix = query.toString();
        const urls = [
          `https://mirror.codeforces.com/api/${method}${suffix ? `?${suffix}` : ''}`,
          `https://codeforces.com/api/${method}${suffix ? `?${suffix}` : ''}`
        ];
        const body = await fetchAndCacheMetadata(`cf:${method}:${suffix}`, urls, { codeforcesApi: true });
        sendJson(res, 200, body, 'public, max-age=1800, stale-while-revalidate=3600');
      } catch (error) {
        sendJson(res, 502, { error: error.message || 'Codeforces metadata request failed.' });
      }
    });

    server.middlewares.use('/api/atcoder', async (req, res, next) => {
      if (req.method !== 'GET') return next();
      try {
        const requestUrl = new URL(req.url || '/', 'http://localhost');
        const match = requestUrl.pathname.match(/^\/resources\/(problems|contests|problem-models|merged-problems|contest-problem)\.json$/);
        if (!match) return sendJson(res, 404, { error: 'Unsupported AtCoder Problems dataset.' });
        const filename = `${match[1]}.json`;
        const url = `https://kenkoooo.com/atcoder/resources/${filename}`;
        const body = await fetchAndCacheMetadata(`atcoder:${filename}`, [url]);
        sendJson(res, 200, body, 'public, max-age=1800, stale-while-revalidate=3600');
      } catch (error) {
        sendJson(res, 502, { error: error.message || 'AtCoder metadata request failed.' });
      }
    });
  };

  return {
    name: 'contest-stack-metadata-api',
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware
  };
}

export default defineConfig({
  plugins: [react(), contestStackMetadataApi()],
  preview: {
    allowedHosts: ['contest-stack.onrender.com']
  }
});
