import React from 'react';
import { Award, CalendarCheck, CheckCircle2, Flame, Trophy } from 'lucide-react';
import Heatmap from './Heatmap.jsx';
import { getStats } from '../utils/contest.js';

export default function ProfilePage({ contests }) {
  const stats = getStats(contests);
  const solved = contests.reduce((sum, contest) => sum + Math.max(0, (contest.problemCount || 0) - (contest.unsolved?.length || 0) - (contest.upsolved?.length || 0)), 0);
  return (
    <div className="profile-page">
      <div className="page-heading"><div><span className="eyebrow">YOUR PROGRESS</span><h1>My profile</h1><p>A quick look at your consistency and contest history.</p></div></div>
      <section className="profile-hero panel">
        <div className="profile-avatar">A</div><div className="profile-identity"><h2>Your profile</h2><p>Competitive programmer <span>·</span> Personal workspace</p><div className="profile-tags"><span>Codeforces practice</span><span>AtCoder practice</span><span>Problem solving</span></div></div>
        <div className="profile-since"><span>PROFILE</span><b>Personal workspace</b></div>
      </section>
      <div className="profile-stat-grid">
        <div className="profile-stat panel"><div className="profile-stat-icon violet"><Trophy size={18} /></div><div><strong>{stats.total}</strong><span>Contests created</span></div></div>
        <div className="profile-stat panel"><div className="profile-stat-icon green"><CalendarCheck size={18} /></div><div><strong>{stats.finished}</strong><span>Contests completed</span></div></div>
        <div className="profile-stat panel"><div className="profile-stat-icon blue"><CheckCircle2 size={18} /></div><div><strong>{solved + stats.upsolved}</strong><span>Problems solved / upsolved</span></div></div>
        <div className="profile-stat panel"><div className="profile-stat-icon amber"><Flame size={18} /></div><div><strong>{stats.upsolved}</strong><span>Problems upsolved</span></div></div>
      </div>
      <Heatmap contests={contests} />
      <section className="panel history-panel"><div className="section-heading"><div><span className="eyebrow">YOUR COLLECTION</span><h2>Contest history</h2><p>Every contest you have added to your stack.</p></div><span className="history-total">{contests.length} total</span></div>
        <div className="history-list">{contests.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((contest) => <div className="history-row" key={contest.id}><div className={`history-platform ${contest.platform === 'AtCoder' ? 'atcoder' : ''}`}>{contest.platform === 'AtCoder' ? 'At' : 'CF'}</div><div className="history-name"><b>{contest.title}</b><span>{contest.platform} · {contest.division}</span></div><div className="history-problems">{contest.problemCount} problems</div><div className="history-status">{new Date(contest.endAt) <= new Date() ? 'Completed' : 'Upcoming'}</div></div>)}</div>
      </section>
    </div>
  );
}
