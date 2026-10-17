'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const STORE_KEY = 'pz_token';

export default function LinkClient() {
  const params = useSearchParams();
  const startCode = (params.get('code') || '').toUpperCase();
  const [code, setCode] = useState(startCode);
  const [stage, setStage] = useState('code');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [account, setAccount] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = useMemo(() => {
    if (!expiresAt) return null;
    const ms = new Date(expiresAt).getTime() - now;
    if (ms <= 0) return 'expired';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [expiresAt, now]);

  async function checkCode(event) {
    if (event) event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/link/inspect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!data.valid) {
        const reasons = {
          unknown: 'No Xbox is currently showing that code.',
          claimed: 'That code has already been used.',
          expired: 'That code expired. Refresh the launcher for a new one.',
          format: 'The code must be six characters.'
        };
        setError(reasons[data.reason] || 'That code is not active.');
        return;
      }
      setExpiresAt(data.expiresAt);
      setStage('signup');
    } catch {
      setError('Project Zero could not reach the linking service. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function claimAccount(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/link/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, email, username })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create the account.');
        return;
      }
      window.localStorage.setItem(STORE_KEY, data.token);
      setAccount(data.account);
      setStage('done');
    } catch {
      setError('Project Zero could not reach the linking service. Try again.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (startCode && startCode.length === 6) checkCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container page">
      <header className="page-head">
        <span className="eyebrow">CONSOLE LINK</span>
        <h1>Link your Xbox.</h1>
        <p>
          Open Project Zero on the console and type the six-character code shown on your TV. The website only
          handles the account and device handshake; the launcher keeps the Xbox session.
        </p>
      </header>

      <div className="flow-grid">
        <section className="panel form-panel">
          {stage === 'code' ? (
            <form onSubmit={checkCode}>
              <div className="form-step"><b>01</b><span>Enter the TV code</span></div>
              {error ? <div className="alert">{error}</div> : null}
              <div className="field">
                <label htmlFor="code">Six-character code</label>
                <input
                  id="code"
                  className="code-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="——————"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck="false"
                  inputMode="text"
                  maxLength={6}
                />
                <div className="field-hint">Shown by the Project Zero Xbox launcher.</div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={busy || code.length !== 6}>
                {busy ? 'Checking…' : 'Continue'}
              </button>
            </form>
          ) : null}

          {stage === 'signup' ? (
            <form onSubmit={claimAccount}>
              <div className="form-step"><b>02</b><span>Create the Project Zero identity</span></div>
              {error ? <div className="alert">{error}</div> : null}
              <div className="alert gold">
                Xbox <strong className="mono">{code}</strong> is ready.{' '}
                {remaining && remaining !== 'expired' ? (
                  <span className="timer">Expires in {remaining}</span>
                ) : (
                  <span className="timer">Expired — refresh the launcher.</span>
                )}
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" autoComplete="email" required />
              </div>
              <div className="field">
                <label htmlFor="username">Display name</label>
                <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="3-20 characters" autoComplete="username" maxLength={20} required />
                <div className="field-hint">Letters, numbers and underscore. This is the name Project Zero gives the client.</div>
              </div>
              <div className="spread">
                <button className="btn btn-ghost" type="button" onClick={() => setStage('code')}>Back</button>
                <button className="btn btn-primary" type="submit" disabled={busy || remaining === 'expired'}>{busy ? 'Creating…' : 'Create account'}</button>
              </div>
            </form>
          ) : null}

          {stage === 'done' ? (
            <div>
              <div className="success-mark">✓</div>
              <div className="form-step"><b>03</b><span>Linked</span></div>
              <h2 className="display" style={{ fontSize: 34, marginBottom: 10 }}>Xbox linked.</h2>
              <p className="note">
                Leave the launcher open. It polls for the claim, receives the console session and continues to
                the Season 7 client handoff.
              </p>
              <div className="rule" />
              <div className="kv"><span>Username</span><b>{account?.username}</b></div>
              <div className="kv"><span>Account no.</span><b>#{String(account?.accountNo || 0).padStart(5, '0')}</b></div>
              <div className="kv"><span>Email</span><b>{account?.email}</b></div>
              <Link href="/account" className="btn btn-primary" style={{ marginTop: 24 }}>Open account</Link>
            </div>
          ) : null}
        </section>

        <aside className="panel side-panel">
          <span className="eyebrow dim">HANDSHAKE</span>
          <div className="kv"><span>Code window</span><b>15 minutes</b></div>
          <div className="kv"><span>Binding</span><b>One Xbox per code</b></div>
          <div className="kv"><span>Target</span><b>Season 7 · 7.00</b></div>
          <div className="kv"><span>Build</span><b>CL-4629139</b></div>
          <p className="note" style={{ marginTop: 20 }}>
            This creates a Project Zero identity only. It does not create or replace an Epic Games account.
          </p>
        </aside>
      </div>
    </div>
  );
}
