import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import '../config/monaco';
import { useAuth } from '../context/useAuth';
import { createSocket } from '../api/socket';
import http from '../api/http';
import StatusBadge from '../components/StatusBadge';
import { Camera, Clock, Eye, History, Play, ShieldAlert } from 'lucide-react';
import { RunCodePanel } from '../features/room/RunCodePanel';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
];

export default function Room() {
  const { roomId } = useParams();
  const { user } = useAuth();

  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const bindingRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [interview, setInterview] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [online, setOnline] = useState([]);
  const [typing, setTyping] = useState(false);
  const [isObserver, setIsObserver] = useState(false);

  // Snapshot modal and history state
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showRunPanel, setShowRunPanel] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState('');

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;

    if (ydocRef.current && ytextRef.current) {
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
      bindingRef.current = new MonacoBinding(
        ytextRef.current,
        editor.getModel(),
        new Set([editor])
      );
    }
  }, []);

  const loadSnapshots = useCallback(async () => {
    if (!interview?.id) return;
    setLoadingSnapshots(true);
    try {
      const res = await http.get(`/interviews/${interview.id}/snapshots`);
      setSnapshots(res.data?.snapshots || []);
    } catch {
      // Handled silently
    } finally {
      setLoadingSnapshots(false);
    }
  }, [interview]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('monaco');
    ydocRef.current = ydoc;
    ytextRef.current = ytext;

    const socket = createSocket();
    socketRef.current = socket;

    if (editorRef.current && !bindingRef.current) {
      bindingRef.current = new MonacoBinding(
        ytext,
        editorRef.current.getModel(),
        new Set([editorRef.current])
      );
    }

    // Send local Yjs document updates to server
    const handleYjsUpdate = (update, origin) => {
      if (origin !== 'server' && !isObserver) {
        socket.emit('yjs:update', { roomId, update });
      }
    };
    ydoc.on('update', handleYjsUpdate);

    const join = () => {
      socket.emit('room:join', { roomId }, (res) => {
        if (!res?.ok) {
          setError(res?.message || 'Could not join the room');
          return;
        }
        setError('');
        setInterview(res.interview);
        setLanguage(res.language || 'javascript');
        setOnline(res.participants || []);
        setIsObserver(Boolean(res.isObserver));

        if (res.code && ytextRef.current.length === 0) {
          ytextRef.current.insert(0, res.code);
        }

        // Request Yjs sync with server state
        const stateVector = Y.encodeStateVector(ydoc);
        socket.emit('yjs:sync-step-1', { roomId, stateVector });
      });
    };

    socket.on('connect', () => {
      setConnected(true);
      join();
    });

    socket.on('disconnect', () => setConnected(false));

    // Handle incoming Yjs updates from peer participants
    socket.on('yjs:sync-step-2', ({ update }) => {
      if (update) {
        const bin = update instanceof Uint8Array ? update : new Uint8Array(update);
        Y.applyUpdate(ydoc, bin, 'server');
      }
    });

    socket.on('yjs:update', ({ update }) => {
      if (update) {
        const bin = update instanceof Uint8Array ? update : new Uint8Array(update);
        Y.applyUpdate(ydoc, bin, 'server');
      }
    });

    // Fallback sync for legacy events
    socket.on('code:update', ({ code: next }) => {
      if (ytextRef.current && ytextRef.current.toString() !== next) {
        ydoc.transact(() => {
          ytextRef.current.delete(0, ytextRef.current.length);
          ytextRef.current.insert(0, next);
        }, 'server');
      }
    });

    socket.on('language:update', ({ language: next }) => setLanguage(next));

    socket.on('user:joined', ({ userId }) =>
      setOnline((prev) => (prev.includes(userId) ? prev : [...prev, userId]))
    );

    socket.on('user:left', ({ userId }) =>
      setOnline((prev) => prev.filter((id) => id !== userId))
    );

    socket.on('typing', () => {
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 1500);
    });

    socket.connect();

    return () => {
      ydoc.off('update', handleYjsUpdate);
      clearTimeout(typingTimer.current);
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      socket.disconnect();
    };
  }, [roomId, isObserver]);

  const onLanguageChange = (e) => {
    if (isObserver) return;
    const next = e.target.value;
    setLanguage(next);
    socketRef.current?.emit('language:change', { roomId, language: next });
  };

  const handleSaveSnapshot = () => {
    if (isObserver || savingSnapshot) return;
    setSavingSnapshot(true);
    setSnapshotMessage('');
    socketRef.current?.emit('snapshot:save', { roomId }, (res) => {
      setSavingSnapshot(false);
      if (res?.ok) {
        setSnapshotMessage(`Snapshot v${res.version} saved`);
        setTimeout(() => setSnapshotMessage(''), 3000);
        if (showSnapshots) loadSnapshots();
      } else {
        setSnapshotMessage('Failed to save snapshot');
      }
    });
  };

  const handleKeyDown = () => {
    if (isObserver) return;
    const now = Date.now();
    if (now - lastTypingSent.current > 1000) {
      lastTypingSent.current = now;
      socketRef.current?.emit('typing', { roomId });
    }
  };

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#070A12] p-6 text-slate-100">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-8 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-3">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Cannot Open Interview Room</h1>
          <p className="mt-2 text-xs text-rose-400 font-mono bg-rose-950/30 border border-rose-900/50 rounded-lg p-2.5">{error}</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const people = interview ? [interview.interviewer, interview.candidate].filter(Boolean) : [];
  const other = interview
    ? interview.interviewer?.id === user?.id
      ? interview.candidate
      : interview.interviewer
    : null;

  const canManageSnapshots = user?.role === 'interviewer' || user?.role === 'admin';

  return (
    <div className="flex h-screen flex-col bg-[#0B0F19] text-slate-100 selection:bg-indigo-500/30">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl px-5 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
          >
            &larr; Dashboard
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white">
                {interview?.title || 'Joining room...'}
              </h1>
              {isObserver && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/60 px-2 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-800">
                  <Eye className="h-3 w-3" /> Observer (Read-Only)
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
              {interview && <StatusBadge status={interview.status} />}
              <span className="flex items-center gap-1.5 text-[11px]">
                <span
                  className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
                />
                {connected ? 'Realtime CRDT Connected' : 'Reconnecting...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 text-xs text-slate-300">
                <span
                  className={`h-2 w-2 rounded-full ${
                    online.includes(p.id) ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                />
                <span className="font-medium">{p.name}</span>
                {p.id === user?.id && <span className="text-slate-500 text-[10px]">(you)</span>}
              </div>
            ))}
          </div>

          <select
            value={language}
            onChange={onLanguageChange}
            disabled={isObserver}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setShowRunPanel(!showRunPanel);
              if (showSnapshots) setShowSnapshots(false);
            }}
            disabled={isObserver}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer transition ${
              showRunPanel
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
            } disabled:opacity-50`}
            title="Run code against test cases"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Run Code
          </button>

          {canManageSnapshots && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveSnapshot}
                disabled={savingSnapshot || isObserver}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                title="Capture persistent code snapshot"
              >
                <Camera className="h-3.5 w-3.5" />
                {savingSnapshot ? 'Saving...' : 'Snapshot'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSnapshots(!showSnapshots);
                  if (!showSnapshots) loadSnapshots();
                }}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                  showSnapshots
                    ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300'
                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title="View snapshot timeline"
              >
                <History className="h-3.5 w-3.5" />
                History
              </button>
            </div>
          )}

          {snapshotMessage && (
            <span className="text-xs font-medium text-emerald-400 animate-fade-in">
              {snapshotMessage}
            </span>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="flex-1 min-w-0" onKeyDown={handleKeyDown}>
          <Editor
            height="100%"
            theme="vs-dark"
            language={language}
            onMount={handleEditorMount}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              readOnly: isObserver,
            }}
            loading={<div className="p-4 text-slate-400">Loading collaborative editor...</div>}
          />
        </div>

        {/* Run Code Side Panel */}
        {showRunPanel && (
          <RunCodePanel
            getCode={() => ytextRef.current?.toString() || ''}
            language={language}
            isObserver={isObserver}
            onClose={() => setShowRunPanel(false)}
          />
        )}

        {/* Snapshot History Side Drawer */}
        {showSnapshots && (
          <aside className="w-80 border-l border-slate-800 bg-slate-900/95 p-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-400" /> Snapshot Timeline
              </h2>
              <button
                type="button"
                onClick={() => setShowSnapshots(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            {loadingSnapshots ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading snapshots...</div>
            ) : snapshots.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No snapshots captured yet for this room.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {snapshots.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between font-semibold text-white">
                      <span>Version {s.version}</span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {new Date(s.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Language: <span className="font-mono text-indigo-300">{s.language}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Lines: {s.codeContent.split('\n').length} | Characters: {s.codeContent.length}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-5 py-2 text-xs text-slate-400">
        <span>
          {isObserver
            ? 'Observer mode: Code editing is read-only.'
            : typing
              ? `${other?.name || 'The other participant'} is typing...`
              : 'Yjs CRDT synchronized — edits resolve conflict-free in real time.'}
        </span>
        <span className="font-mono text-[11px] text-slate-500">Room: {roomId.slice(0, 8)}...</span>
      </footer>
    </div>
  );
}
