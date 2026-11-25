const iso = (value) => new Date(value).toISOString();

export const seedContests = [
  {
    id: 'c-1001',
    title: 'Codeforces Round 1890 — Div. 3 practice',
    platform: 'Codeforces',
    division: 'Div. 3',
    era: 'Recent',
    level: 'Pupil',
    startAt: iso('2026-11-24T15:00:00+06:00'),
    endAt: iso('2026-11-24T17:00:00+06:00'),
    duration: 120,
    immediate: false,
    problemCount: 6,
    problems: ['1890A', '1890B', '1890C', '1890D', '1890E', '1890F'],
    letters: ['A', 'B', 'C', 'D', 'E', 'F'],
    unsolved: ['1890D', '1890E'],
    upsolved: ['1890F'],
    createdAt: iso('2026-11-24T11:00:00+06:00')
  },
  {
    id: 'c-1002',
    title: 'AtCoder Beginner Contest workout',
    platform: 'AtCoder',
    division: 'ABC',
    era: 'Recent',
    level: 'Specialist',
    startAt: iso('2026-11-21T19:30:00+06:00'),
    endAt: iso('2026-11-21T21:00:00+06:00'),
    duration: 90,
    immediate: false,
    problemCount: 5,
    problems: ['ABC382-A', 'ABC382-B', 'ABC382-C', 'ABC382-D', 'ABC382-E'],
    letters: ['A', 'B', 'C', 'D', 'E'],
    unsolved: ['ABC382-D'],
    upsolved: ['ABC382-E'],
    createdAt: iso('2026-11-20T10:00:00+06:00')
  },
  {
    id: 'c-1003',
    title: 'Mixed ladder — Div. 2',
    platform: 'Codeforces',
    division: 'Div. 2',
    era: 'Old',
    level: 'Expert',
    startAt: iso('2026-10-12T20:00:00+06:00'),
    endAt: iso('2026-10-12T22:00:00+06:00'),
    duration: 120,
    immediate: false,
    problemCount: 4,
    problems: ['1915A', '1915B', '1915C', '1915D'],
    letters: ['A', 'B', 'C', 'D'],
    unsolved: ['1915C', '1915D'],
    upsolved: [],
    createdAt: iso('2026-10-11T12:00:00+06:00')
  }
];

export const ratingLevels = [
  { label: 'Immediate start', value: 'Immediate start', description: 'Start the contest as soon as you create it.' },
  { label: 'Newbie', value: 'Newbie', description: 'Below 1200' },
  { label: 'Pupil', value: 'Pupil', description: '1200–1399' },
  { label: 'Specialist', value: 'Specialist', description: '1400–1599' },
  { label: 'Expert', value: 'Expert', description: '1600–1899' },
  { label: 'Candidate Master', value: 'Candidate Master', description: '1900–2099' },
  { label: 'Master', value: 'Master', description: '2100–2299' },
  { label: 'International Master', value: 'International Master', description: '2300–2399' },
  { label: 'Grandmaster', value: 'Grandmaster', description: 'Target 2400+' }
];
