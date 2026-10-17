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
          unknown: 'No console is showing that code.',
          claimed: 'That console is already linked to an account.',
          expired: 'That code timed out. Refresh the launcher for a new one.',
          format: 'Codes are six characters.'
        };
        setError(reasons[data.reason] || 'That code is not active.');
        return;
      }
      setExpiresAt(data.expiresAt);
      setStage('signup');
    } catch {
      setError('Control plane unreachable. Try again.');
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
      setError('Control plane unreachable. Try again.');
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
      <div className="page-head">
        <span className="eyebrow">Console link</span>
        <h1>Bind the box</h1>
        <p>
          The launcher is showing a six character code. Enter it below, then create the account the client
          will boot into. Nobody needs a controller for this part.
        </p>
      </div>

      <div className="flow-grid">
        <div className="panel form-panel">
          {stage === 'code' ? (
            <form onSubmit={checkCode}>
              <div className="form-step">
                <b>01</b>
                <span>Console code</span>
              </div>
              {error ? <div className="alert">{error}</div> : null}
              <div className="field">
                <label htmlFor="code">Six character link code</label>
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
                <div className="field-hint">Shown on the TV by the Project Zero launcher.</div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={busy || code.length !== 6}>
                {busy ? 'Checking…' : 'Continue'}
              </button>
            </form>
          ) : null}

          {stage === 'signup' ? (
            <form onSubmit={claimAccount}>
              <div className="form-step">
                <b>02</b>
                <span>Account details</span>
              </div>
              {error ? <div className="alert">{error}</div> : null}
              <div className="alert gold">
                Console <strong className="mono">{code}</strong> is live.{' '}
                {remaining && remaining !== 'expired' ? (
                  <span className="timer">Expires in {remaining}</span>
                ) : (
                  <span className="timer">Expired — refresh the launcher.</span>
                )}
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="3-20 characters"
                  autoComplete="username"
                  maxLength={20}
                  required
                />
                <div className="field-hint">Letters, numbers and underscore. This is the name the client uses.</div>
              </div>
              <div className="spread" style={{ gap: 12 }}>
                <button className="btn btn-ghost" type="button" onClick={() => setStage('code')}>
                  Back
                </button>
                <button className="btn btn-primary" type="submit" disabled={busy || remaining === 'expired'}>
                  {busy ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </form>
          ) : null}

          {stage === 'done' ? (
            <div>
              <div className="success-mark">Z</div>
              <div className="form-step">
                <b>03</b>
                <span>Linked</span>
              </div>
              <h2 className="display" style={{ fontSize: 30, marginBottom: 8 }}>
                Console claimed
              </h2>
              <p className="note">
                The launcher is polling and will pick this up within five seconds. Leave the console on this
                screen. The client boots straight after the session ticket is minted.
              </p>
              <div className="rule" />
              <div className="kv">
                <span>Username</span>
                <b>{account?.username}</b>
              </div>
              <div className="kv">
                <span>Account no.</span>
                <b>#{String(account?.accountNo || 0).padStart(5, '0')}</b>
              </div>
              <div className="kv">
                <span>Email</span>
                <b>{account?.email}</b>
              </div>
              <div style={{ marginTop: 24 }}>
                <Link href="/account" className="btn btn-primary">
                  Open account
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <div className="panel side-panel">
          <span className="eyebrow dim">Handshake rules</span>
          <div className="kv">
            <span>Code window</span>
            <b>15 minutes</b>
          </div>
          <div className="kv">
            <span>Binding</span>
            <b>1 console / code</b>
          </div>
          <div className="kv">
            <span>Session</span>
            <b>Console token</b>
          </div>
          <div className="kv">
            <span>Client</span>
            <b>Season 6 / 7</b>
          </div>
          <p className="note" style={{ marginTop: 20 }}>
            Creating the account here does not create an Epic Games account. It is a Project Zero identity,
            local to this workspace and the console that claimed it.
          </p>
        </div>
      </div>
    </div>
  );
}
