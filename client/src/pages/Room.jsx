import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/useAuth';
import { createSocket } from '../api/socket';
import StatusBadge from '../components/StatusBadge';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
];

const SEND_DELAY_MS = 150; // typing rukne ke 150ms baad code bhejo (debounce)

export default function Room() {
  const { roomId } = useParams();
  const { user } = useAuth();

  const socketRef = useRef(null);
  const codeRef = useRef('');
  const sendTimer = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [interview, setInterview] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [online, setOnline] = useState([]); // online users ki ids
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    // Connect aur reconnect, dono par room dobara join karna padta hai
    const join = () => {
      socket.emit('room:join', { roomId }, (res) => {
        if (!res?.ok) {
          setError(res?.message || 'Could not join the room');
          return;
        }
        setError('');
        setInterview(res.interview);
        codeRef.current = res.code;
        setCode(res.code);
        setLanguage(res.language);
        setOnline(res.participants);
      });
    };

    socket.on('connect', () => {
      setConnected(true);
      join();
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('code:update', ({ code: next }) => {
      codeRef.current = next;
      setCode(next);
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
      clearTimeout(sendTimer.current);
      clearTimeout(typingTimer.current);
      socket.disconnect();
    };
  }, [roomId]);

  const onCodeChange = (value = '') => {
    if (value === codeRef.current) return; // doosre se aaya update dobara wapas nahi bhejna
    codeRef.current = value;
    setCode(value);

    clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(() => {
      socketRef.current?.emit('code:change', { roomId, code: codeRef.current });
    }, SEND_DELAY_MS);

    // Typing indicator zyada se zyada 1 second me ek baar
    const now = Date.now();
    if (now - lastTypingSent.current > 1000) {
      lastTypingSent.current = now;
      socketRef.current?.emit('typing', { roomId });
    }
  };

  const onLanguageChange = (e) => {
    const next = e.target.value;
    setLanguage(next);
    socketRef.current?.emit('language:change', { roomId, language: next });
  };

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-xl font-semibold text-slate-800">Cannot open this room</h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const people = interview ? [interview.interviewer, interview.candidate] : [];
  const other = interview
    ? interview.interviewer.id === user.id
      ? interview.candidate
      : interview.interviewer
    : null;

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            &larr; Dashboard
          </Link>
          <div>
            <h1 className="text-base font-semibold text-slate-800">
              {interview?.title || 'Joining room...'}
            </h1>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              {interview && <StatusBadge status={interview.status} />}
              <span className="flex items-center gap-1">
                <span
                  className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
                {connected ? 'Connected' : 'Reconnecting...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 text-sm text-slate-600">
                <span
                  className={`h-2 w-2 rounded-full ${
                    online.includes(p.id) ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                {p.name}
                {p.id === user.id && ' (you)'}
              </div>
            ))}
          </div>
          <select
            value={language}
            onChange={onLanguageChange}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          theme="vs-dark"
          language={language}
          value={code}
          onChange={onCodeChange}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
          loading={<div className="text-slate-400">Loading editor...</div>}
        />
      </div>

      <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-2 text-xs text-slate-500">
        <span>
          {typing
            ? `${other?.name || 'The other participant'} is typing...`
            : 'Code is synced live between both participants'}
        </span>
        <span>Room ID: {roomId.slice(0, 8)}...</span>
      </footer>
    </div>
  );
}