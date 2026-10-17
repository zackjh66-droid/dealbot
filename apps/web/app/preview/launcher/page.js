'use client';

import { useState } from 'react';
import Brand from '@/components/Brand';

const CODE = 'K7Q2M9';

export default function LauncherPreview() {
  const [tab, setTab] = useState('link');

  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">UWP shell · visual reference</span>
        <h1>Launcher</h1>
        <p>
          Reconstruction of the Xbox shell at 1920×1080, scaled to the browser. Same palette, type scale and
          panel geometry as the compiled MSIX.
        </p>
      </div>

      <div className="tv-tabs" style={{ marginTop: 30, width: 'fit-content' }}>
        <button type="button" className={tab === 'link' ? 'active' : ''} onClick={() => setTab('link')}>
          Link screen
        </button>
        <button type="button" className={tab === 'handoff' ? 'active' : ''} onClick={() => setTab('handoff')}>
          Client handoff
        </button>
      </div>

      <div className="tv">
        <div className="tv-bg" />
        <div className="tv-top">
          <Brand size={30} />
          <span className="mono muted" style={{ fontSize: 10, letterSpacing: '0.18em' }}>
            XBOX DEV MODE · v1.0.0
          </span>
        </div>

        {tab === 'link' ? (
          <>
            <div className="tv-body">
              <div>
                <span className="eyebrow">Console link</span>
                <div className="tv-code">{CODE}</div>
                <div className="tv-url">project-zero.vercel.app/link</div>
                <div className="connsole-foot" style={{ marginTop: 30, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span className="status-dot standby" />
                  <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', color: '#948ba9' }}>
                    WAITING FOR CLAIM
                  </span>
                </div>
                <div className="progress">
                  <i />
                </div>
                <div className="launch-log">
                  <div>CODE ISSUED <b>15:00</b></div>
                  <div>POLLING /api/link/poll</div>
                </div>
              </div>
              <div>
                <div className="tv-qr">
                  <img
                    src="/api/qr?data=https%3A%2F%2Fproject-zero.vercel.app%2Flink"
                    alt="Link QR"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <p className="tv-url" style={{ marginTop: 12, textAlign: 'center' }}>
                  Scan or type the code
                </p>
              </div>
            </div>
            <div className="tv-foot">
              <span>
                <span className="key">A</span> Refresh code
              </span>
              <span>
                <span className="key">B</span> Back
              </span>
              <span>PROJECT ZERO · CONTROL PLANE LINKED</span>
            </div>
          </>
        ) : (
          <>
            <div className="tv-body">
              <div>
                <span className="eyebrow">Session ready</span>
                <div className="tv-code" style={{ fontSize: 46 }}>
                  ROYAN
                </div>
                <div className="tv-url">ACCOUNT #00042 · SEASON 7 · 7.40.3</div>
                <div className="launch-log" style={{ marginTop: 26 }}>
                  <div>PROFILE MOUNTED <b>OK</b></div>
                  <div>BUILD RESOLVED <b>7.40.3 / CL-5046157</b></div>
                  <div>GAME TICKET MINTED <b>10:00</b></div>
                  <div>HANDOFF projectzero-game://launch</div>
                </div>
                <div className="progress">
                  <i style={{ width: '72%' }} />
                </div>
              </div>
              <div className="panel side-panel" style={{ background: 'rgba(9,7,16,0.7)' }}>
                <span className="eyebrow dim">Client package</span>
                <div className="kv">
                  <span>State</span>
                  <b className="gold">Awaiting install</b>
                </div>
                <div className="kv">
                  <span>Target</span>
                  <b>UWP · x64</b>
                </div>
                <div className="kv">
                  <span>Protocol</span>
                  <b style={{ fontSize: 10 }}>projectzero-game</b>
                </div>
                <p className="note" style={{ marginTop: 18 }}>
                  The launcher will retry the protocol handoff when the signed client package is present.
                </p>
              </div>
            </div>
            <div className="tv-foot">
              <span>
                <span className="key">A</span> Retry handoff
              </span>
              <span>
                <span className="key">B</span> Unlink
              </span>
              <span>SEASON 7 · LOBBY SERVICES STANDBY</span>
            </div>
          </>
        )}
      </div>

      <p className="note" style={{ marginTop: 18 }}>
        This page is a visual reference only. The compiled UWP shell lives in <span className="mono">launcher/</span>{' '}
        and is built by CI into a signed MSIX.
      </p>
    </div>
  );
}
