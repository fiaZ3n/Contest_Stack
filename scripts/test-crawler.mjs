const baseUrl = (process.env.CONTEST_STACK_URL || 'http://localhost:5173').replace(/\/$/, '');

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

const { response: healthResponse, payload: health } = await getJson('/api/problem-statement/health');
if (!healthResponse.ok || health?.status !== 'ok') {
  console.error('Crawler health check failed:', health);
  process.exit(1);
}

console.log('Crawler health:', JSON.stringify(health.crawler, null, 2));
if (!health.crawler?.firecrawlConfigured) {
  console.warn('FIRECRAWL_API_KEY is not configured. Codeforces may still return 403 from local Playwright/basic HTTP.');
}

const testCases = [
  { platform: 'Codeforces', id: '2275B' },
  { platform: 'AtCoder', id: 'ABC361-C' }
];
let failed = false;
for (const testCase of testCases) {
  const query = new URLSearchParams(testCase);
  console.log(`\nTesting ${testCase.platform} ${testCase.id}...`);
  try {
    const { response, payload } = await getJson(`/api/problem-statement?${query}`);
    if (!response.ok || !payload?.success || Number(payload.textLength) < 40) {
      failed = true;
      console.error(`FAILED (${response.status}):`, payload?.error || 'No statement content returned.');
      continue;
    }
    console.log(`OK: ${payload.title} · ${payload.textLength} chars · source=${payload.source} · cached=${Boolean(payload.cached)}`);
  } catch (error) {
    failed = true;
    console.error('FAILED:', error.message);
  }
}

if (failed) process.exit(1);
console.log('\nAll crawler smoke tests passed.');
