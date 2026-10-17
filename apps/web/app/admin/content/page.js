'use client';

import { useMemo, useRef, useState } from 'react';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { upload } from '@vercel/blob/client';

const PREFIX = 'season7/7.00/4629139/';
const HASH_CHUNK = 16 * 1024 * 1024;
const ARCHIVE_PART_SIZE = 64 * 1024 * 1024;
const ARCHIVE_CONCURRENCY = 3;
const FAST_HASH_LIMIT = 128 * 1024 * 1024;
const UPLOAD_ATTEMPTS = 4;

function normalizeRelativePath(value) {
  const raw = String(value || '').replace(/\\/g, '/');
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return '';
  const gameRoot = parts.findIndex((part) => part === 'Engine' || part === 'FortniteGame');
  if (gameRoot >= 0) return parts.slice(gameRoot).join('/');
  return parts.length > 1 ? parts.slice(1).join('/') : parts[0];
}

function safeArchiveName(value) {
  const name = String(value || 'fortnite-7.00.rar')
    .split(/[\\/]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]+/g, '-');
  return name.toLowerCase().endsWith('.rar') ? name : `${name}.rar`;
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

function isLocalFileError(error) {
  const name = String(error?.name || '');
  const message = String(error?.message || '').toLowerCase();
  return name === 'NotReadableError'
    || name === 'NotFoundError'
    || message.includes('requested file could not be read')
    || message.includes('requested file or directory could not be found')
    || message.includes('file or directory could not be found');
}

function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function ensureReadPermission(handle) {
  if (!handle) return;
  try {
    if (handle.queryPermission && (await handle.queryPermission({ mode: 'read' })) === 'granted') return;
    if (handle.requestPermission) {
      const result = await handle.requestPermission({ mode: 'read' });
      if (result !== 'granted') throw new Error('File read permission was not granted.');
    }
  } catch (error) {
    if (error?.name === 'SecurityError') return;
    throw error;
  }
}

async function scanDirectory(handle, prefix = '', output = []) {
  for await (const [name, child] of handle.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (child.kind === 'directory') {
      await scanDirectory(child, path, output);
      continue;
    }
    const file = await child.getFile();
    const relativePath = normalizeRelativePath(path);
    if (!relativePath) continue;
    output.push({
      relativePath,
      size: file.size,
      lastModified: file.lastModified,
      handle: child,
      legacyFile: null
    });
  }
  return output;
}

function legacyEntries(fileList) {
  return Array.from(fileList || []).map((file) => ({
    relativePath: normalizeRelativePath(file.webkitRelativePath || file.name),
    size: file.size,
    lastModified: file.lastModified,
    handle: null,
    legacyFile: file
  })).filter((entry) => entry.relativePath);
}

function archiveEntry(file, handle = null) {
  if (!file || !/\.rar$/i.test(file.name || '')) throw new Error('Choose the Fortnite 7.00 .rar archive.');
  return {
    relativePath: `.source/${safeArchiveName(file.name)}`,
    size: file.size,
    lastModified: file.lastModified,
    handle,
    legacyFile: handle ? null : file
  };
}

function archivePartRoot(entry) {
  return `${entry.relativePath}.${entry.size}.parts`;
}

function archivePartPath(entry, index) {
  return `${archivePartRoot(entry)}/${String(index + 1).padStart(5, '0')}.part`;
}

function archivePartsManifestPath(entry) {
  return `${entry.relativePath}.${entry.size}.parts.json`;
}

async function materializeEntry(entry) {
  if (entry.handle) {
    await ensureReadPermission(entry.handle);
    const file = await entry.handle.getFile();
    if (file.size !== entry.size) throw new Error('Local file size changed after it was selected. Re-select it before continuing.');
    return file;
  }
  if (entry.legacyFile) return entry.legacyFile;
  throw new Error('Local file handle is unavailable.');
}

