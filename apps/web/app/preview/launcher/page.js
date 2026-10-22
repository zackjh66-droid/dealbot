'use client';

import { useState } from 'react';
import Brand from '@/components/Brand';

const CODE = 'K7Q2M9';
const SEASON7_ART =
  'https://cdn2.unrealengine.com/Fortnite%2Fblog%2Ftake-to-the-skies-in-season-7%2FBR07_News_Featured_16_9-1920x1080-c8c58d82b2986bf9615c839d53bb7763c06895c5.jpg';

export default function LauncherPreview() {
  const [tab, setTab] = useState('link');

  return (
    <div className="container page fortnite-preview-page">
      <header className="page-head">
        <span className="eyebrow">XBOX LAUNCHER</span>
        <h1>The console side.</h1>
        <p>
          Browser preview of the Project Zero Xbox shell. The real UWP package handles console linking,
          local content verification and the client handoff on Xbox Developer Mode.
        </p>
      </header>

      <div className="tv-tabs" style={{ marginTop: 32, marginBottom: 14 }}>
        <button type="button" className={tab === 'link' ? 'active' : ''} onClick={() => setTab('link')}>Link screen</button>
        <button type="button" className={tab === 'handoff' ? 'active' : ''} onClick={() => setTab('handoff')}>Client handoff</button>
      </div>

      <section className="fn-preview-stage" data-pz-interactive aria-label="Project Zero launcher visual preview">
        <img className="fn-preview-bg" src={SEASON7_ART} alt="" aria-hidden="true" />
        <div className="fn-preview-shade" />

        <div className="fn-preview-nav">
          <Brand size={34} />
          <div className="fn-preview-tabs" aria-hidden="true">
            <span className="active">PLAY</span>
            <span>LOCKER</span>
            <span>ITEM SHOP</span>
            <span>CAREER</span>
          </div>
          <span className="mono" style={{ fontSize: 9, letterSpacing: '.12em' }}>DEV MODE · x64</span>
        </div>

        {tab === 'link' ? (
          <div className="fn-preview-body">
            <div className="fn-preview-player">
              <span className="eyebrow">PROJECT ZERO / SEASON 7</span>
              <h2>LINK<br />XBOX.</h2>
              <p>7.00 · CL-4629139 · CONTROLLER FIRST</p>
            </div>

            <aside className="fn-preview-card" data-pz-interactive>
              <span className="eyebrow">CONSOLE LINK</span>
              <h3>{CODE}</h3>
              <div className="fn-preview-qr">
                <img src="/api/qr?data=https%3A%2F%2Fprojectzero7.vercel.app%2Flink" alt="Project Zero link QR" />
              </div>
              <div className="fn-preview-log">
                <div><span>CODE WINDOW</span><b>15:00</b></div>
                <div><span>CONTROL PLANE</span><b>CONNECTED</b></div>
                <div><span>BUILD TARGET</span><b>7.00</b></div>
              </div>
              <div className="fn-preview-ready">WAITING FOR CLAIM</div>
            </aside>
          </div>
        ) : (
          <div className="fn-preview-body">
            <div className="fn-preview-player">
              <span className="eyebrow">SESSION READY</span>
              <h2>READY<br />TO HANDOFF.</h2>
              <p>CONTENT VERIFIED · TICKET READY · SEASON 7</p>
            </div>

            <aside className="fn-preview-card" data-pz-interactive>
              <span className="eyebrow">CLIENT</span>
              <h3>SEASON 7</h3>
              <div className="fn-preview-log">
                <div><span>PROFILE MOUNTED</span><b>OK</b></div>
                <div><span>CONTENT MANIFEST</span><b>VERIFIED</b></div>
                <div><span>GAME TICKET</span><b>READY</b></div>
                <div><span>PROTOCOL</span><b>projectzero-game</b></div>
                <div><span>PLATFORM</span><b>UWP · x64</b></div>
              </div>
              <div className="fn-preview-ready">HANDOFF READY</div>
            </aside>
          </div>
        )}

        <div className="fn-preview-foot">
          <span><span className="key">A</span> Select</span>
          <span><span className="key">B</span> Back</span>
          <span>D-PAD / LEFT STICK · PROJECT ZERO ONLINE</span>
        </div>
      </section>

      <p className="note" style={{ marginTop: 18 }}>
        Visual reference only. This web preview is Fortnite-inspired; the compiled Xbox package is built separately
        and the original Fortnite game UI is not bundled into the website.
      </p>
    </div>
  );
}
