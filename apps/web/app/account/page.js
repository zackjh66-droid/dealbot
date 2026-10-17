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
      <header className="page-head">
        <span className="eyebrow">ACCOUNT</span>
        <h1>Your Project Zero ID.</h1>
        <p>
          This is the identity linked to your Xbox launcher. It is a Project Zero account, separate from any
          Epic Games account, and the browser session is stored only on this device.
        </p>
      </header>

      {state === 'loading' ? (
        <div className="panel side-panel" style={{ marginTop: 34, maxWidth: 620 }}>Reading your session…</div>
      ) : null}

      {state === 'anon' ? (
        <div className="panel side-panel" style={{ marginTop: 34, maxWidth: 620 }}>
          <span className="eyebrow dim">NOT LINKED</span>
          <h2 className="display" style={{ fontSize: 30, marginTop: 12 }}>No account in this browser.</h2>
          {error ? <div className="alert" style={{ marginTop: 18 }}>{error}</div> : null}
          <p className="note" style={{ marginTop: 16 }}>
            Start with the six-character code shown by the Xbox launcher. After the console is claimed, your
            account and linked hardware appear here.
          </p>
          <Link href="/link" className="btn btn-primary" style={{ marginTop: 20 }}>Link a console</Link>
        </div>
      ) : null}

      {state === 'ready' && account ? (
        <div className="account-grid">
          <section className="panel side-panel">
            <span className="eyebrow dim">PROJECT ZERO ID</span>
            <div className="big-name">{account.username}</div>
            <span className="tag live">Active</span>
            <div className="rule" />
            <div className="kv"><span>Account no.</span><b>#{String(account.accountNo || 0).padStart(5, '0')}</b></div>
            <div className="kv"><span>Email</span><b>{account.email}</b></div>
            <div className="kv"><span>Created</span><b>{new Date(account.createdAt).toLocaleDateString('en-GB')}</b></div>
            <button className="btn btn-ghost" onClick={signOut} type="button" style={{ marginTop: 24 }}>Sign out</button>
          </section>

          <section className="panel side-panel">
            <span className="eyebrow dim">LINKED XBOX</span>
            {devices.length ? devices.map((device) => (
              <div className="device-row" key={device.id}>
                <div>
                  <b>{device.name || 'Xbox console'}</b>
                  <div className="muted mono" style={{ fontSize: 10, marginTop: 5 }}>
                    {device.platform} · launcher {device.app_version || 'unknown'}
                  </div>
                </div>
                <span>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString('en-GB') : '—'}</span>
              </div>
            )) : (
              <p className="note" style={{ marginTop: 16 }}>
                No linked console has checked in yet. It will appear here after the launcher completes a link.
              </p>
            )}
            <div className="rule" />
            <p className="note">Console sessions and short-lived game handoff tickets are issued separately from the website login.</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
