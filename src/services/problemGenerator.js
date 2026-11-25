const CODEFORCES_PROBLEMS_URL = '/api/codeforces/problemset.problems';
const CODEFORCES_CONTESTS_URL = '/api/codeforces/contest.list?gym=false';
const ATCODER_BASE = '/api/atcoder/resources';

// Keep a small in-memory cache so repeated contest generation does not redownload
// the full public problem catalogues during the same browser session.
const catalogueCache = new Map();

async function fetchJsonCached(key, url) {
  if (catalogueCache.has(key)) return catalogueCache.get(key);

  const request = fetch(url, { headers: { Accept: 'application/json' } })
    .then(async (response) => {
      if (!response.ok) throw new Error(`The problem catalogue returned HTTP ${response.status}.`);
      return response.json();
    })
    .catch((error) => {
      catalogueCache.delete(key);
      throw error;
    });

  catalogueCache.set(key, request);
  return request;
}

const pauseBetweenCodeforcesRequests = () => new Promise((resolve) => setTimeout(resolve, 2100));
const pauseBetweenAtcoderRequests = () => new Promise((resolve) => setTimeout(resolve, 1100));

async function getCodeforcesCatalogue() {
  const problemResponse = await fetchJsonCached('cf-problems', CODEFORCES_PROBLEMS_URL);
  await pauseBetweenCodeforcesRequests();
  const contestResponse = await fetchJsonCached('cf-contests', CODEFORCES_CONTESTS_URL);
  if (problemResponse.status !== 'OK' || contestResponse.status !== 'OK') {
    throw new Error('Codeforces did not return a usable problem catalogue. Please try again later.');
  }
  const contests = new Map((contestResponse.result || []).map((contest) => [
    contest.id,
    { name: contest.name || '', timestamp: contest.startTimeSeconds || null }
  ]));
  const problems = (problemResponse.result?.problems || []).map((problem) => ({
    source: 'Codeforces',
    sourceId: `${problem.contestId}${problem.index}`,
    id: `${problem.contestId}${problem.index}`,
    index: String(problem.index || '').toUpperCase(),
    name: problem.name || `${problem.contestId}${problem.index}`,
    rating: problem.rating ?? null,
    tags: problem.tags || [],
    contestId: problem.contestId,
    contestName: contests.get(problem.contestId)?.name || '',
    timestamp: contests.get(problem.contestId)?.timestamp || null,
    url: `https://codeforces.com/contest/${problem.contestId}/problem/${encodeURIComponent(problem.index)}`
  })).filter((problem) => problem.contestId && problem.index && problem.rating != null);
  return problems;
}

async function getAtcoderCatalogue() {
  const problems = await fetchJsonCached('atcoder-problems', `${ATCODER_BASE}/problems.json`);
  await pauseBetweenAtcoderRequests();
  const contests = await fetchJsonCached('atcoder-contests', `${ATCODER_BASE}/contests.json`);
  await pauseBetweenAtcoderRequests();
  const models = await fetchJsonCached('atcoder-models', `${ATCODER_BASE}/problem-models.json`);

  const contestMap = new Map((contests || []).map((contest) => [contest.id, contest]));
  const result = (problems || []).map((problem) => {
    const model = models?.[problem.id];
    const contest = contestMap.get(problem.contest_id);
    const index = String(problem.problem_index || '').toUpperCase();
    const contestId = String(problem.contest_id || '');
    return {
      source: 'AtCoder',
      sourceId: problem.id,
      id: `${contestId.toUpperCase()}-${index}`,
      index,
      name: problem.name || problem.title || problem.id,
      rating: Number.isFinite(model?.difficulty) ? model.difficulty : null,
      tags: [],
      contestId,
      contestName: contest?.title || contest?.name || contestId.toUpperCase(),
      timestamp: contest?.start_epoch_second || null,
      url: `https://atcoder.jp/contests/${encodeURIComponent(contestId)}/tasks/${encodeURIComponent(problem.id)}`
    };
  });
  return result.filter((problem) => problem.contestId && problem.index && problem.rating != null);
}

const codeforcesRanges = {
  Newbie: [800, 1199],
  Pupil: [1200, 1399],
  Specialist: [1400, 1599],
  Expert: [1600, 1899],
  'Candidate Master': [1900, 2099],
  Master: [2100, 2299],
  'International Master': [2300, 2399],
  Grandmaster: [2400, Infinity]
};

// AtCoder Problems' estimated difficulty is not the same rating scale as CF.
// These wider 400-point bands are used as a practical target-level approximation.
const atcoderRanges = {
  Newbie: [-Infinity, 399],
  Pupil: [400, 799],
  Specialist: [800, 1199],
  Expert: [1200, 1599],
  'Candidate Master': [1600, 1999],
  Master: [2000, 2399],
  'International Master': [2400, 2799],
  Grandmaster: [2800, Infinity]
};

function matchesDivision(problem, division, platform) {
  if (platform === 'AtCoder') {
    const id = problem.contestId.toLowerCase();
    return id.startsWith(division.toLowerCase());
  }
  const name = problem.contestName.toLowerCase();
  if (division === 'Educational') return name.includes('educational');
  if (division === 'Global Round') return name.includes('global round');
  const number = division.match(/Div\.\s*(\d)/)?.[1];
  return number ? new RegExp(`div\\.?\\s*${number}`, 'i').test(name) : true;
}

