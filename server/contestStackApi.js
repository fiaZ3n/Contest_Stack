import { load } from 'cheerio';
import sanitizeHtml from 'sanitize-html';

const metadataCache = new Map();
const statementCache = new Map();
const statementInflight = new Map();
const METADATA_TTL = 30 * 60 * 1000;
const STATEMENT_TTL = 6 * 60 * 60 * 1000;
const FIRECRAWL_TIMEOUT_MS = 32_000;
const BROWSER_NAVIGATION_TIMEOUT_MS = 10_000;
const BASIC_FETCH_TIMEOUT_MS = 6_000;

async function fetchAndCacheMetadata(cacheKey, candidateUrls, { codeforcesApi = false } = {}) {
  const cached = metadataCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.body;

  const failures = [];
  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'ContestStack/1.0 (problem catalogue)' },
        signal: AbortSignal.timeout(25_000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
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

function resolveProblemTarget(platform, id) {
  const cleanId = String(id || '').trim();
  if (!cleanId || cleanId.length > 80) throw new Error('A valid problem ID is required.');

  if (platform === 'Codeforces') {
    const match = cleanId.match(/^(\d+)[-_]?([A-Za-z]\d*)$/);
    if (!match) throw new Error('Codeforces IDs should look like 2275B or 1900A.');
    const [, contestId, index] = match;
    const normalizedIndex = index.toUpperCase();
    return {
      platform,
      id: `${contestId}${normalizedIndex}`,
      title: `${contestId}${normalizedIndex}`,
      url: `https://codeforces.com/contest/${contestId}/problem/${encodeURIComponent(normalizedIndex)}`,
      mirrorUrl: `https://mirror.codeforces.com/contest/${contestId}/problem/${encodeURIComponent(normalizedIndex)}`,
      candidateUrls: [
        `https://codeforces.com/contest/${contestId}/problem/${encodeURIComponent(normalizedIndex)}`,
        `https://mirror.codeforces.com/contest/${contestId}/problem/${encodeURIComponent(normalizedIndex)}`
      ]
    };
  }

  if (platform === 'AtCoder') {
    const match = cleanId.match(/^(abc|arc|agc|ahc)(\d+)[-_]([a-z0-9]+)$/i);
    if (!match) throw new Error('AtCoder IDs should look like ABC361-C or abc361_c.');
    const contestId = `${match[1]}${match[2]}`.toLowerCase();
    const index = match[3].toLowerCase();
    const taskId = `${contestId}_${index}`;
    return {
      platform,
      id: `${contestId.toUpperCase()}-${index.toUpperCase()}`,
      title: taskId,
      url: `https://atcoder.jp/contests/${contestId}/tasks/${taskId}?lang=en`,
      candidateUrls: [`https://atcoder.jp/contests/${contestId}/tasks/${taskId}?lang=en`]
    };
  }

  throw new Error('Only Codeforces and AtCoder statements are supported.');
}

function absoluteAssetUrl(value, baseUrl) {
  if (!value) return '';
  try {
    const url = new URL(value, baseUrl);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

const statementSanitizerOptions = {
  allowedTags: [
    'a', 'b', 'blockquote', 'br', 'caption', 'code', 'dd', 'del', 'div', 'dl', 'dt',
    'em', 'h1', 'h2', 'h3', 'h4', 'hr', 'i', 'img', 'kbd', 'li', 'ol', 'p', 'pre',
    's', 'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'th', 'thead',
    'tr', 'ul', 'var', 'math', 'mi', 'mn', 'mo', 'mrow', 'msup', 'msub', 'mfrac',
    'msqrt', 'mroot', 'semantics', 'annotation'
  ],
  allowedAttributes: {
    '*': ['class', 'title', 'aria-label'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan', 'scope']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  disallowedTagsMode: 'discard',
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
  }
};

function extractStatement(html, target) {
  if (!html || typeof html !== 'string') throw new Error('The crawler returned an empty page.');
  const $ = load(html);
  $('script, style, iframe, object, embed, form, button, noscript, nav, footer').remove();

  let statement;
  let title = target.title;
  if (target.platform === 'Codeforces') {
    statement = $('.problem-statement').first();
    if (statement.length) {
      const heading = statement.find('.header .title').first().text().trim();
      if (heading) title = heading;
    }
  } else {
    statement = $('#task-statement .lang-en').first();
    if (!statement.length) statement = $('#task-statement').first();
    const heading = statement.find('h3').first().text().trim();
    if (heading) title = heading;
  }

  if (!statement || !statement.length) {
    const pageTitle = $('title').text().trim();
    if (/403|forbidden|cloudflare|just a moment|attention required/i.test(pageTitle)) {
      throw new Error(`The judge returned an anti-bot or access-denied page (${pageTitle || 'blocked page'}). Configure Firecrawl Cloud or open the official page directly.`);
    }
    throw new Error('The crawler reached the page, but could not find its problem-statement container. The judge may have changed its HTML.');
  }

  statement.find('a[href]').each((_, element) => {
    const resolved = absoluteAssetUrl($(element).attr('href'), target.url);
    if (resolved) $(element).attr('href', resolved);
    else $(element).removeAttr('href');
  });
  statement.find('img[src]').each((_, element) => {
    const resolved = absoluteAssetUrl($(element).attr('src'), target.url);
    if (resolved) $(element).attr('src', resolved);
    else $(element).remove();
  });

  const rawFragment = $.html(statement);
  const cleanHtml = sanitizeHtml(rawFragment, statementSanitizerOptions);
  const textLength = load(cleanHtml).text().replace(/\s+/g, ' ').trim().length;
  if (textLength < 40) throw new Error('The page did not contain enough statement text to display.');
  return { title, html: cleanHtml, textLength };
}

async function scrapeWithFirecrawl(target, apiKey) {
  const failures = [];
  const candidateUrls = target.candidateUrls || [target.url];

  for (const candidateUrl of candidateUrls) {
    try {
      const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          url: candidateUrl,
          // rawHtml preserves the judge's known statement containers and classes for parsing.
          formats: ['rawHtml'],
          onlyMainContent: false,
          waitFor: 1200,
          timeout: 25_000,
          proxy: 'auto',
          maxAge: 172_800_000,
          storeInCache: true
        }),
        signal: AbortSignal.timeout(FIRECRAWL_TIMEOUT_MS)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        const message = payload?.error || payload?.message || `Firecrawl returned HTTP ${response.status}.`;
        throw new Error(message);
      }
      const html = payload?.data?.rawHtml || payload?.data?.html || payload?.rawHtml || payload?.html || '';
      if (!html) throw new Error('Firecrawl returned no raw HTML. Check the API response and account credits.');
      const parsed = extractStatement(html, { ...target, url: candidateUrl });
      return { ...parsed, source: 'Firecrawl Cloud (auto proxy)', sourceUrl: candidateUrl };
    } catch (error) {
      failures.push(`${new URL(candidateUrl).hostname}: ${error.message || 'scrape failed'}`);
    }
  }
  throw new Error(`Firecrawl could not retrieve a valid statement: ${failures.join(' • ')}`);
}

async function scrapeWithLocalBrowser(target) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    throw new Error('Local browser crawler is not installed. Run npm install, then npm run setup:crawler.');
  }

  const { chromium } = playwright;
  let browser;
  try {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true, timeout: 10_000 });
    } catch {
      browser = await chromium.launch({ headless: true, timeout: 10_000 });
    }
  } catch (error) {
    throw new Error(`Could not start Chromium. Run npm run setup:crawler. Details: ${error.message}`);
  }

  const failures = [];
  try {
    const context = await browser.newContext({
      locale: 'en-US',
      timezoneId: 'Asia/Dhaka',
      viewport: { width: 1440, height: 1000 },
      javaScriptEnabled: true
    });
    for (const candidateUrl of (target.candidateUrls || [target.url])) {
      const page = await context.newPage();
      page.setDefaultTimeout(5_000);
      try {
        const response = await page.goto(candidateUrl, {
          waitUntil: 'domcontentloaded',
          timeout: BROWSER_NAVIGATION_TIMEOUT_MS
        });
        const status = response?.status();
        if (status && status >= 400) throw new Error(`HTTP ${status}`);

        const selector = target.platform === 'Codeforces'
          ? '.problem-statement'
          : '#task-statement .lang-en, #task-statement';
        await page.locator(selector).first().waitFor({ state: 'attached', timeout: 5_000 });
        const html = await page.locator(selector).first().evaluate((element) => element.outerHTML);
        const parsed = extractStatement(html, { ...target, url: candidateUrl });
        return { ...parsed, source: 'Local Playwright browser', sourceUrl: candidateUrl };
      } catch (error) {
        const pageTitle = await page.title().catch(() => '');
        failures.push(`${new URL(candidateUrl).hostname}: ${error.message || 'browser scrape failed'}${pageTitle ? ` (${pageTitle})` : ''}`);
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
  throw new Error(`Local browser could not retrieve a valid statement: ${failures.join(' • ')}`);
}

async function scrapeWithBasicFetch(target) {
  const failures = [];
  for (const candidateUrl of (target.candidateUrls || [target.url])) {
    try {
      const response = await fetch(candidateUrl, {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(BASIC_FETCH_TIMEOUT_MS)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = extractStatement(await response.text(), { ...target, url: candidateUrl });
      return { ...parsed, source: 'Direct server HTML', sourceUrl: candidateUrl };
    } catch (error) {
      failures.push(`${new URL(candidateUrl).hostname}: ${error.message || 'request failed'}`);
    }
  }
  throw new Error(`Direct server requests failed: ${failures.join(' • ')}`);
}

async function crawlProblemStatement(target, firecrawlApiKey) {
  const failures = [];
  if (firecrawlApiKey) {
    try {
      return await scrapeWithFirecrawl(target, firecrawlApiKey);
    } catch (error) {
      failures.push(error.message);
    }
  } else {
    failures.push('Firecrawl Cloud is not configured. Add FIRECRAWL_API_KEY to the project .env file to enable managed crawling with the enhanced-proxy retry.');
  }

  try {
    return await scrapeWithLocalBrowser(target);
  } catch (error) {
    failures.push(error.message);
  }

  try {
    return await scrapeWithBasicFetch(target);
  } catch (error) {
    failures.push(error.message);
  }

  throw new Error(`${failures.join(' • ')}. The server crawler avoids browser CORS, but it cannot guarantee access when the judge blocks requests. Configure Firecrawl Cloud or use the official problem link.`);
}

export function contestStackApi({ firecrawlApiKey }) {
  const installMiddleware = (server) => {
    server.middlewares.use('/api/problem-statement', async (req, res, next) => {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      if (req.method !== 'GET') return next();

      if (requestUrl.pathname === '/health') {
        let playwrightAvailable = false;
        let browserInstalled = false;
        try {
          const { chromium } = await import('playwright');
          playwrightAvailable = true;
          const { access } = await import('node:fs/promises');
          await access(chromium.executablePath());
          browserInstalled = true;
        } catch {
          // Health endpoint exposes setup state without failing the app.
        }
        return sendJson(res, 200, {
          status: 'ok',
          crawler: {
            firecrawlConfigured: Boolean(firecrawlApiKey),
            recommendedCrawler: firecrawlApiKey ? 'Firecrawl Cloud with auto proxy' : 'Not configured; local browser/basic HTTP only',
            localBrowserPackageAvailable: playwrightAvailable,
            localChromiumInstalled: browserInstalled
          }
        }, 'no-store');
      }

      if (requestUrl.pathname !== '/' && requestUrl.pathname !== '') {
        return sendJson(res, 404, { success: false, error: 'Unknown statement endpoint.' });
      }

      try {
        const target = resolveProblemTarget(requestUrl.searchParams.get('platform'), requestUrl.searchParams.get('id'));
        const cacheKey = `${target.platform}:${target.id}`;
        const cached = statementCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          return sendJson(res, 200, { success: true, ...cached.payload, cached: true }, 'private, max-age=300');
        }

        if (!statementInflight.has(cacheKey)) {
          statementInflight.set(cacheKey, crawlProblemStatement(target, firecrawlApiKey)
            .then((payload) => {
              statementCache.set(cacheKey, { payload, expiresAt: Date.now() + STATEMENT_TTL });
              return payload;
            })
            .finally(() => statementInflight.delete(cacheKey)));
        }
        const payload = await statementInflight.get(cacheKey);
        return sendJson(res, 200, { success: true, ...payload, cached: false }, 'private, max-age=300');
      } catch (error) {
        return sendJson(res, 502, { success: false, error: error.message || 'Problem statement crawler failed.' });
      }
    });

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
    name: 'contest-stack-server-api',
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware
  };
}

