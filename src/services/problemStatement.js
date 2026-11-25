export async function fetchProblemStatement(platform, problemId, { signal, timeoutMs = 115_000 } = {}) {
  const query = new URLSearchParams({ platform, id: String(problemId || '') });
  const controller = new AbortController();
  let timedOut = false;

  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener('abort', abortFromCaller, { once: true });

  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(`/api/problem-statement?${query.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || `Statement crawler returned HTTP ${response.status}.`);
    }
    return payload;
  } catch (error) {
    if (timedOut) {
      throw new Error('The statement crawler timed out after 115 seconds. Check that FIRECRAWL_API_KEY is configured in .env and restart the Vite server.');
    }
    if (signal?.aborted) {
      const abortError = new Error('Statement request cancelled.');
      abortError.name = 'AbortError';
      throw abortError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