function matchesEra(problem, era, now = Date.now()) {
  if (!problem.timestamp) return false;
  const age = now / 1000 - problem.timestamp;
  const oneYear = 365 * 24 * 60 * 60;
  return era === 'Recent' ? age >= 0 && age <= oneYear : age > oneYear;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomUnique(items, count) {
  const pool = [...items];
  const chosen = [];
  while (pool.length && chosen.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(index, 1)[0]);
  }
  return chosen;
}

function getProblemUrlFromManualId(id, platform) {
  const value = id.trim();
  if (platform === 'Codeforces') {
    const match = value.match(/^(\d+)([A-Za-z]\d*)$/);
    if (match) return `https://codeforces.com/contest/${match[1]}/problem/${match[2].toUpperCase()}`;
  } else {
    const match = value.match(/^(abc|arc|agc|ahc)\d+[-_]([a-z0-9]+)$/i);
    if (match) {
      const normalized = value.toLowerCase().replace('-', '_');
      const contestId = normalized.split('_')[0];
      return `https://atcoder.jp/contests/${contestId}/tasks/${normalized}`;
    }
  }
  return '';
}

function validateManualId(id, platform) {
  const value = id.trim();
  if (!value) return true;
  if (platform === 'Codeforces') return /^\d+[A-Za-z]\d*$/.test(value);
  return /^(abc|arc|agc|ahc)\d+[-_][a-z0-9]+$/i.test(value);
}

/**
 * Build a contest problem set from public platform catalogues.
 * Selected slots filter the source problem index (for example A/B). The number
 * of generated problems remains problemCount, independent of the selected indices.
 * Manual IDs are fixed first; the remaining problems are sampled from the catalogue.
 */
export async function generateContestProblems({
  platform,
  division,
  era,
  level = 'Any',
  problemCount,
  selectedSlots = [],
  manualProblems = []
}) {
  const count = Number(problemCount);
  if (!Number.isInteger(count) || count < 1 || count > 12) {
    throw new Error('Choose between 1 and 12 problems.');
  }

  const manualBySlot = new Map();
  manualProblems.forEach((value, index) => {
    const id = String(value || '').trim();
    if (id) manualBySlot.set(String.fromCharCode(65 + index), id);
  });

  for (const [slot, id] of manualBySlot) {
    if (!validateManualId(id, platform)) {
      throw new Error(`“${id}” is not a valid ${platform} problem ID for slot ${slot}.`);
    }
  }
  const manualIds = [...manualBySlot.values()].map((id) => id.toLowerCase());
  if (new Set(manualIds).size !== manualIds.length) {
    throw new Error('The same problem ID cannot be added more than once.');
  }
  if (manualBySlot.size > count) {
    throw new Error(`You entered ${manualBySlot.size} fixed problem IDs, but the contest is set to ${count} problems.`);
  }

  const chosen = [];
  const used = new Set();
  const add = (problem) => {
    if (!problem) return false;
    const uniqueKey = String(problem.sourceId || problem.id).toLowerCase();
    if (used.has(uniqueKey)) return false;
    used.add(uniqueKey);
    chosen.push(problem);
    return true;
  };

  for (const [slot, id] of manualBySlot) {
    add({
      source: platform,
      sourceId: `manual-${platform}-${id.toLowerCase()}`,
      id,
      index: slot,
      slot,
      name: id,
      rating: null,
      tags: [],
      url: getProblemUrlFromManualId(id, platform),
      manual: true
    });
  }

  const remaining = count - chosen.length;
  if (remaining > 0) {
    const catalogue = platform === 'Codeforces'
      ? await getCodeforcesCatalogue()
      : await getAtcoderCatalogue();
    const targetRange = level && level !== 'Any'
      ? (platform === 'Codeforces' ? codeforcesRanges : atcoderRanges)[level]
      : null;

    const filtered = catalogue.filter((problem) => {
      if (problem.rating == null) return false;
      if (targetRange && (problem.rating < targetRange[0] || problem.rating > targetRange[1])) return false;
      if (!matchesDivision(problem, division, platform)) return false;
      if (!matchesEra(problem, era)) return false;
      if (selectedSlots.length && !selectedSlots.includes(problem.index)) return false;
      if (used.has(String(problem.sourceId || problem.id).toLowerCase())) return false;
      return true;
    });

    if (filtered.length < remaining) {
      const positionText = selectedSlots.length ? ` for index filter ${selectedSlots.join(', ')}` : '';
      const targetText = level && level !== 'Any' ? ` and target ${level}` : ' across all difficulty levels';
      throw new Error(`Only ${filtered.length} more problems match ${platform}, ${division}, ${era.toLowerCase()}${positionText}${targetText}; ${remaining} more are needed. Try changing the filters or problem count.`);
    }

    randomUnique(filtered, remaining).forEach((problem) => add({ ...problem, slot: problem.index }));
  }

  return {
    problems: chosen.map((problem) => ({
      id: problem.id,
      index: problem.index,
      slot: problem.slot || problem.index || 'A',
      name: problem.name,
      rating: problem.rating,
      tags: problem.tags || [],
      url: problem.url,
      manual: Boolean(problem.manual)
    })),
    generationMode: manualBySlot.size ? (remaining === 0 ? 'manual-only' : 'manual-plus-random') : (selectedSlots.length ? 'filtered-random' : 'random'),
    selectedSlots
  };
}
