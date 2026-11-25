import React, { useEffect, useState } from 'react';
import { LayoutDashboard, UserRound, Trophy, Settings2, X, Save, ChevronDown } from 'lucide-react';

const WORKSPACE_KEY = 'contest-stack-workspace-name';

export default function Sidebar({ active, onChange }) {
  const items = [
    { id: 'contests', label: 'Contest stack', icon: LayoutDashboard },
    { id: 'profile', label: 'My profile', icon: UserRound }
  ];
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(() => {
    try { return localStorage.getItem(WORKSPACE_KEY) || 'My workspace'; }
    catch { return 'My workspace'; }
  });
  const [draftName, setDraftName] = useState(workspaceName);

  useEffect(() => setDraftName(workspaceName), [workspaceName]);

  const saveWorkspaceName = (event) => {
    event.preventDefault();
    const nextName = draftName.trim();
    if (!nextName) return;
    setWorkspaceName(nextName);
    try { localStorage.setItem(WORKSPACE_KEY, nextName); } catch (error) { console.warn('Could not save workspace name:', error); }
    setMenuOpen(false);
  };

  return (
    <header className="sidebar app-navigation">
      <div className="brand">
        <div className="brand-mark"><Trophy size={19} /></div>
        <div>
          <strong>contest<span>stack</span></strong>
          <small>YOUR PRACTICE SPACE</small>
        </div>
      </div>

      <nav className="side-nav" aria-label="Main navigation">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item ${active === id ? 'active' : ''}`}
            onClick={() => { onChange(id); setMenuOpen(false); }}
            aria-current={active === id ? 'page' : undefined}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
            {active === id && <i aria-hidden="true" />}
          </button>
        ))}
      </nav>

      <div className="workspace-wrap">
        <button
          className={`sidebar-bottom workspace-trigger ${menuOpen ? 'open' : ''}`}
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="mini-avatar">A</span>
          <span className="workspace-copy">
            <strong>{workspaceName}</strong>
            <small>Personal account</small>
          </span>
          <Settings2 size={17} className="muted-icon" />
          <ChevronDown size={13} className="workspace-chevron" />
        </button>
        {menuOpen && (
          <section className="workspace-menu" role="dialog" aria-label="Workspace settings">
            <div className="workspace-menu-head">
              <div><span className="eyebrow">WORKSPACE SETTINGS</span><b>Personal workspace</b></div>
              <button type="button" className="workspace-close" aria-label="Close workspace menu" onClick={() => setMenuOpen(false)}><X size={15} /></button>
            </div>
            <form onSubmit={saveWorkspaceName} className="workspace-edit-form">
              <label htmlFor="workspace-name">Workspace name</label>
              <input id="workspace-name" maxLength={32} value={draftName} onChange={(event) => setDraftName(event.target.value)} />
              <button type="submit" className="button primary" disabled={!draftName.trim() || draftName.trim() === workspaceName}><Save size={13} /> Save name</button>
            </form>
            <button type="button" className="workspace-menu-link" onClick={() => { onChange('profile'); setMenuOpen(false); }}><UserRound size={14} /> Open my profile</button>
            <p>Workspace settings are saved in this browser.</p>
          </section>
        )}
      </div>
    </header>
  );
}
