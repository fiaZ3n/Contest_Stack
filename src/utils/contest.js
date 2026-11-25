export const isEnded = (contest, now = new Date()) => new Date(contest.endAt).getTime() <= now.getTime();

export const formatDateTime = (value) => new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
}).format(new Date(value));

export const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours}h` : '', rest ? `${rest}m` : ''].filter(Boolean).join(' ') || '0m';
};

export const getProblemLetters = (count) => Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));

export const getStats = (contests) => {
  const unsolved = contests.reduce((sum, contest) => sum + (contest.unsolved?.length || 0), 0);
  const upsolved = contests.reduce((sum, contest) => sum + (contest.upsolved?.length || 0), 0);
  return { unsolved, upsolved, total: contests.length, finished: contests.filter((contest) => isEnded(contest)).length };
};

export const isRecent = (contest) => {
  if (contest.era) return contest.era === 'Recent';
  const age = Date.now() - new Date(contest.createdAt).getTime();
  return age <= 30 * 24 * 60 * 60 * 1000;
};
