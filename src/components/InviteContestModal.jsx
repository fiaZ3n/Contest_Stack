import React, { useMemo, useState } from 'react';
import { X, Link2, Copy, KeyRound, ShieldCheck, Users } from 'lucide-react';

const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const makePassword = () => Math.random().toString(36).slice(2, 10);

export default function InviteContestModal({ contest, invitation, onClose, onSave }) {
  const [code] = useState(invitation?.code || makeCode());
  const [password, setPassword] = useState(invitation?.password || makePassword());
  const [copied, setCopied] = useState('');
  const shareUrl = useMemo(() => `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(code)}`, [code]);
  const isSaved = invitation?.code === code && invitation?.password === password;

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopied('Clipboard unavailable');
    }
  };

  const save = () => {
    if (!password.trim()) return;
    onSave({ code, password: password.trim(), createdAt: invitation?.createdAt || new Date().toISOString() });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-panel invite-modal" role="dialog" aria-modal="true" aria-labelledby="invite-title">
        <div className="modal-header"><div><span className="eyebrow">PRIVATE CONTEST ROOM</span><h2 id="invite-title">Invite friends</h2><p>Share this contest with friends using a link or an access code.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        <div className="invite-content">
          <div className="invite-contest-name"><Users size={16} /><div><b>{contest.title}</b><small>{contest.platform} · {contest.division}</small></div></div>
          <label className="field"><span><KeyRound size={13} /> Contest password</span><input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Set an access password" /></label>
          <div className="invite-credentials">
            <div><span>CONTEST CODE</span><strong>{code}</strong><button disabled={!isSaved} onClick={() => copy(code, 'Code copied')}><Copy size={13} /> Copy code</button></div>
            <div><span>INVITE LINK</span><strong className="invite-url">{shareUrl}</strong><button disabled={!isSaved} onClick={() => copy(shareUrl, 'Link copied')}><Link2 size={13} /> Copy link</button></div>
          </div>
          <div className="inline-hint"><ShieldCheck size={14} /> Friends need both the contest code (or link) and password to join. Save the invitation to enable sharing.</div>
          <div className="prototype-note">Prototype note: invitations are saved in this browser only. To let friends join from other devices, this project needs a shared backend and database.</div>
          {copied && <div className="copy-feedback">{copied}</div>}
          <div className="modal-footer"><span>Share the password privately.</span><div><button className="button secondary" disabled={!isSaved} onClick={() => copy(password, 'Password copied') }><Copy size={14} /> Copy password</button><button className="button primary" onClick={save} disabled={!password.trim() || isSaved}>{isSaved ? 'Invitation saved' : 'Save invitation'}</button></div></div>
        </div>
      </section>
    </div>
  );
}
