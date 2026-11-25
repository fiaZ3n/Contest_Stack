import React, { useState } from 'react';
import { X, KeyRound, Link2, UserPlus, LockKeyhole } from 'lucide-react';

export default function JoinContestModal({ initialCode = '', onClose, onJoin }) {
  const [code, setCode] = useState(initialCode);
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    const result = onJoin({ code: code.trim().toUpperCase(), password, displayName: displayName.trim() });
    setMessage(result.message);
    setSuccess(result.ok);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-panel join-modal" role="dialog" aria-modal="true" aria-labelledby="join-title">
        <div className="modal-header"><div><span className="eyebrow">JOIN A PRIVATE ROOM</span><h2 id="join-title">Join contest</h2><p>Enter the invitation code and password shared by your friend.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        <form className="contest-form" onSubmit={submit}>
          <label className="field"><span><KeyRound size={13} /> Contest code</span><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="e.g. K8P2QX" required /></label>
          <label className="field"><span><LockKeyhole size={13} /> Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter contest password" required /></label>
          <label className="field"><span><UserPlus size={13} /> Your display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="How friends will see you" required /></label>
          {message && <div className={success ? 'join-success' : 'form-error'}>{message}</div>}
          <div className="prototype-note">This prototype can only find invitations saved in the same browser. Cross-device joining becomes available after a backend is connected.</div>
          <div className="modal-footer"><span><Link2 size={12} /> You can also open a friend's invite link.</span><div><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" type="submit">Join contest</button></div></div>
        </form>
      </section>
    </div>
  );
}
