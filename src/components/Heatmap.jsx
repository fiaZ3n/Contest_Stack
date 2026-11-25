import React, { useMemo } from 'react';

const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function Heatmap({ contests }) {
  const { cells, total, activeDays } = useMemo(() => {
    const activity = new Map();
    contests.forEach((contest) => {
      const endedDate = new Date(contest.endAt);
      if (endedDate <= new Date()) {
        const key = dateKey(endedDate);
        activity.set(key, (activity.get(key) || 0) + 1);
      }
      (contest.upsolved || []).forEach(() => {
        const key = dateKey(new Date(contest.createdAt));
        activity.set(key, (activity.get(key) || 0) + 1);
      });
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 363);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const data = [];
    let sum = 0;
    let active = 0;
    for (let i = 0; i < 371; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const count = activity.get(dateKey(date)) || 0;
      sum += count;
      if (count) active += 1;
      data.push({ date, count, key: dateKey(date) });
    }
    return { cells: data, total: sum, activeDays: active };
  }, [contests]);

  const months = cells.filter((cell) => cell.date.getDate() <= 7).map((cell) => ({ key: `${cell.date.getFullYear()}-${cell.date.getMonth()}`, label: cell.date.toLocaleString(undefined, { month: 'short' }), week: Math.floor(cells.indexOf(cell) / 7) }));
  return (
    <section className="panel heatmap-panel">
      <div className="section-heading"><div><span className="eyebrow">CONSISTENCY</span><h2>Activity map</h2><p>Your contest and upsolving activity over the last year.</p></div><div className="heatmap-total"><strong>{total}</strong><span>activity points</span></div></div>
      <div className="heatmap-scroll"><div className="heatmap-months"><div className="day-label-spacer" />{Array.from({ length: 53 }, (_, week) => <span key={week}>{months.find((m) => m.week === week)?.label || ''}</span>)}</div><div className="heatmap-body"><div className="day-labels">{DAYS.map((day, index) => <span key={index}>{day}</span>)}</div><div className="heatmap-grid">{cells.map(({ date, count, key }) => <div key={key} className={`heat-cell level-${Math.min(count, 4)}`} title={`${count} activity ${count === 1 ? 'point' : 'points'} on ${date.toLocaleDateString()}`} />)}</div></div></div>
      <div className="heatmap-legend"><span>{activeDays} active days</span><div className="legend-scale"><small>Less</small>{[0, 1, 2, 3, 4].map((level) => <i className={`heat-cell level-${level}`} key={level} />)}<small>More</small></div><span>Last 12 months</span></div>
    </section>
  );
}
