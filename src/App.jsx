import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, SlidersHorizontal, Layers3, CircleDashed, Flag, CalendarDays, ChevronDown, X, Command, UserPlus } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import ContestCard from './components/ContestCard.jsx';
import NewContestModal from './components/NewContestModal.jsx';
import InviteContestModal from './components/InviteContestModal.jsx';
import JoinContestModal from './components/JoinContestModal.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import ContestRoom from './components/ContestRoom.jsx';
import { seedContests } from './data.js';
import { getStats, isRecent } from './utils/contest.js';

const STORAGE_KEY = 'contest-stack-v2';
const LEGACY_STORAGE_KEY = 'contest-stack-v1';

function normalizeContests(items) {
  return (Array.isArray(items) ? items : []).map((contest) => {
    const count = (contest.problems || []).length || Number(contest.problemCount || 0);
    const letters = Array.from({ length: count }, (_, index) => String.fromCharCode(65 + index));
    return {
      ...contest,
      letters,
      problemDetails: (contest.problemDetails || []).map((detail) => ({ ...detail, index: String(detail.index || '').toUpperCase() }))
    };
  });
}

function readContests() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const normalized = normalizeContests(JSON.parse(saved));
      return normalized;
    }

    // Older builds defaulted to hidden problem labels. Migrate that legacy default to visible.
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = normalizeContests(JSON.parse(legacy).map((contest) => ({
        ...contest,
        showProblemInfo: contest.showProblemInfo === false ? true : contest.showProblemInfo ?? true
      })));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (error) {
    console.warn('Could not read saved contests:', error);
  }
  return seedContests;
}

const filterTabs = [
  { id: 'all', label: 'All contests' },
  { id: 'unsolved', label: 'Unsolved', icon: CircleDashed },
  { id: 'upsolved', label: 'Upsolved', icon: Flag },
  { id: 'recent', label: 'Recent' },
  { id: 'old', label: 'Old' }
];

