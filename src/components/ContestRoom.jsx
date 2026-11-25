import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CalendarDays, Clock3, Copy, ExternalLink, MessageSquare,
  Settings2, Target, Trophy, Users, BookOpen, ListChecks, Medal, Info
} from 'lucide-react';
import { formatDateTime, formatDuration, getProblemLetters } from '../utils/contest.js';
import { getOfficialProblemUrl } from '../utils/problemUrl.js';

const formatClock = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hhmmss = [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  return days ? `${days}d ${hhmmss}` : hhmmss;
};

const tabs = [
  { id: 'Overview', icon: Info },
  { id: 'Problem', icon: BookOpen },
  { id: 'Status', icon: ListChecks },
  { id: 'Rank', icon: Medal },
  { id: 'Discuss', icon: MessageSquare }
];

export default function ContestRoom({ contest, onBack, onClone }) {
  const [now, setNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState('Problem');
  const [notice, setNotice] = useState('');
  const [discussion, setDiscussion] = useState('');
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const start = new Date(contest.startAt).getTime();
  const end = new Date(contest.endAt).getTime();
  const status = now < start ? 'Upcoming' : now < end ? 'In progress' : 'Ended';
  const countdown = now < start ? start - now : now < end ? end - now : 0;
  const timerLabel = now < start ? 'Starts in' : now < end ? 'Time remaining' : 'Contest finished';
  const hidden = contest.showProblemInfo === false && now < end;
  const progress = now < start ? 0 : now >= end ? 100 : Math.max(0, Math.min(100, ((now - start) / Math.max(1, end - start)) * 100));

  const problems = useMemo(() => (contest.problems || []).map((id, index) => ({
    id,
    key: `${index}-${id}`,
    letter: getProblemLetters((contest.problems || []).length)[index],
    detail: (contest.problemDetails || []).find((item) => item.id === id) || (contest.problemDetails || [])[index] || null
  })), [contest]);
  const getProblemUrl = (problem) => getOfficialProblemUrl(
    contest.platform,
    problem?.detail || { id: problem?.id }
  );
  const cloneCurrentContest = () => {
    if (onClone) onClone(contest);
    else setNotice('Clone is not available in this workspace.');
  };
  const statusFor = (id) => (contest.unsolved || []).includes(id) ? 'Unsolved' : (contest.upsolved || []).includes(id) ? 'Upsolved' : 'Not tracked';

  return (
    <div className="contest-room-page">
      <button type="button" className="button secondary room-back" onClick={onBack}><ArrowLeft size={15} /> Back to contests</button>

      <section className="room-hero panel room-vjudge-hero">
        <div className="room-vjudge-hero-grid">
          <div className="room-vjudge-date"><b>Begin:</b><span>{formatDateTime(contest.startAt)}</span></div>
          <div className="room-vjudge-title">
            <span className={`platform-mark ${contest.platform === 'AtCoder' ? 'atcoder' : 'codeforces'}`}>{contest.platform === 'AtCoder' ? 'At' : 'CF'}</span>
            <div><h1>{contest.title}</h1><span>{contest.platform} · {contest.division}</span></div>
          </div>
          <div className="room-vjudge-date end"><b>End:</b><span>{formatDateTime(contest.endAt)}</span></div>
        </div>
        <div className="room-progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className={`room-vjudge-state ${status === 'Ended' ? 'ended' : status === 'In progress' ? 'running' : 'upcoming'}`}>
          {status === 'Ended' ? 'Ended' : status === 'In progress' ? 'In progress' : `Starts in ${formatClock(countdown)}`}
        </div>
        <div className="room-vjudge-meta">
          <div><Clock3 size={15} /><span>{timerLabel}: <b>{status === 'Ended' ? '00:00:00' : formatClock(countdown)}</b></span></div>
          <div><CalendarDays size={15} /><span>{formatDuration(contest.duration)}</span></div>
          <div><Target size={15} /><span>{contest.level && contest.level !== 'Any' ? contest.level : 'Any difficulty'}</span></div>
          <div><Users size={15} /><span>{(contest.participants || []).length + 1} participants</span></div>
        </div>
      </section>

      <nav className="room-vjudge-tabs" aria-label="Contest sections">
        <div className="room-vjudge-tab-list">
          {tabs.map(({ id, icon: Icon }) => <button type="button" key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}><Icon size={14} />{id}</button>)}
        </div>
        <div className="room-vjudge-tab-actions">
          <button type="button" onClick={() => setActiveTab('Preferences')} className={activeTab === 'Preferences' ? 'active' : ''}><Settings2 size={14} /> Preference</button>
          <button type="button" onClick={cloneCurrentContest}><Copy size={14} /> Clone</button>
        </div>
      </nav>

      {notice && <div className="room-toast" role="status">{notice}</div>}

      {activeTab === 'Problem' && (
        <section className="room-tab-panel room-problems-section">
          {hidden && <div className="inline-hint room-hidden-note">The host has hidden problem identities. They will be revealed when the contest ends.</div>}
          <div className="section-heading">
            <div>
              <span className="eyebrow">PROBLEM SET</span>
              <h2>Problems</h2>
              <p>Open a problem on its original Codeforces or AtCoder page.</p>
            </div>
            <span className="history-total">{problems.length} total</span>
          </div>
          <div className="room-problem-list">
            {problems.map((problem) => {
              const { id, letter, detail } = problem;
              const sourceIndex = String(detail?.index || problem.slot || letter).toUpperCase();
              const sourceLabel = `${contest.platform === 'Codeforces' ? 'CF' : 'AtCoder'} ${sourceIndex}`;
              const visibleId = String(id || '').toUpperCase();
              const originalUrl = getProblemUrl(problem);
              return (
                <article className="room-problem-card" key={problem.key}>
                  <div className="room-problem-letter">{letter}</div>
                  <div className="room-problem-info">
                    <b>Problem {letter}</b>
                    {hidden ? <span>Problem details hidden</span> : <><span>{sourceLabel} · {visibleId}</span><small>{detail?.name || visibleId}</small></>}
                  </div>
                  {!hidden && (originalUrl ? (
                    <a className="button secondary room-open-link" href={originalUrl} target="_blank" rel="noopener noreferrer">
                      Open original problem <ExternalLink size={13} />
                    </a>
                  ) : (
                    <button type="button" className="button secondary room-open-link" disabled title="A valid original problem URL is unavailable">Original link unavailable</button>
                  ))}
                </article>
              );
            })}
            {!problems.length && <div className="empty-state"><Trophy size={22} /><h3>No problems in this contest</h3><p>Return to the contest stack and edit the problem set.</p></div>}
          </div>
        </section>
      )}

      {activeTab === 'Overview' && <section className="room-tab-panel room-overview-panel">
        <div className="room-tab-title"><span className="eyebrow">CONTEST OVERVIEW</span><h2>{contest.title}</h2><p>Your practice session details and problem set at a glance.</p></div>
        <div className="room-overview-grid">
          <article><span>CONTEST STATUS</span><b>{status}</b></article>
          <article><span>PROBLEMS</span><b>{problems.length}</b></article>
          <article><span>UNSOLVED</span><b>{(contest.unsolved || []).length}</b></article>
          <article><span>UPSOLVED</span><b>{(contest.upsolved || []).length}</b></article>
        </div>
        <div className="room-overview-problems">{problems.map((problem) => {
          const url = getProblemUrl(problem);
          const content = <><b>{problem.letter}</b><span>{hidden ? 'Hidden problem' : problem.detail?.name || problem.id}</span></>;
          return hidden || !url
            ? <div className="room-overview-problem-item disabled" key={problem.key}>{content}</div>
            : <a className="room-overview-problem-item" key={problem.key} href={url} target="_blank" rel="noopener noreferrer">{content}<ExternalLink size={12} /></a>;
        })}</div>
      </section>}

      {activeTab === 'Status' && <section className="room-tab-panel room-status-panel">
        <div className="room-tab-title"><span className="eyebrow">MY PROBLEM STATUS</span><h2>Problem progress</h2><p>Progress categories are managed from your contest results. Live judge submissions are not connected.</p></div>
        <div className="room-status-table">
          {problems.map((problem) => {
            const url = getProblemUrl(problem);
            return <div key={problem.key}>
              <b>{problem.letter}</b>
              <span>{hidden ? 'Hidden problem' : `${problem.detail?.name || problem.id}`}</span>
              <em className={statusFor(problem.id).toLowerCase().replace(' ', '-')}>{statusFor(problem.id)}</em>
              {hidden || !url ? <span className="room-status-open-disabled">—</span> : <a className="room-status-open-link" href={url} target="_blank" rel="noopener noreferrer">Open <ExternalLink size={11} /></a>}
            </div>;
          })}
        </div>
      </section>}

      {activeTab === 'Rank' && <section className="room-tab-panel room-placeholder-panel">
        <Medal size={28} /><h2>Contest participants</h2><p>This personal contest room currently tracks who joined. A live rank table requires participant submissions or shared scoring data.</p>
        <div className="room-rank-list"><div><b>1</b><span>Host · You</span><small>Contest owner</small></div>{(contest.participants || []).map((name, index) => <div key={`${name}-${index}`}><b>{index + 2}</b><span>{name}</span><small>Participant</small></div>)}</div>
      </section>}

      {activeTab === 'Discuss' && <section className="room-tab-panel room-discuss-panel">
        <div className="room-tab-title"><span className="eyebrow">CONTEST DISCUSSION</span><h2>Discuss</h2><p>Leave a note for your own review. Shared discussion needs a backend.</p></div>
        <form onSubmit={(event) => { event.preventDefault(); if (discussion.trim()) { setComments((items) => [{ id: Date.now(), text: discussion.trim(), createdAt: new Date() }, ...items]); setDiscussion(''); } }}>
          <textarea value={discussion} onChange={(event) => setDiscussion(event.target.value)} placeholder="Write a note about this contest…" rows={3} />
          <button className="button primary" type="submit" disabled={!discussion.trim()}>Add note</button>
        </form>
        {comments.map((comment) => <article key={comment.id}><b>My note</b><p>{comment.text}</p><small>{comment.createdAt.toLocaleString()}</small></article>)}
        {!comments.length && <div className="room-empty-note">No notes yet. Use this space to record contest observations.</div>}
      </section>}

      {activeTab === 'Preferences' && <section className="room-tab-panel room-preferences-panel">
        <div className="room-tab-title"><span className="eyebrow">ROOM SETTINGS</span><h2>Preference</h2><p>Settings for this contest room.</p></div>
        <div className="room-preference-row"><div><b>Problem identity visibility</b><span>{hidden ? 'Currently hidden until the contest ends.' : 'Problem IDs and source labels are visible.'}</span></div><span className={`status-badge ${hidden ? 'upcoming' : 'running'}`}>{hidden ? 'Hidden' : 'Visible'}</span></div>
        <div className="room-preference-row"><div><b>Contest timer</b><span>Runs from the scheduled start and end time.</span></div><b>{formatDuration(contest.duration)}</b></div>
        <div className="room-preference-row"><div><b>Platform</b><span>{contest.platform}</span></div><b>{contest.division}</b></div>
      </section>}
    </div>
  );
}
