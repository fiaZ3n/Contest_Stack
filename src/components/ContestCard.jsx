import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, ChevronDown, ChevronUp, ExternalLink, Flag, CircleCheck, CircleDashed, Target, UserPlus, Users, Pencil, Play } from 'lucide-react';
import { formatDateTime, formatDuration, getProblemLetters, isEnded } from '../utils/contest.js';

export default function ContestCard({ contest, onUpdateResult, onInvite, onEdit, onEnter }) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const ended = isEnded(contest, new Date(now));
  const started = new Date(contest.startAt).getTime() <= now;
  const status = ended ? 'Ended' : started ? 'In progress' : 'Upcoming';
  const canEdit = !started && !ended;
  const hideProblemInfo = contest.showProblemInfo === false && !ended;
  const unsolved = contest.unsolved || [];
  const upsolved = contest.upsolved || [];
  const problemList = (contest.problems || []).length ? contest.problems : (contest.letters || []).map((letter) => letter);
  const labels = getProblemLetters(problemList.length);
  const problemDetails = new Map((contest.problemDetails || []).map((problem) => [problem.id, problem]));
  const problemEntries = useMemo(() => problemList.map((id, index) => ({
    id,
    label: labels[index] || String.fromCharCode(65 + index),
    detail: problemDetails.get(id) || (contest.problemDetails || [])[index] || null
  })), [problemList, labels, contest.problemDetails]);

  const setProblemStatus = (problem, nextStatus) => {
    const nextUnsolved = unsolved.filter((item) => item !== problem);
    const nextUpsolved = upsolved.filter((item) => item !== problem);
    if (nextStatus === 'unsolved') nextUnsolved.push(problem);
    if (nextStatus === 'upsolved') nextUpsolved.push(problem);
    onUpdateResult(contest.id, { unsolved: nextUnsolved, upsolved: nextUpsolved });
  };

  return (
    <article className="contest-card">
      <div className="contest-card-main">
        <div className={`platform-mark ${contest.platform === 'AtCoder' ? 'atcoder' : 'codeforces'}`}>{contest.platform === 'AtCoder' ? 'At' : 'CF'}</div>
        <div className="contest-info">
          <div className="contest-title-row"><h3>{contest.title}</h3><span className={`status-badge ${ended ? 'ended' : started ? 'running' : 'upcoming'}`}>{status}</span></div>
          <div className="contest-metadata">
            <span><CalendarDays size={13} /> {formatDateTime(contest.startAt)}</span>
            <span><Clock3 size={13} /> {formatDuration(contest.duration)}</span>
            <span><Target size={13} /> {contest.level && contest.level !== 'Any' ? contest.level : 'Any difficulty'}</span>
          </div>
          <div className="tag-row">
            <span className="tag platform-tag">{contest.platform}</span>
            <span className="tag">{contest.division}</span>
            <span className={`tag ${contest.era === 'Recent' ? 'recent-tag' : 'old-tag'}`}>{contest.era || 'Recent'}</span>
            {contest.immediate && <span className="tag live-tag"><i /> Immediate start</span>}
            <span className="tag">{contest.problemCount} problems</span>
            {(contest.participants || []).length > 0 && <span className="tag participant-tag"><Users size={11} /> {(contest.participants || []).length} joined</span>}
            {labels.map((letter) => <span className="letter-tag" key={letter}>{letter}</span>)}
          </div>
          {problemEntries.length > 0 && (
            <div className="problem-preview">
              <span>{hideProblemInfo ? 'PROBLEMS' : 'PROBLEM LABELS'}</span>
              {problemEntries.slice(0, 12).map(({ id, label, detail }) => {
                if (hideProblemInfo) return <span key={`${label}-${id}`} className="problem-chip hidden-problem-chip">Problem {label}</span>;
                const sourceIndex = String(detail?.index || '').toUpperCase();
                const source = sourceIndex ? `${contest.platform === 'Codeforces' ? 'CF' : 'AtCoder'} ${sourceIndex}` : String(id).toUpperCase();
                const content = <><b className="problem-chip-letter">{label}</b><span>{source}</span></>;
                return detail?.url
                  ? <a key={`${label}-${id}`} className="problem-chip alpha-problem-chip" href={detail.url} target="_blank" rel="noreferrer" title={detail.name || String(id)}>{content}</a>
                  : <span key={`${label}-${id}`} className="problem-chip alpha-problem-chip">{content}</span>;
              })}
            </div>
          )}
        </div>
        <button className="expand-button" aria-label={expanded ? 'Collapse contest' : 'Expand contest'} onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
      </div>

      {expanded && (
        <div className="contest-expanded">
          <div className="expanded-meta"><span><b>Starts</b>{formatDateTime(contest.startAt)}</span><span><b>Ends</b>{formatDateTime(contest.endAt)}</span><span><b>Duration</b>{formatDuration(contest.duration)}</span><span><b>Target</b>{contest.level && contest.level !== 'Any' ? contest.level : 'Any difficulty'}</span></div>
          {ended ? (
            <div className="results-block">
              <div className="results-heading"><div><h4>Unsolved and upsolved problems</h4><p>Update each problem as you finish reviewing it.</p></div><div className="result-counts"><span className="unsolved-count">{unsolved.length} unsolved</span><span className="upsolved-count">{upsolved.length} upsolved</span></div></div>
              <div className="result-list">
                {problemEntries.map(({ id, label, detail }) => {
                  const value = unsolved.includes(id) ? 'unsolved' : upsolved.includes(id) ? 'upsolved' : 'solved';
                  const identity = detail?.index ? `${contest.platform === 'Codeforces' ? 'CF' : 'AtCoder'} ${String(detail.index).toUpperCase()}` : String(id).toUpperCase();
                  return (
                    <div className="result-row" key={`${label}-${id}`}>
                      <span className="result-problem"><b>{label}</b><span>{identity}</span></span>
                      <div className="result-actions">
                        <button className={value === 'solved' ? 'selected solved' : ''} onClick={() => setProblemStatus(id, 'solved')}><CircleCheck size={13} /> Solved</button>
                        <button className={value === 'unsolved' ? 'selected unsolved' : ''} onClick={() => setProblemStatus(id, 'unsolved')}><CircleDashed size={13} /> Unsolved</button>
                        <button className={value === 'upsolved' ? 'selected upsolved' : ''} onClick={() => setProblemStatus(id, 'upsolved')}><Flag size={13} /> Upsolved</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : <div className="not-ended-note"><Clock3 size={16} /> {hideProblemInfo ? 'Problem identities are hidden until this contest ends.' : 'Results tracking becomes available after this contest ends.'}</div>}
        </div>
      )}
      <div className="contest-card-footer">
        <span>{contest.platform === 'Codeforces' ? 'CODEFORCES' : 'ATCODER'} <b>·</b> {contest.division}</span>
        <div className="contest-footer-actions">
          {canEdit && <button className="edit-contest-action" onClick={onEdit}><Pencil size={13} /> Edit contest</button>}
          <button className="invite-action" onClick={onInvite}><UserPlus size={13} /> Invite friends</button>
          <button className="enter-contest-action" onClick={onEnter}><Play size={13} /> Enter contest</button>
          <button onClick={() => setExpanded(!expanded)}>{expanded ? 'Close details' : ended ? 'View results' : 'View details'} <ExternalLink size={13} /></button>
        </div>
      </div>
    </article>
  );
}
