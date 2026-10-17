'use client';

import { useMemo, useRef, useState } from 'react';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { upload } from '@vercel/blob/client';

const PREFIX = 'season7/7.00/4629139/';
const HASH_CHUNK = 16 * 1024 * 1024;
const UPLOAD_ATTEMPTS = 4;

function relativePathFor(file) {
  const raw = String(file.webkitRelativePath || file.name || '').replace(/\\/g, '/');
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return file.name;
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function hashFile(file, onProgress) {
  const hash = sha256.create();
  if (file.size === 0) return bytesToHex(hash.digest());

  // Keep the browser reading the selected File continuously. Explicitly yielding with setTimeout
  // between chunks can cause Chromium to lose access to long-lived File references on some systems.
  for (let offset = 0; offset < file.size; offset += HASH_CHUNK) {
    const end = Math.min(file.size, offset + HASH_CHUNK);
    const chunk = new Uint8Array(await file.slice(offset, end).arrayBuffer());
    hash.update(chunk);
    onProgress?.((end / file.size) * 100);
  }
  return bytesToHex(hash.digest());
}

async function getRemoteStatus(key, path, size) {
  const response = await fetch('/api/content/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, path, size })
  });

  let body = {};
  try {
    body = await response.json();
  } catch {
    // Keep the HTTP status below as the useful error if the body is not JSON.
  }

  if (!response.ok) {
    throw new Error(body?.error || `Content status HTTP ${response.status}`);
  }
  return body;
}

async function uploadWithRetry(pathname, file, options, onRetry) {
  let lastError;
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      return await upload(pathname, file, options);
    } catch (error) {
      lastError = error;
      if (attempt >= UPLOAD_ATTEMPTS) break;
      onRetry?.(attempt, error);
      await sleep(Math.min(4000, 750 * (2 ** (attempt - 1))));
    }
  }
  throw lastError || new Error('Upload failed');
}

