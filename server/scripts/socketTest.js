const { io } = require('socket.io-client');

const API = 'http://localhost:5000/api';
const WS = 'http://localhost:5000';
const PASSWORD = 'Test@12345';

const check = (cond, msg) => {
  if (cond) {
    console.log('\x1b[32mPASS\x1b[0m', msg);
  } else {
    console.log('\x1b[31mFAIL\x1b[0m', msg);
    process.exitCode = 1;
  }
};

async function post(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function login(email) {
  const r = await post('/auth/login', { email, password: PASSWORD });
  return r.data.accessToken;
}

const connect = (token) =>
  new Promise((resolve, reject) => {
    const socket = io(WS, { auth: { token }, reconnection: false });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });

const waitFor = (socket, event, ms = 1500) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data ?? true);
    });
  });

const join = (socket, roomId) =>
  new Promise((resolve) => socket.emit('room:join', { roomId }, resolve));

(async () => {
  try {
    const ivToken = await login('interviewer@example.com');
    const cdToken = await login('test@example.com');

    await post('/auth/register', {
      name: 'Outsider',
      email: 'outsider@example.com',
      password: PASSWORD,
      role: 'candidate',
    });
    const outToken = await login('outsider@example.com');

    // Naya interview, random future date taaki time clash na ho
    const days = 10 + Math.floor(Math.random() * 300);
    const scheduledAt = new Date(Date.now() + days * 86400000).toISOString();
    const created = await post(
      '/interviews',
      { candidateEmail: 'test@example.com', title: 'Socket test', scheduledAt, durationMinutes: 30 },
      ivToken
    );
    const roomId = created.data.interview && created.data.interview.roomId;
    check(created.status === 201 && !!roomId, 'interview created, roomId received');
    if (!roomId) return;

    // 1. Bina token ke connection reject hona chahiye
    await connect(null).then(
      () => check(false, 'connection without token should be rejected'),
      (err) => check(err.message === 'Access token missing', 'no token -> connection rejected')
    );

    const iv = await connect(ivToken);
    const cd = await connect(cdToken);
    const out = await connect(outToken);

    // 2. Bahar wala banda room join nahi kar sakta
    const outJoin = await join(out, roomId);
    check(outJoin.ok === false, 'outsider cannot join the room');

    // 3. Interviewer aur candidate join karte hain
    const ivJoin = await join(iv, roomId);
    check(ivJoin.ok === true, 'interviewer joined');

    const joinedEvent = waitFor(iv, 'user:joined');
    const cdJoin = await join(cd, roomId);
    check(cdJoin.ok === true && cdJoin.participants.length === 2, 'candidate joined, 2 participants');
    check(!!(await joinedEvent), 'interviewer notified that candidate joined');

    // 4. Live code sync
    const update = waitFor(cd, 'code:update');
    iv.emit('code:change', { roomId, code: 'console.log("hello");' });
    const got = await update;
    check(!!got && got.code === 'console.log("hello");', 'code synced to candidate');

    // 5. Typing indicator
    const typing = waitFor(iv, 'typing');
    cd.emit('typing', { roomId });
    check(!!(await typing), 'typing indicator received');

    // 6. Room ke bahar wala code push nahi kar sakta
    const leak = waitFor(cd, 'code:update', 800);
    out.emit('code:change', { roomId, code: 'HACKED' });
    check((await leak) === null, 'outsider cannot push code into the room');

    // 7. Reconnect: candidate nikle aur wapas aaye, to latest code mile
    const left = waitFor(iv, 'user:left');
    cd.disconnect();
    check(!!(await left), 'interviewer notified that candidate left');

    const cd2 = await connect(cdToken);
    const rejoin = await join(cd2, roomId);
    check(
      rejoin.ok === true && rejoin.code === 'console.log("hello");',
      'reconnected candidate got the latest code'
    );

    [iv, cd2, out].forEach((s) => s.disconnect());
  } catch (err) {
    check(false, `unexpected error: ${err.message}`);
  } finally {
    setTimeout(() => process.exit(), 300);
  }
})();