export default function App() {
  const [contests, setContests] = useState(readContests);
  const [activePage, setActivePage] = useState('contests');
  const [activeContestId, setActiveContestId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('All platforms');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContestId, setEditingContestId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [inviteContestId, setInviteContestId] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(() => Boolean(new URLSearchParams(window.location.search).get('join')));
  const [joinCode, setJoinCode] = useState(() => new URLSearchParams(window.location.search).get('join') || '');

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(contests)); }
    catch (error) { console.warn('Could not save contests:', error); }
  }, [contests]);

  const stats = useMemo(() => getStats(contests), [contests]);
  const filteredContests = useMemo(() => contests
    .filter((contest) => {
      if (activeFilter === 'unsolved' && !(contest.unsolved || []).length) return false;
      if (activeFilter === 'upsolved' && !(contest.upsolved || []).length) return false;
      if (activeFilter === 'recent' && !isRecent(contest)) return false;
      if (activeFilter === 'old' && isRecent(contest)) return false;
      if (platformFilter !== 'All platforms' && contest.platform !== platformFilter) return false;
      const query = search.trim().toLowerCase();
      if (query && ![contest.title, contest.platform, contest.division, contest.level, ...(contest.problems || [])].join(' ').toLowerCase().includes(query)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [contests, activeFilter, platformFilter, search]);

  const createContest = (contest) => {
    setContests((current) => [contest, ...current]);
    setShowModal(false);
    setEditingContestId(null);
    setActiveFilter('all');
    setPlatformFilter('All platforms');
    setSearch('');
  };

  const saveContest = (updatedContest) => {
    setContests((current) => current.map((contest) => contest.id === updatedContest.id ? updatedContest : contest));
    setShowModal(false);
    setEditingContestId(null);
  };
  const openCreateModal = () => { setEditingContestId(null); setShowModal(true); };
  const openEditModal = (contestId) => { setEditingContestId(contestId); setShowModal(true); };
  const openContestRoom = (contestId) => { setActiveContestId(contestId); setActivePage('contest-room'); window.scrollTo(0, 0); };
  const cloneContest = (source) => {
    const now = new Date();
    const start = new Date(now.getTime() + 10 * 60 * 1000);
    const duration = Number(source.duration) || 120;
    const cloned = {
      ...source,
      id: `contest-${Date.now()}`,
      title: `${source.title} (Copy)`,
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + duration * 60 * 1000).toISOString(),
      immediate: false,
      participants: [],
      invitation: undefined,
      unsolved: [],
      upsolved: [],
      createdAt: now.toISOString(),
      updatedAt: undefined
    };
    setContests((current) => [cloned, ...current]);
    setActiveContestId(null);
    setActivePage('contests');
    window.scrollTo(0, 0);
  };

  const updateResult = (id, result) => setContests((current) => current.map((contest) => contest.id === id ? { ...contest, ...result } : contest));
  const saveInvitation = (id, invitation) => {
    setContests((current) => current.map((contest) => contest.id === id ? { ...contest, invitation } : contest));
  };
  const joinContest = ({ code, password, displayName }) => {
    const match = contests.find((contest) => contest.invitation?.code?.toUpperCase() === code);
    if (!match) return { ok: false, message: 'No matching invitation was found in this browser. Check the code, or connect a shared backend for cross-device invites.' };
    if (match.invitation.password !== password) return { ok: false, message: 'That password is incorrect. Ask the contest host to confirm it.' };
    const participants = match.participants || [];
    if (participants.some((person) => person.toLowerCase() === displayName.toLowerCase())) return { ok: true, message: `You are already listed in ${match.title}.` };
    setContests((current) => current.map((contest) => contest.id === match.id ? { ...contest, participants: [...(contest.participants || []), displayName] } : contest));
    return { ok: true, message: `You're in! ${displayName} has joined ${match.title}.` };
  };
  const invitedContest = contests.find((contest) => contest.id === inviteContestId);
  const activeContest = contests.find((contest) => contest.id === activeContestId);

  return (
    <div className="app-shell">
      <Sidebar active={activePage === 'contest-room' ? 'contests' : activePage} onChange={setActivePage} />
      <main className="main-content">
        {activePage === 'contest-room' && activeContest ? (
          <div className="page-content"><ContestRoom contest={activeContest} onBack={() => setActivePage('contests')} onClone={cloneContest} /><footer className="page-footer"><span>CONTEST STACK <b>·</b> BUILD YOUR OWN MOMENTUM</span><span>Your practice data stays in this browser.</span></footer></div>
        ) : activePage === 'contests' ? (
          <div className="page-content">
            <div className="page-heading contest-page-heading"><div><span className="eyebrow">PRACTICE WITH PURPOSE</span><h1>Contest stack<span className="heading-dot">.</span></h1><p>Organize contests, track what you missed, and keep your momentum.</p></div><div className="heading-actions"><button className="button secondary join-button" onClick={() => { setJoinCode(''); setShowJoinModal(true); }}><UserPlus size={16} /> Join contest</button><button className="button primary create-button" onClick={openCreateModal}><Plus size={17} /> New contest</button></div></div>
            <div className="overview-strip">
              <button className={`overview-card ${activeFilter === 'all' ? 'selected' : ''}`} onClick={() => setActiveFilter('all')}><span className="overview-icon all-icon"><Layers3 size={17} /></span><span className="overview-copy"><small>CONTESTS</small><strong>{stats.total}</strong></span><span className="overview-note">Total in stack</span></button>
              <button className={`overview-card ${activeFilter === 'unsolved' ? 'selected' : ''}`} onClick={() => setActiveFilter(activeFilter === 'unsolved' ? 'all' : 'unsolved')}><span className="overview-icon unsolved-icon"><CircleDashed size={17} /></span><span className="overview-copy"><small>UNSOLVED PROBLEMS</small><strong>{stats.unsolved}</strong></span><span className="overview-note">Need another try</span></button>
              <button className={`overview-card ${activeFilter === 'upsolved' ? 'selected' : ''}`} onClick={() => setActiveFilter(activeFilter === 'upsolved' ? 'all' : 'upsolved')}><span className="overview-icon upsolved-icon"><Flag size={17} /></span><span className="overview-copy"><small>UPSOLVED PROBLEMS</small><strong>{stats.upsolved}</strong></span><span className="overview-note">Solved afterwards</span></button>
            </div>
            <section className="contest-stack-section">
              <div className="stack-heading"><div><h2>Your contests <span>{filteredContests.length}</span></h2><p>All your practice sessions in one place.</p></div><div className="stack-controls"><label className="search-box"><Search size={16} /><input aria-label="Search contests" placeholder="Search contests or problem ID..." value={search} onChange={(e) => setSearch(e.target.value)} />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={14} /></button>}<kbd><Command size={10} /> K</kbd></label><button className={`filter-button ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15} /> Filters <ChevronDown size={14} /></button></div></div>
              {showFilters && <div className="filter-panel"><span>PLATFORM</span><div className="platform-filter-buttons">{['All platforms', 'Codeforces', 'AtCoder'].map((platform) => <button key={platform} className={platformFilter === platform ? 'active' : ''} onClick={() => setPlatformFilter(platform)}>{platform}</button>)}</div></div>}
              <div className="filter-tabs">{filterTabs.map(({ id, label, icon: Icon }) => <button key={id} className={activeFilter === id ? 'active' : ''} onClick={() => setActiveFilter(id)}>{Icon && <Icon size={14} />}{label}{id === 'unsolved' && <b>{stats.unsolved}</b>}{id === 'upsolved' && <b>{stats.upsolved}</b>}</button>)}</div>
              <div className="contest-list">{filteredContests.length ? filteredContests.map((contest) => <ContestCard key={contest.id} contest={contest} onUpdateResult={updateResult} onInvite={() => setInviteContestId(contest.id)} onEdit={() => openEditModal(contest.id)} onEnter={() => openContestRoom(contest.id)} />) : <div className="empty-state"><div className="empty-icon"><CalendarDays size={22} /></div><h3>No contests found</h3><p>Try changing your filters, or create a new contest to get started.</p><button className="button secondary" onClick={() => { setActiveFilter('all'); setPlatformFilter('All platforms'); setSearch(''); }}>Clear filters</button></div>}</div>
            </section>
            <footer className="page-footer"><span>CONTEST STACK <b>·</b> BUILD YOUR OWN MOMENTUM</span><span>Your practice data stays in this browser.</span></footer>
          </div>
        ) : <div className="page-content"><ProfilePage contests={contests} /><footer className="page-footer"><span>CONTEST STACK <b>·</b> BUILD YOUR OWN MOMENTUM</span><span>Your practice data stays in this browser.</span></footer></div>}
      </main>
      {showModal && <NewContestModal key={editingContestId || 'new-contest'} initialContest={contests.find((contest) => contest.id === editingContestId) || null} onClose={() => { setShowModal(false); setEditingContestId(null); }} onCreate={createContest} onSave={saveContest} />}
      {invitedContest && <InviteContestModal contest={invitedContest} invitation={invitedContest.invitation} onClose={() => setInviteContestId(null)} onSave={(invitation) => saveInvitation(invitedContest.id, invitation)} />}
      {showJoinModal && <JoinContestModal initialCode={joinCode} onClose={() => setShowJoinModal(false)} onJoin={joinContest} />}
    </div>
  );
}
