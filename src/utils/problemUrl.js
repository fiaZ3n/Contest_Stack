/**
 * Resolve a problem's original public judge URL.
 *
 * Contest Stack intentionally opens the official judge page in a new tab. It
 * does not fetch, scrape, embed, or render problem statements inside the app.
 */
export function getOfficialProblemUrl(platform, problem) {
  const rawUrl = String(problem?.url || '').trim();

  // Prefer a supplied URL only when it points to the official judge host.
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      const allowedHost = platform === 'Codeforces'
        ? parsed.hostname === 'codeforces.com' || parsed.hostname === 'www.codeforces.com'
        : platform === 'AtCoder' && parsed.hostname === 'atcoder.jp';
      const validPath = platform === 'Codeforces'
        ? /^\/(?:contest\/\d+\/problem\/[A-Za-z]\d*|problemset\/problem\/\d+\/[A-Za-z]\d*)$/.test(parsed.pathname)
        : platform === 'AtCoder' && /^\/contests\/[A-Za-z0-9_-]+\/tasks\/[A-Za-z0-9_-]+$/.test(parsed.pathname);
      if (parsed.protocol === 'https:' && allowedHost && validPath) return parsed.href;
    } catch {
      // Fall through and derive the canonical URL from the problem identity.
    }
  }

  const id = String(problem?.id || '').trim();
  const index = String(problem?.index || '').trim();
  const contestId = String(problem?.contestId || '').trim();

  if (platform === 'Codeforces') {
    const match = id.match(/^(\d+)([A-Za-z]\d*)$/);
    const resolvedContestId = contestId || match?.[1];
    const resolvedIndex = index || match?.[2];
    if (!/^\d+$/.test(resolvedContestId || '') || !/^[A-Za-z]\d*$/.test(resolvedIndex || '')) return '';
    return `https://codeforces.com/contest/${resolvedContestId}/problem/${encodeURIComponent(resolvedIndex.toUpperCase())}`;
  }

  if (platform === 'AtCoder') {
    // The project stores IDs as ABC361-A; AtCoder Problems exposes task IDs
    // such as abc361_a. Both shapes resolve to the same official task URL.
    const match = id.match(/^(abc|arc|agc|ahc)(\d+)[-_]([a-z0-9]+)$/i);
    const resolvedContestId = contestId || (match ? `${match[1]}${match[2]}` : '');
    const resolvedIndex = index || match?.[3] || '';
    if (!/^(abc|arc|agc|ahc)\d+$/i.test(resolvedContestId) || !/^[a-z0-9]+$/i.test(resolvedIndex)) return '';
    const canonicalContest = resolvedContestId.toLowerCase();
    const taskId = `${canonicalContest}_${resolvedIndex.toLowerCase()}`;
    return `https://atcoder.jp/contests/${canonicalContest}/tasks/${taskId}`;
  }

  return '';
}
