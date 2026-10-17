'use client';

import { useState } from 'react';
import Brand from '@/components/Brand';

const CODE = 'K7Q2M9';

export default function LauncherPreview() {
  const [tab, setTab] = useState('link');

  return (
    <div className="container page">
      <header className="page-head">
        <span className="eyebrow">XBOX LAUNCHER</span>
        <h1>The console side.</h1>
        <p>
          Browser preview of the Project Zero Xbox shell. The real UWP package handles linking, local content
          verification and the client handoff on the console.
        </p>
      </header>

      <div className="tv-tabs" style={{ marginTop: 32, marginBottom: 14 }}>
        <button type="button" className={tab === 'link' ? 'active' : ''} onClick={() => setTab('link')}>Link screen</button>
        <button type="button" className={tab === 'handoff' ? 'active' : ''} onClick={() => setTab('handoff')}>Client handoff</button>
      </div>

      <div className="tv">
        <div className="tv-bg" />
        <div className="tv-top">
          <Brand size={34} />
          <span className="mono muted" style={{ fontSize: 9, letterSpacing: '.12em' }}>XBOX DEV MODE · x64</span>
        </div>

        {tab === 'link' ? (
          <>
            <div className="tv-body">
              <div>
                <span className="eyebrow">CONSOLE LINK</span>
                <div className="tv-code">{CODE}</div>
                <div className="tv-url">project-zero-delta.vercel.app/link</div>
                <div style={{ marginTop: 28, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className="tag">WAITING FOR CLAIM</span>
                </div>
                <div className="progress"><i /></div>
                <div className="launch-log">
                  <div>CODE WINDOW <b>15:00</b></div>
                  <div>CONTROL PLANE <b>CONNECTED</b></div>
                  <div>BUILD TARGET <b>7.00 / CL-4629139</b></div>
                </div>
              </div>
              <div>
                <div className="tv-qr">
                  <img src="/api/qr?data=https%3A%2F%2Fproject-zero-delta.vercel.app%2Flink" alt="Project Zero link QR" style={{ objectFit: 'contain' }} />
                </div>
                <p className="tv-url" style={{ marginTop: 12, textAlign: 'center' }}>Scan or type the code</p>
              </div>
            </div>
            <div className="tv-foot">
              <span><span className="key">A</span> Refresh</span>
              <span><span className="key">B</span> Back</span>
              <span>PROJECT ZERO · ONLINE</span>
            </div>
          </>
        ) : (
          <>
            <div className="tv-body">
              <div>
                <span className="eyebrow">SESSION READY</span>
                <div className="tv-code" style={{ fontSize: 48, letterSpacing: '.02em' }}>PLAYER</div>
                <div className="tv-url">SEASON 7 · 7.00 · CL-4629139</div>
                <div className="launch-log" style={{ marginTop: 26 }}>
                  <div>PROFILE MOUNTED <b>OK</b></div>
                  <div>CONTENT MANIFEST <b>VERIFIED</b></div>
                  <div>GAME TICKET <b>READY</b></div>
                  <div>HANDOFF <b>projectzero-game://launch</b></div>
                </div>
                <div className="progress"><i style={{ width: '72%' }} /></div>
              </div>
              <aside className="panel side-panel" style={{ background: 'rgba(10,12,17,.78)' }}>
                <span className="eyebrow dim">CLIENT</span>
                <div className="kv"><span>Target</span><b>7.00</b></div>
                <div className="kv"><span>CL</span><b>4629139</b></div>
                <div className="kv"><span>Platform</span><b>UWP · x64</b></div>
                <div className="kv"><span>Protocol</span><b>projectzero-game</b></div>
                <p className="note" style={{ marginTop: 18 }}>The preview stops at the handoff boundary; actual client/runtime work runs in the Xbox package.</p>
              </aside>
            </div>
            <div className="tv-foot">
              <span><span className="key">A</span> Retry handoff</span>
              <span><span className="key">B</span> Unlink</span>
              <span>SEASON 7 · 7.00</span>
            </div>
          </>
        )}
      </div>

      <p className="note" style={{ marginTop: 18 }}>
        Visual reference only. The compiled Xbox project is built separately from the website.
      </p>
    </div>
  );
}
