'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AccountPage() {
  const [state, setState] = useState('loading');
  const [account, setAccount] = useState(null);
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = window.localStorage.getItem('pz_token');
    if (!token) {
      setState('anon');
      return;
    }
    fetch('/api/me', { headers: { authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Session expired');
        setAccount(data.account);
        setDevices(data.devices || []);
        setState('ready');
      })
      .catch((err) => {
        setError(err.message);
        setState('anon');
      });
  }, []);

  function signOut() {
    window.localStorage.removeItem('pz_token');
    setAccount(null);
    setDevices([]);
    setState('anon');
  }

  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">Identity</span>
        <h1>Account</h1>
        <p>The Project Zero identity bound to your console. Web sign-in lives in this browser only.</p>
      </div>

      {state === 'loading' ? <div className="panel side-panel" style={{ marginTop: 32 }}>Reading session…</div> : null}

      {state === 'anon' ? (
        <div className="panel side-panel" style={{ marginTop: 32, maxWidth: 620 }}>
          <div className="alert">{error || 'No account is signed in on this browser.'}</div>
          <p className="note">
            Accounts are created during console linking. Start with the code on the TV, then come back here.
          </p>
          <Link href="/link" className="btn btn-primary" style={{ marginTop: 20 }}>
            Link a console
          </Link>
        </div>
      ) : null}

      {state === 'ready' && account ? (
        <div className="account-grid">
          <div className="panel side-panel">
            <span className="eyebrow dim">Project Zero ID</span>
            <div className="big-name">{account.username}</div>
            <span className="tag live">Active</span>
            <div className="rule" />
            <div className="kv">
              <span>Account no.</span>
              <b>#{String(account.accountNo || 0).padStart(5, '0')}</b>
            </div>
            <div className="kv">
              <span>Email</span>
              <b>{account.email}</b>
            </div>
            <div className="kv">
              <span>Created</span>
              <b>{new Date(account.createdAt).toLocaleDateString('en-GB')}</b>
            </div>
            <div style={{ marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={signOut} type="button">
                Sign out
              </button>
            </div>
          </div>

          <div className="panel side-panel">
            <span className="eyebrow dim">Linked hardware</span>
            {devices.length ? (
              devices.map((device) => (
                <div className="device-row" key={device.id}>
                  <div>
                    <b>{device.name || 'Xbox console'}</b>
                    <div className="muted mono" style={{ fontSize: 10, marginTop: 4 }}>
                      {device.platform} · launcher {device.app_version || 'unknown'}
                    </div>
                  </div>
                  <span>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString('en-GB') : '—'}</span>
                </div>
              ))
            ) : (
              <p className="note" style={{ marginTop: 16 }}>
                No console session recorded yet. It appears here after the launcher completes a link.
              </p>
            )}
            <div className="rule" />
            <p className="note">
              A console token is issued to the device on claim. Game tickets are minted per handoff and expire
              after ten minutes.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