export default function ContentAdminPage() {
  const inputRef = useRef(null);
  const [key, setKey] = useState('');
  const [files, setFiles] = useState([]);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('IDLE');
  const [current, setCurrent] = useState('');
  const [currentPct, setCurrentPct] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [resumed, setResumed] = useState(0);
  const [failed, setFailed] = useState([]);
  const [locked, setLocked] = useState(false);

  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  function chooseFiles(event) {
    const selected = Array.from(event.target.files || []);
    setFiles(selected);
    setCompleted(0);
    setResumed(0);
    setFailed([]);
    setLocked(false);
    setPhase('IDLE');
    setCurrent('');
    setCurrentPct(0);
  }

  async function startUpload() {
    if (!key.trim() || !files.length || running || locked) return;
    const uploadKey = key.trim();
    setRunning(true);
    setCompleted(0);
    setResumed(0);
    setFailed([]);
    const failures = [];
    const manifestFiles = [];
    let done = 0;
    let reused = 0;

    for (const file of files) {
      const relativePath = relativePathFor(file);
      const pathname = PREFIX + relativePath;
      setCurrent(relativePath);

      try {
        setPhase('HASHING');
        setCurrentPct(0);
        const digest = await hashFile(file, setCurrentPct);

        setPhase('CHECKING');
        setCurrentPct(100);
        const existing = await getRemoteStatus(uploadKey, relativePath, file.size);
        if (existing.locked) {
          setLocked(true);
          throw new Error('Season 7 content is already finalized and locked.');
        }

        if (existing.exists && existing.sizeMatches) {
          manifestFiles.push({ path: relativePath, size: file.size, sha256: digest });
          done += 1;
          reused += 1;
          setCompleted(done);
          setResumed(reused);
          continue;
        }

        setPhase('UPLOADING');
        setCurrentPct(0);
        try {
          await uploadWithRetry(
            pathname,
            file,
            {
              access: 'private',
              handleUploadUrl: '/api/content/upload',
              multipart: true,
              clientPayload: JSON.stringify({
                key: uploadKey,
                relativePath,
                size: file.size,
                sha256: digest
              }),
              onUploadProgress: ({ percentage }) => {
                setCurrentPct(Math.max(0, Math.min(100, Number(percentage || 0))));
              }
            },
            (attempt) => {
              setPhase(`RETRY ${attempt}/${UPLOAD_ATTEMPTS - 1}`);
            }
          );
        } catch (uploadError) {
          // A browser/network error can arrive after Blob has already accepted the bytes. Check the
          // remote pathname once more before deciding that this file really failed.
          const recovered = await getRemoteStatus(uploadKey, relativePath, file.size);
          if (!(recovered.exists && recovered.sizeMatches)) throw uploadError;
          reused += 1;
          setResumed(reused);
        }

        setPhase('VERIFYING');
        setCurrentPct(100);
        const verified = await getRemoteStatus(uploadKey, relativePath, file.size);
        if (!verified.exists || !verified.sizeMatches) {
          throw new Error('Uploaded file could not be verified in private storage.');
        }

        manifestFiles.push({ path: relativePath, size: file.size, sha256: digest });
        done += 1;
        setCompleted(done);
      } catch (error) {
        let message = error?.message || 'Upload failed';
        if (error?.name === 'NotReadableError' || message.includes('requested file could not be read')) {
          message = 'Chrome lost permission to read this selected file. Re-select the same local Fortnite 7.00 folder, then press Resume upload. Files already stored will be recovered automatically.';
        } else if (message.includes('Failed to retrieve the client token')) {
          message = 'Upload token failed after automatic retries. Press the button again; files already stored will be detected and skipped.';
        }
        failures.push({ path: relativePath, error: message });
        setFailed([...failures]);
        break;
      }
    }

    if (!failures.length && manifestFiles.length === files.length) {
      try {
        setPhase('FINALIZING');
        setCurrent('Creating immutable Season 7 manifest');
        setCurrentPct(100);
        const response = await fetch('/api/content/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: uploadKey, files: manifestFiles })
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || 'Finalization failed');
        setLocked(true);
        setPhase('LOCKED');
        setCurrent(`LOCKED · ${body.fileCount} files · ${formatBytes(body.totalSize)}`);
      } catch (error) {
        failures.push({ path: 'FINAL MANIFEST', error: error?.message || 'Finalization failed' });
        setFailed([...failures]);
        setPhase('FAILED');
      }
    } else if (failures.length) {
      setPhase('FAILED');
    }

    setRunning(false);
  }

  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">Project Zero · private content</span>
        <h1>Season 7 Content Manager</h1>
        <p>
          Select the extracted Fortnite 7.00 folder. Every file is SHA-256 hashed in your browser, uploaded directly
          to private storage, then sealed into one immutable build manifest for the Xbox downloader.
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
          disabled={running || locked}
        />

        <input
          ref={inputRef}
          type="file"
          multiple
          webkitdirectory=""
          directory=""
          onChange={chooseFiles}
          disabled={running || locked}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" type="button" onClick={() => inputRef.current?.click()} disabled={running || locked}>
            Select Fortnite 7.00 folder
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={startUpload}
            disabled={running || locked || !files.length || !key.trim()}
          >
            {locked ? 'Build locked' : running ? `${phase}…` : failed.length ? 'Resume upload' : 'Hash, upload and lock build'}
          </button>
        </div>

        <div className="rule" />
        <div className="kv"><span>Files selected</span><b>{files.length}</b></div>
        <div className="kv"><span>Total size</span><b>{formatBytes(totalBytes)}</b></div>
        <div className="kv"><span>Ready this run</span><b>{completed} / {files.length}</b></div>
        <div className="kv"><span>Recovered from storage</span><b>{resumed}</b></div>
        <div className="kv"><span>State</span><b>{phase}</b></div>

        {current ? (
          <div style={{ marginTop: 22 }}>
            <div className="muted mono" style={{ overflowWrap: 'anywhere' }}>{current}</div>
            <div style={{ height: 10, background: '#17151d', marginTop: 10, overflow: 'hidden' }}>
              <div style={{ width: `${currentPct}%`, height: '100%', background: 'currentColor' }} />
            </div>
            <div className="muted mono" style={{ marginTop: 7 }}>{phase} · {currentPct.toFixed(1)}%</div>
          </div>
        ) : null}

        {locked ? (
          <div className="alert" style={{ marginTop: 22 }}>
            <b>Season 7 v7.00 is finalized.</b> Xbox clients can now request the signed multi-file manifest. This web uploader will not replace or append to the finalized build.
          </div>
        ) : null}

        {failed.length ? (
          <div className="alert" style={{ marginTop: 22 }}>
            <b>Upload stopped.</b>
            {failed.slice(0, 8).map((item) => (
              <div key={item.path} className="mono" style={{ marginTop: 6, overflowWrap: 'anywhere' }}>
                {item.path} — {item.error}
              </div>
            ))}
          </div>
        ) : null}

        <p className="note" style={{ marginTop: 22 }}>
          Interrupted uploads are resumable: select the same folder again and the manager checks private storage before uploading each file. Large files use multipart upload, and SHA-256 is calculated locally so the Xbox can verify the exact bytes after download. Only upload files you are authorized to store.
        </p>
      </div>
    </div>
  );
}