async function hashBlob(blob, onProgress) {
  const hash = sha256.create();
  if (blob.size === 0) return bytesToHex(hash.digest());

  if (typeof blob.stream === 'function') {
    const reader = blob.stream().getReader();
    let loaded = 0;
    let lastUi = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.byteLength) {
          hash.update(value);
          loaded += value.byteLength;
          const now = performance.now();
          if (now - lastUi > 120 || loaded === blob.size) {
            onProgress?.((loaded / blob.size) * 100);
            lastUi = now;
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
      }
      onProgress?.(100);
      return bytesToHex(hash.digest());
    } finally {
      try { reader.releaseLock(); } catch { /* no-op */ }
    }
  }

  for (let offset = 0; offset < blob.size; offset += HASH_CHUNK) {
    const end = Math.min(blob.size, offset + HASH_CHUNK);
    const chunk = new Uint8Array(await blob.slice(offset, end).arrayBuffer());
    hash.update(chunk);
    onProgress?.((end / blob.size) * 100);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return bytesToHex(hash.digest());
}

async function fastHashBlob(blob, onProgress) {
  if (globalThis.crypto?.subtle && blob.size <= FAST_HASH_LIMIT) {
    onProgress?.(5);
    const bytes = await blob.arrayBuffer();
    onProgress?.(60);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    onProgress?.(100);
    return arrayBufferToHex(digest);
  }
  return hashBlob(blob, onProgress);
}

async function hashEntry(entry, onProgress) {
  let lastError;
  for (let attempt = 0; attempt < (entry.handle ? 2 : 1); attempt += 1) {
    try {
      const file = await materializeEntry(entry);
      return await hashBlob(file, onProgress);
    } catch (error) {
      lastError = error;
      if (!isLocalFileError(error)) throw error;
    }
  }
  throw lastError || new Error('Unable to read local file.');
}

async function getRemoteStatus(key, path, size) {
  const response = await fetch('/api/content/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, path, size })
  });
  let body = {};
  try { body = await response.json(); } catch { /* HTTP status is enough */ }
  if (!response.ok) throw new Error(body?.error || `Content status HTTP ${response.status}`);
  return body;
}

async function uploadEntryWithRetry(pathname, entry, options, onRetry) {
  let lastError;
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      const file = await materializeEntry(entry);
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

async function uploadArchivePartWithRetry(pathname, entry, start, end, options, onRetry) {
  let lastError;
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      const file = await materializeEntry(entry);
      const part = file.slice(start, end, 'application/octet-stream');
      if (part.size !== end - start) throw new Error('Could not read the expected RAR chunk size.');
      return await upload(pathname, part, options);
    } catch (error) {
      lastError = error;
      if (attempt >= UPLOAD_ATTEMPTS) break;
      onRetry?.(attempt, error);
      await sleep(Math.min(4000, 750 * (2 ** (attempt - 1))));
    }
  }
  throw lastError || new Error('RAR part upload failed');
}

