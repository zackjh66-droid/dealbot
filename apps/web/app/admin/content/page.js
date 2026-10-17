'use client';

import { useMemo, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';

const PREFIX = 'season7/7.00/4629139/';

function relativePathFor(file) {
  const raw = String(file.webkitRelativePath || file.name || '').replace(/\\/g, '/');
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return file.name;

  // Folder selection always includes the selected root. Keep Engine/FortniteGame when the user
  // selects those folders directly; otherwise strip the outer archive/build folder name.
  if (parts[0] === 'Engine' || parts[0] === 'FortniteGame') return parts.join('/');
  return parts.length > 1 ? parts.slice(1).join('/') : parts[0];
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Number(bytes || 0);
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i >= 3 ? 2 : 1)} ${units[i]}`;
}

export default function ContentAdminPage() {
  const inputRef = useRef(null);
  const [key, setKey] = useState('');
  const [files, setFiles] = useState([]);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState('');
  const [currentPct, setCurrentPct] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [failed, setFailed] = useState([]);

  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  function chooseFiles(event) {
    const selected = Array.from(event.target.files || []);
    setFiles(selected);
    setCompleted(0);
    setFailed([]);
    setCurrent('');
    setCurrentPct(0);
  }

  async function startUpload() {
    if (!key.trim() || !files.length || running) return;
    setRunning(true);
    setCompleted(0);
    setFailed([]);

    const failures = [];
    let done = 0;
    for (const file of files) {
      const relativePath = relativePathFor(file);
      const pathname = PREFIX + relativePath;
      setCurrent(relativePath);
      setCurrentPct(0);

      try {
        await upload(pathname, file, {
          access: 'private',
          handleUploadUrl: '/api/content/upload',
          multipart: true,
          clientPayload: JSON.stringify({
            key: key.trim(),
            relativePath,
            size: file.size
          }),
          onUploadProgress: ({ percentage }) => {
            setCurrentPct(Math.max(0, Math.min(100, Number(percentage || 0))));
          }
        });
        done += 1;
        setCompleted(done);
      } catch (error) {
        failures.push({ path: relativePath, error: error?.message || 'Upload failed' });
        setFailed([...failures]);
      }
    }

    setRunning(false);
    setCurrent('');
    setCurrentPct(0);
  }

  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">Project Zero · private content</span>
        <h1>Season 7 Content Manager</h1>
        <p>
          Select the extracted Fortnite 7.00 folder. Files are uploaded directly to private storage with their
          folder paths preserved. After a pathname is uploaded it is locked and this uploader will not replace it.
        </p>
      </div>

      <div className="panel side-panel" style={{ marginTop: 28, maxWidth: 900 }}>
        <label className="eyebrow dim" htmlFor="content-key">Upload key</label>
        <input
          id="content-key"
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          autoComplete="off"
          placeholder="Project Zero content key"
          style={{ width: '100%', marginTop: 10, marginBottom: 20 }}
          disabled={running}
        />

        <input
          ref={inputRef}
          type="file"
          multiple
          webkitdirectory=""
          directory=""
          onChange={chooseFiles}
          disabled={running}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" type="button" onClick={() => inputRef.current?.click()} disabled={running}>
            Select Fortnite 7.00 folder
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={startUpload}
            disabled={running || !files.length || !key.trim()}
          >
            {running ? 'Uploading…' : 'Upload and lock files'}
          </button>
        </div>

        <div className="rule" />
        <div className="kv"><span>Files selected</span><b>{files.length}</b></div>
        <div className="kv"><span>Total size</span><b>{formatBytes(totalBytes)}</b></div>
        <div className="kv"><span>Uploaded this run</span><b>{completed} / {files.length}</b></div>

        {current ? (
          <div style={{ marginTop: 22 }}>
            <div className="muted mono" style={{ overflowWrap: 'anywhere' }}>{current}</div>
            <div style={{ height: 10, background: '#17151d', marginTop: 10, overflow: 'hidden' }}>
              <div style={{ width: `${currentPct}%`, height: '100%', background: 'currentColor' }} />
            </div>
            <div className="muted mono" style={{ marginTop: 7 }}>{currentPct.toFixed(1)}%</div>
          </div>
        ) : null}

        {failed.length ? (
          <div className="alert" style={{ marginTop: 22 }}>
            <b>{failed.length} file(s) were not uploaded.</b>
            {failed.slice(0, 8).map((item) => (
              <div key={item.path} className="mono" style={{ marginTop: 6, overflowWrap: 'anywhere' }}>
                {item.path} — {item.error}
              </div>
            ))}
          </div>
        ) : null}

        <p className="note" style={{ marginTop: 22 }}>
          Use this only for game files you are authorized to store. Large files use multipart upload directly from
          your browser to the private Project Zero Blob store; they do not pass through the web server.
        </p>
      </div>
    </div>
  );
}
