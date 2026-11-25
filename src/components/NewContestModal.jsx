import React, { useEffect, useMemo, useState } from 'react';
import { X, CalendarDays, Clock3, Zap, Plus, Minus, Check, Sparkles, Link2, LoaderCircle } from 'lucide-react';
import { ratingLevels } from '../data.js';
import { getProblemLetters } from '../utils/contest.js';
import { generateContestProblems } from '../services/problemGenerator.js';

const toLocalInput = (date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const divisionOptions = {
  Codeforces: ['Div. 1', 'Div. 2', 'Div. 3', 'Div. 4', 'Educational', 'Global Round'],
  AtCoder: ['ABC', 'ARC', 'AGC', 'AHC']
};

export default function NewContestModal({ onClose, onCreate, onSave, initialContest = null }) {
  const isEditing = Boolean(initialContest);
  const [title, setTitle] = useState(() => initialContest?.title || '');
  const [platform, setPlatform] = useState(() => initialContest?.platform || 'Codeforces');
  const [division, setDivision] = useState(() => initialContest?.division || 'Div. 3');
  const [era, setEra] = useState(() => initialContest?.era || 'Recent');
  const [level, setLevel] = useState(() => initialContest?.level || 'Any');
  // Problem identities are visible by default. Hiding them is an explicit host choice.
  const [showProblemInfo, setShowProblemInfo] = useState(() => initialContest ? initialContest.showProblemInfo !== false : true);
  const [immediate, setImmediate] = useState(() => Boolean(initialContest?.immediate));
  const [duration, setDuration] = useState(() => Number(initialContest?.duration || 120));
  const [startAt, setStartAt] = useState(() => toLocalInput(initialContest?.startAt ? new Date(initialContest.startAt) : new Date(Date.now() + 60 * 60 * 1000)));
  const [endAt, setEndAt] = useState(() => toLocalInput(initialContest?.endAt ? new Date(initialContest.endAt) : new Date(Date.now() + 3 * 60 * 60 * 1000)));
  const [problemCount, setProblemCount] = useState(() => Number(initialContest?.requestedProblemCount || initialContest?.problemCount || 6));
  const [selectedSlots, setSelectedSlots] = useState(() => initialContest?.selectedSlots || []);
  const [problems, setProblems] = useState(() => {
    const saved = initialContest?.manualProblems || [];
    return Array.from({ length: 12 }, (_, index) => saved[index] || '');
  });
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const manualSlots = useMemo(() => problems.flatMap((value, index) => value.trim() ? [String.fromCharCode(65 + index)] : []), [problems]);
  const visibleLetterCount = useMemo(() => {
    const lastSelected = Math.max(-1, ...selectedSlots.map((slot) => slot.charCodeAt(0) - 65));
    const lastManual = Math.max(-1, ...manualSlots.map((slot) => slot.charCodeAt(0) - 65));
    return Math.max(6, problemCount, lastSelected + 1, lastManual + 1);
  }, [problemCount, selectedSlots, manualSlots]);
  const letters = useMemo(() => getProblemLetters(visibleLetterCount), [visibleLetterCount]);
  const problemConfigChanged = useMemo(() => {
    if (!initialContest) return true;
    const originalSlots = [...(initialContest.selectedSlots || [])].sort().join(',');
    const currentSlots = [...selectedSlots].sort().join(',');
    const originalManual = Array.from({ length: 12 }, (_, index) => initialContest.manualProblems?.[index] || '').join('|');
    const currentManual = Array.from({ length: 12 }, (_, index) => problems[index] || '').join('|');
    return platform !== initialContest.platform
      || division !== initialContest.division
      || era !== (initialContest.era || 'Recent')
      || level !== (initialContest.level || 'Any')
      || Number(problemCount) !== Number(initialContest.requestedProblemCount || initialContest.problemCount || 6)
      || currentSlots !== originalSlots
      || currentManual !== originalManual;
  }, [initialContest, platform, division, era, level, problemCount, selectedSlots, problems]);

  useEffect(() => {
    if (!immediate && startAt) {
      const start = new Date(startAt);
      if (!Number.isNaN(start.getTime())) setEndAt(toLocalInput(new Date(start.getTime() + Number(duration) * 60000)));
    }
  }, [startAt, duration, immediate]);

  const changeProblemCount = (next) => {
    const count = Math.max(1, Math.min(12, next));
    setProblemCount(count);
  };

  const toggleSlot = (letter) => {
    setSelectedSlots((current) => current.includes(letter)
      ? current.filter((slot) => slot !== letter)
      : [...current, letter]);
    setError('');
  };

  const changeManualProblem = (index, value) => {
    setProblems((current) => current.map((item, i) => i === index ? value : item));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return setError('Add a title for this contest.');
    const start = immediate ? new Date() : new Date(startAt);
    const end = immediate ? new Date(start.getTime() + Number(duration) * 60000) : new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setError('Please provide valid start and end times.');
    if (end <= start) return setError('End time must be later than start time.');

    setGenerating(true);
    setError('');
    try {
      let generatedProblems;
      let generatedMeta = { selectedSlots: initialContest?.selectedSlots || [], generationMode: initialContest?.generationMode || 'existing' };

      // Editing title, dates, duration, or visibility should not silently replace a contest's problem set.
      // Only fetch a new set when the problem-generation settings themselves have changed.
      if (isEditing && !problemConfigChanged) {
        generatedProblems = initialContest.problemDetails?.length
          ? initialContest.problemDetails
          : (initialContest.problems || []).map((id, index) => ({
              id,
              index: initialContest.letters?.[index] || String.fromCharCode(65 + index),
              slot: initialContest.letters?.[index] || String.fromCharCode(65 + index),
              name: id,
              url: undefined
            }));
      } else {
        const generated = await generateContestProblems({
          platform,
          division,
          era,
          level,
          problemCount,
          selectedSlots,
          manualProblems: problems
        });
        generatedProblems = generated.problems;
        generatedMeta = generated;
      }

      if (!generatedProblems?.length) throw new Error('No problems were selected. Choose problem slots or use rating-based generation.');
      const actualCount = generatedProblems.length;
      const contestLetters = getProblemLetters(generatedProblems.length);
      generatedProblems = generatedProblems.map((problem) => ({ ...problem, index: String(problem.index || '').toUpperCase() }));
      const problemIds = generatedProblems.map((problem) => problem.id);
      const sameProblemSet = isEditing && problemIds.join('|') === (initialContest.problems || []).join('|');
      const contest = {
        ...(initialContest || {}),
        id: initialContest?.id || `contest-${Date.now()}`,
        title: title.trim(), platform, division, era, level, immediate,
        showProblemInfo,
        startAt: start.toISOString(), endAt: end.toISOString(), duration: Number(duration),
        problemCount: actualCount,
        requestedProblemCount: Number(problemCount),
        problems: problemIds,
        problemDetails: generatedProblems,
        letters: contestLetters,
        selectedSlots: generatedMeta.selectedSlots || selectedSlots,
        generationMode: generatedMeta.generationMode,
        manualProblems: problems,
        unsolved: sameProblemSet ? (initialContest.unsolved || []) : [],
        upsolved: sameProblemSet ? (initialContest.upsolved || []) : [],
        participants: initialContest?.participants || [],
        createdAt: initialContest?.createdAt || new Date().toISOString(),
        updatedAt: isEditing ? new Date().toISOString() : undefined
      };
      if (isEditing) onSave(contest);
      else onCreate(contest);
    } catch (generationError) {
      setError(generationError?.message || 'Could not generate the problem set. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !generating && onClose()}>
      <section className="modal-panel new-contest-panel" role="dialog" aria-modal="true" aria-labelledby="new-contest-title">
        <div className="modal-header"><div><span className="eyebrow">{isEditing ? 'UPDATE YOUR PRACTICE SESSION' : 'BUILD A PRACTICE SESSION'}</span><h2 id="new-contest-title">{isEditing ? 'Edit contest' : 'Create contest'}</h2><p>{isEditing ? 'Update the upcoming contest. Existing problems stay unchanged unless you modify the generation settings.' : 'Choose the filters. Add problem IDs only when you want to lock a specific question.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close" disabled={generating}><X size={19} /></button></div>
        <form onSubmit={submit} className="contest-form">
          <label className="field full"><span>Contest title <em>*</em></span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Div. 2 ladder — Pupil practice" autoFocus /></label>
          <div className="field-grid">
            <label className="field"><span>Platform <em>*</em></span><select value={platform} onChange={(e) => { setPlatform(e.target.value); setDivision(divisionOptions[e.target.value][0]); setProblems(Array(12).fill('')); }}><option>Codeforces</option><option>AtCoder</option></select></label>
            <label className="field"><span>{platform === 'Codeforces' ? 'Round type / division' : 'AtCoder contest type'}</span><select value={division} onChange={(e) => setDivision(e.target.value)}>{divisionOptions[platform].map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="field-grid">
            <label className="field"><span>Age tag</span><select value={era} onChange={(e) => setEra(e.target.value)}><option>Recent</option><option>Old</option></select><small className="field-note">Recent = last 365 days · Old = earlier contests</small></label>
            <label className="field"><span>Target rating level <small className="optional-inline">OPTIONAL</small></span><select value={level} onChange={(e) => setLevel(e.target.value)}><option value="Any">Any difficulty · No target filter</option>{ratingLevels.filter((item) => item.value !== 'Immediate start').map((item) => <option key={item.value} value={item.value}>{item.label} · {item.description}</option>)}</select><small className="field-note">Choose a level to narrow the difficulty. Leave as Any to use all matching problems{platform === 'AtCoder' ? ' (estimated AtCoder difficulty bands).' : '.'}</small></label>
          </div>
          <div className="field-grid schedule-grid">
            <label className="field"><span>Contest duration <em>*</em></span><select value={duration} onChange={(e) => setDuration(Number(e.target.value))}><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={90}>1 hour 30 minutes</option><option value={120}>2 hours</option><option value={150}>2 hours 30 minutes</option><option value={180}>3 hours</option><option value={240}>4 hours</option><option value={300}>5 hours</option><option value={360}>6 hours</option></select></label>
            <div className="immediate-toggle"><div className="toggle-copy"><Zap size={16} /><div><b>Immediate start</b><small>Start as soon as you create it</small></div></div><button type="button" role="switch" aria-checked={immediate} className={`switch ${immediate ? 'on' : ''}`} onClick={() => setImmediate(!immediate)}><span /></button></div>
          </div>
          <div className="field-grid">
            <label className="field"><span><CalendarDays size={13} /> Start date & time <em>*</em></span><input type="datetime-local" value={startAt} disabled={immediate} onChange={(e) => setStartAt(e.target.value)} /></label>
            <label className="field"><span><Clock3 size={13} /> End date & time <em>*</em></span><input type="datetime-local" value={endAt} disabled={immediate} onChange={(e) => setEndAt(e.target.value)} /></label>
          </div>
          {immediate && <div className="inline-hint"><Zap size={14} /> This contest will start when you press Create contest and end after {duration} minutes.</div>}

          <div className="immediate-toggle problem-visibility-toggle">
            <div className="toggle-copy"><Sparkles size={16} /><div><b>Show problem info during contest</b><small>{showProblemInfo ? 'Participants can see problem labels, IDs and links.' : 'Hide problem labels, IDs and links until the contest ends.'}</small></div></div>
            <button type="button" role="switch" aria-label="Show problem info during contest" aria-checked={showProblemInfo} className={`switch ${showProblemInfo ? 'on' : ''}`} onClick={() => setShowProblemInfo((value) => !value)}><span /></button>
          </div>

          <div className="problem-editor">
            <div className="problem-editor-head">
              <div><span className="field-title">Problem set <small className="optional-label">OPTIONAL CUSTOMIZATION</small></span><small>Choose allowed source indices (A, B, C…). This filters the pool; problem count stays independent. IDs are optional fixed questions.</small></div>
              <div className="count-stepper" aria-label="Number of problems"><button type="button" onClick={() => changeProblemCount(problemCount - 1)} disabled={problemCount <= 1}><Minus size={13} /></button><b>{problemCount}</b><button type="button" onClick={() => changeProblemCount(problemCount + 1)} disabled={problemCount >= 12}><Plus size={13} /></button></div>
            </div>
            <div className={`generation-guidance ${selectedSlots.length ? 'has-slots' : ''}`}>
              <Sparkles size={15} />
              <span>
                {selectedSlots.length
                  ? <><b>{selectedSlots.join(', ')}</b> are allowed problem indices · generate <b>{problemCount} problems total</b> from those positions.</>
                  : <>No position filter · generate <b>{problemCount} random problems</b> from any available index.</>}
                {manualSlots.length > 0 && <> <b>{manualSlots.length}</b> manually entered ID(s) will be fixed; the generator fills the remaining {Math.max(0, problemCount - manualSlots.length)}.</>}
                {' '}Platform, division and age filters always apply{level !== 'Any' ? ', along with the selected target rating.' : '. No target rating is required.'}
              </span>
            </div>
            <div className="problem-slot-grid">
              {letters.map((letter, index) => {
                const checked = selectedSlots.includes(letter);
                return (
                  <div className={`problem-slot ${checked ? 'selected' : ''}`} key={letter}>
                    <button type="button" className="slot-toggle" aria-pressed={checked} onClick={() => toggleSlot(letter)}><span className="slot-check">{checked && <Check size={12} />}</span><b>{letter}</b></button>
                    <input aria-label={`Optional problem ID for ${letter}`} value={problems[index] || ''} onChange={(e) => changeManualProblem(index, e.target.value)} placeholder={`Optional ID · ${platform === 'Codeforces' ? `1890${letter}` : `abc382_${letter.toLowerCase()}`}`} />
                    {problems[index]?.trim() && <span className="manual-lock"><Link2 size={11} /> Fixed ID</span>}
                  </div>
                );
              })}
            </div>
            {(selectedSlots.length > 0 || manualSlots.length > 0) && <button type="button" className="clear-slots" onClick={() => { setSelectedSlots([]); setProblems(Array(12).fill('')); }}>Clear position filters and manual IDs</button>}
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-footer"><span><em>*</em> Required fields</span><div><button type="button" className="button secondary" onClick={onClose} disabled={generating}>Cancel</button><button className="button primary" type="submit" disabled={generating}>{generating ? <><LoaderCircle size={15} className="spin" /> {isEditing ? 'Saving changes…' : 'Generating problems…'}</> : isEditing ? <>{problemConfigChanged ? 'Regenerate & save' : 'Save changes'} <Check size={15} /></> : <>Generate & create <Sparkles size={15} /></>}</button></div></div>
        </form>
      </section>
    </div>
  );
}