export default function ContentAdminPage() {
  const folderInputRef = useRef(null);
  const archiveInputRef = useRef(null);
  const [key, setKey] = useState('');
  const [files, setFiles] = useState([]);
  const [selectionMode, setSelectionMode] = useState('NONE');
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('IDLE');
  const [current, setCurrent] = useState('');
  const [currentPct, setCurrentPct] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [resumed, setResumed] = useState(0);
  const [failed, setFailed] = useState([]);
  const [locked, setLocked] = useState(false);

  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const archiveMode = selectionMode.startsWith('ARCHIVE');
  const workTotal = archiveMode && files[0] ? Math.ceil(files[0].size / ARCHIVE_PART_SIZE) : files.length;

  function resetSelection(selected, mode) {
    setFiles(selected.sort((a, b) => a.relativePath.localeCompare(b.relativePath)));
    setSelectionMode(mode);
    setCompleted(0);
    setResumed(0);
    setFailed([]);
    setLocked(false);
    setPhase('IDLE');
    setCurrent('');
    setCurrentPct(0);
  }

  function chooseLegacyFiles(event) {
    resetSelection(legacyEntries(event.target.files), 'LEGACY');
  }

  function chooseLegacyArchive(event) {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      resetSelection([archiveEntry(file)], 'ARCHIVE LEGACY');
    } catch (error) {
      setPhase('FAILED');
      setFailed([{ path: 'ARCHIVE', error: error?.message || 'Could not read the selected archive.' }]);
    } finally {
      event.target.value = '';
    }
  }

  async function choosePersistentFolder() {
    if (running || locked) return;
    if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
      folderInputRef.current?.click();
      return;
    }
    try {
      setPhase('SCANNING');
      setCurrent('Choose the extracted Fortnite 7.00 folder');
      setCurrentPct(0);
      const directory = await window.showDirectoryPicker({ mode: 'read' });
      await ensureReadPermission(directory);
      resetSelection(await scanDirectory(directory), 'PERSISTENT');
    } catch (error) {
      if (error?.name === 'AbortError') {
        setPhase('IDLE');
        setCurrent('');
        return;
      }
      setPhase('FAILED');
      setFailed([{ path: 'FOLDER', error: error?.message || 'Could not read the selected folder.' }]);
    }
  }

  async function chooseArchive() {
    if (running || locked) return;
    if (typeof window === 'undefined' || typeof window.showOpenFilePicker !== 'function') {
      archiveInputRef.current?.click();
      return;
    }
    try {
      setPhase('SELECTING ARCHIVE');
      setCurrent('Choose the Fortnite 7.00 .rar file');
      setCurrentPct(0);
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{
          description: 'RAR archive',
          accept: {
            'application/vnd.rar': ['.rar'],
            'application/x-rar-compressed': ['.rar']
          }
        }]
      });
      await ensureReadPermission(handle);
      resetSelection([archiveEntry(await handle.getFile(), handle)], 'ARCHIVE PERSISTENT');
    } catch (error) {
      if (error?.name === 'AbortError') {
        setPhase('IDLE');
        setCurrent('');
        return;
      }
      setPhase('FAILED');
      setFailed([{ path: 'ARCHIVE', error: error?.message || 'Could not read the selected archive.' }]);
    }
  }

  async function startArchiveUpload(uploadKey) {
    const entry = files[0];
    const partCount = Math.ceil(entry.size / ARCHIVE_PART_SIZE);
    const parts = new Array(partCount);
    const partProgress = new Array(partCount).fill(0);
    let progressTotal = 0;
    let done = 0;
    let reused = 0;
    let nextIndex = 0;
    let firstError = null;

    const updatePartProgress = (index, fraction) => {
      const next = Math.max(partProgress[index], Math.min(1, Math.max(0, fraction)));
      progressTotal += next - partProgress[index];
      partProgress[index] = next;
      setCurrentPct((progressTotal / partCount) * 100);
    };

    async function processPart(index) {
      const start = index * ARCHIVE_PART_SIZE;
      const end = Math.min(entry.size, start + ARCHIVE_PART_SIZE);
      const partSize = end - start;
      const relativePath = archivePartPath(entry, index);
      const pathname = PREFIX + relativePath;

      setCurrent(`RAR part ${index + 1} / ${partCount} · ${ARCHIVE_CONCURRENCY} parallel lanes`);
      setPhase('FAST CHECKING');
      updatePartProgress(index, 0.01);

      const existing = await getRemoteStatus(uploadKey, relativePath, partSize);
      if (existing.locked) {
        setLocked(true);
        throw new Error('Season 7 content is already finalized and locked.');
      }

      if (existing.exists && existing.sizeMatches) {
        parts[index] = { path: relativePath, size: partSize };
        done += 1;
        reused += 1;
        setCompleted(done);
        setResumed(reused);
        updatePartProgress(index, 1);
        return;
      }

      setPhase('FAST HASHING');
      const file = await materializeEntry(entry);
      const localPart = file.slice(start, end, 'application/octet-stream');
      const digest = await fastHashBlob(localPart, (percentage) => {
        updatePartProgress(index, 0.02 + (Number(percentage || 0) / 100) * 0.08);
      });

      setPhase(`UPLOADING ${ARCHIVE_CONCURRENCY} PARTS`);
      await uploadArchivePartWithRetry(
        pathname,
        entry,
        start,
        end,
        {
          access: 'private',
          handleUploadUrl: '/api/content/upload',
          multipart: false,
          clientPayload: JSON.stringify({
            key: uploadKey,
            relativePath,
            size: partSize,
            sha256: digest
          }),
          onUploadProgress: ({ percentage }) => {
            updatePartProgress(index, 0.1 + (Number(percentage || 0) / 100) * 0.85);
          }
        },
        (attempt) => setPhase(`RETRY PART ${attempt}/${UPLOAD_ATTEMPTS - 1}`)
      );

      setPhase('VERIFYING PARTS');
      const verified = await getRemoteStatus(uploadKey, relativePath, partSize);
      if (!verified.exists || !verified.sizeMatches) throw new Error(`RAR part ${index + 1} could not be verified in private storage.`);

      parts[index] = { path: relativePath, size: partSize };
      done += 1;
      setCompleted(done);
      updatePartProgress(index, 1);
    }

    async function worker() {
      while (!firstError) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= partCount) return;
        try {
          await processPart(index);
        } catch (error) {
          firstError = firstError || error;
          return;
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(ARCHIVE_CONCURRENCY, partCount) }, () => worker()));
    if (firstError) throw firstError;

    setPhase('WRITING ARCHIVE MAP');
    setCurrent('Saving resumable RAR parts manifest');
    const partsManifest = {
      schema: 2,
      build: '7.00',
      cl: '4629139',
      archiveName: entry.relativePath.split('/').pop(),
      archiveSize: entry.size,
      partSize: ARCHIVE_PART_SIZE,
      partCount,
      concurrency: ARCHIVE_CONCURRENCY,
      parts
    };
    const manifestBlob = new Blob([JSON.stringify(partsManifest)], { type: 'application/json' });
    const manifestDigest = await fastHashBlob(manifestBlob);
    const manifestRelativePath = archivePartsManifestPath(entry);
    const manifestStatus = await getRemoteStatus(uploadKey, manifestRelativePath, manifestBlob.size);
    if (!(manifestStatus.exists && manifestStatus.sizeMatches)) {
      await upload(PREFIX + manifestRelativePath, manifestBlob, {
        access: 'private',
        handleUploadUrl: '/api/content/upload',
        multipart: false,
        clientPayload: JSON.stringify({
          key: uploadKey,
          relativePath: manifestRelativePath,
          size: manifestBlob.size,
          sha256: manifestDigest
        })
      });
    }

    setPhase('ARCHIVE STORED');
    setCurrent(`RAR stored as ${partCount} resumable parts · ${formatBytes(entry.size)}`);
    setCurrentPct(100);
  }

  async function startFolderUpload(uploadKey) {
    const failures = [];
    const manifestFiles = [];
    let done = 0;
    let reused = 0;

    for (const entry of files) {
      const relativePath = entry.relativePath;
      const pathname = PREFIX + relativePath;
      setCurrent(relativePath);
      try {
        setPhase('CHECKING');
        setCurrentPct(0);
        const existing = await getRemoteStatus(uploadKey, relativePath, entry.size);
        if (existing.locked) {
          setLocked(true);
          throw new Error('Season 7 content is already finalized and locked.');
        }

        setPhase(existing.exists && existing.sizeMatches ? 'HASHING RECOVERED FILE' : 'HASHING');
        const digest = await hashEntry(entry, setCurrentPct);
        if (existing.exists && existing.sizeMatches) {
          manifestFiles.push({ path: relativePath, size: entry.size, sha256: digest });
          done += 1;
          reused += 1;
          setCompleted(done);
          setResumed(reused);
          continue;
        }

        setPhase('UPLOADING');
        setCurrentPct(0);
        try {
          await uploadEntryWithRetry(
            pathname,
            entry,
            {
              access: 'private',
              handleUploadUrl: '/api/content/upload',
              multipart: true,
              clientPayload: JSON.stringify({ key: uploadKey, relativePath, size: entry.size, sha256: digest }),
              onUploadProgress: ({ percentage }) => setCurrentPct(Math.max(0, Math.min(100, Number(percentage || 0))))
            },
            (attempt) => setPhase(`RETRY ${attempt}/${UPLOAD_ATTEMPTS - 1}`)
          );
        } catch (uploadError) {
          const recovered = await getRemoteStatus(uploadKey, relativePath, entry.size);
          if (!(recovered.exists && recovered.sizeMatches)) throw uploadError;
          reused += 1;
          setResumed(reused);
        }

        setPhase('VERIFYING');
        setCurrentPct(100);
        const verified = await getRemoteStatus(uploadKey, relativePath, entry.size);
        if (!verified.exists || !verified.sizeMatches) throw new Error('Uploaded file could not be verified in private storage.');
        manifestFiles.push({ path: relativePath, size: entry.size, sha256: digest });
        done += 1;
        setCompleted(done);
      } catch (error) {
        failures.push({ path: relativePath, error: error?.message || 'Upload failed' });
        throw Object.assign(error instanceof Error ? error : new Error('Upload failed'), { failures });
      }
    }

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
  }

  async function startUpload() {
    if (!key.trim() || !files.length || running || locked) return;
    const uploadKey = key.trim();
    setRunning(true);
    setCompleted(0);
    setResumed(0);
    setFailed([]);
    try {
      if (archiveMode) await startArchiveUpload(uploadKey);
      else await startFolderUpload(uploadKey);
    } catch (error) {
      let message = error?.message || 'Upload failed';
      if (isLocalFileError(error)) {
        message = archiveMode
          ? 'ChromeOS lost access to the local RAR. Re-select the SAME .rar and press Resume upload. Finished 64 MB parts stay stored and will be skipped.'
          : 'ChromeOS lost access to a local game file. Move the extracted folder to local Downloads/My files, re-select it, then resume.';
      } else if (message.includes('Failed to retrieve the client token')) {
        message = 'Upload token failed after automatic retries. Press Resume upload; files already stored will be detected and skipped.';
      }
      const path = archiveMode ? files[0]?.relativePath || 'ARCHIVE' : error?.failures?.[0]?.path || current || 'UPLOAD';
      setFailed([{ path, error: message }]);
      setPhase('FAILED');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">Project Zero · private content</span>
        <h1>Season 7 Content Manager</h1>
        <p>
          Upload the extracted Fortnite 7.00 folder or the original .rar archive. RAR mode uses resumable 64 MB parts,
          native browser SHA-256 and three parallel upload lanes for better throughput without losing completed progress.
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

        <input ref={folderInputRef} type="file" multiple webkitdirectory="" directory="" onChange={chooseLegacyFiles} disabled={running || locked} style={{ display: 'none' }} />
        <input ref={archiveInputRef} type="file" accept=".rar,application/vnd.rar,application/x-rar-compressed" onChange={chooseLegacyArchive} disabled={running || locked} style={{ display: 'none' }} />

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" type="button" onClick={choosePersistentFolder} disabled={running || locked}>Select extracted folder</button>
          <button className="btn btn-ghost" type="button" onClick={chooseArchive} disabled={running || locked}>Select .RAR archive</button>
          <button className="btn btn-primary" type="button" onClick={startUpload} disabled={running || locked || !files.length || !key.trim()}>
            {locked ? 'Build locked' : running ? `${phase}…` : failed.length ? 'Resume upload' : archiveMode ? 'Upload RAR archive' : 'Hash, upload and lock build'}
          </button>
        </div>

        <div className="rule" />
        <div className="kv"><span>{archiveMode ? 'RAR parts' : 'Files selected'}</span><b>{archiveMode ? workTotal : files.length}</b></div>
        <div className="kv"><span>Total size</span><b>{formatBytes(totalBytes)}</b></div>
        <div className="kv"><span>Selection</span><b>{selectionMode}</b></div>
        <div className="kv"><span>Ready this run</span><b>{completed} / {workTotal}</b></div>
        <div className="kv"><span>Recovered from storage</span><b>{resumed}</b></div>
        {archiveMode ? <div className="kv"><span>Upload lanes</span><b>{ARCHIVE_CONCURRENCY} parallel</b></div> : null}
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

        {selectionMode === 'LEGACY' ? (
          <div className="alert" style={{ marginTop: 22 }}>This browser fell back to legacy folder selection. For the largest files, current Chrome/ChromeOS with persistent file handles is recommended.</div>
        ) : null}

        {archiveMode ? (
          <div className="alert" style={{ marginTop: 22 }}>
            <b>Fast resumable RAR mode.</b> Three 64 MB parts can upload at the same time. Completed parts stay in private Blob storage, so re-selecting the same RAR resumes instead of restarting. Actual speed is still capped by your Chromebook and internet upload bandwidth.
          </div>
        ) : null}

        {locked ? <div className="alert" style={{ marginTop: 22 }}><b>Season 7 v7.00 is finalized.</b> Xbox clients can now request the signed multi-file manifest.</div> : null}

        {failed.length ? (
          <div className="alert" style={{ marginTop: 22 }}>
            <b>Upload stopped.</b>
            {failed.slice(0, 8).map((item) => (
              <div key={item.path} className="mono" style={{ marginTop: 6, overflowWrap: 'anywhere' }}>{item.path} — {item.error}</div>
            ))}
          </div>
        ) : null}

        <p className="note" style={{ marginTop: 22 }}>Existing completed files or RAR parts are reused from private storage. Only upload files you are authorized to store.</p>
      </div>
    </div>
  );
}
