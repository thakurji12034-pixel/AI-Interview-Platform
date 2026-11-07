const http = require('http');
const { io: Client } = require('socket.io-client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { initSockets } = require('../src/sockets');
const { User, Interview } = require('../src/models');
const config = require('../src/config/env');

describe('Socket.io Real-Time Coding Room', () => {
  let server;
  let serverPort;
  let serverUrl;
  let interviewer;
  let candidate;
  let outsider;
  let ivToken;
  let cdToken;
  let outToken;
  let testRoomId;
  const socketsToClose = [];

  const createSocket = (token) => {
    const socket = Client(serverUrl, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
    });
    socketsToClose.push(socket);
    return socket;
  };

  const connectSocket = (token) =>
    new Promise((resolve, reject) => {
      const s = createSocket(token);
      s.on('connect', () => resolve(s));
      s.on('connect_error', reject);
    });

  const waitFor = (socket, event, ms = 2000) =>
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data ?? true);
      });
    });

  const joinRoom = (socket, roomId) =>
    new Promise((resolve) => socket.emit('room:join', { roomId }, resolve));

  beforeAll(async () => {
    server = http.createServer(app);
    initSockets(server);

    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        serverUrl = `http://localhost:${serverPort}`;
        resolve();
      });
    });

    const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

    interviewer = await User.create({
      name: 'Socket Interviewer',
      email: 'socket.interviewer@example.com',
      passwordHash,
      role: 'interviewer',
    });

    candidate = await User.create({
      name: 'Socket Candidate',
      email: 'socket.candidate@example.com',
      passwordHash,
      role: 'candidate',
    });

    outsider = await User.create({
      name: 'Socket Outsider',
      email: 'socket.outsider@example.com',
      passwordHash,
      role: 'candidate',
    });

    ivToken = jwt.sign({ id: interviewer.id, role: interviewer.role }, config.jwt.secret, {
      expiresIn: '1h',
      algorithm: config.jwt.algorithm,
    });
    cdToken = jwt.sign({ id: candidate.id, role: candidate.role }, config.jwt.secret, {
      expiresIn: '1h',
      algorithm: config.jwt.algorithm,
    });
    outToken = jwt.sign({ id: outsider.id, role: outsider.role }, config.jwt.secret, {
      expiresIn: '1h',
      algorithm: config.jwt.algorithm,
    });

    const scheduledAt = new Date(Date.now() + 86400000);
    const endAt = new Date(scheduledAt.getTime() + 60 * 60000);

    const interview = await Interview.create({
      interviewerId: interviewer.id,
      candidateId: candidate.id,
      title: 'Socket Test Session',
      scheduledAt,
      durationMinutes: 60,
      endAt,
      status: 'scheduled',
    });
    testRoomId = interview.roomId;
  });

  afterEach(() => {
    while (socketsToClose.length > 0) {
      const s = socketsToClose.pop();
      if (s.connected) s.disconnect();
    }
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  // 1. Connection without token rejected
  test('1. Handshake without an access token is rejected', async () => {
    await expect(connectSocket(null)).rejects.toThrow(/Access token missing/);
  });

  // 2. Connection with invalid token rejected
  test('2. Handshake with invalid or tampered token is rejected', async () => {
    await expect(connectSocket('invalid.token.payload')).rejects.toThrow(/Invalid or expired token/);
  });

  // 3. Outsider rejected from room join
  test('3. Non-participant (outsider) is rejected from joining room', async () => {
    const outSocket = await connectSocket(outToken);
    const joinRes = await joinRoom(outSocket, testRoomId);
    expect(joinRes.ok).toBe(false);
    expect(joinRes.message).toMatch(/not found/i);
  });

  // 4. Authorized interviewer joins
  test('4. Authorized interviewer joins room successfully with room code buffer', async () => {
    const ivSocket = await connectSocket(ivToken);
    const joinRes = await joinRoom(ivSocket, testRoomId);
    expect(joinRes.ok).toBe(true);
    expect(joinRes.code).toBe('');
    expect(joinRes.language).toBe('javascript');
  });

  // 5. Candidate joins and participants = 2
  test('5. Candidate joins room, participant list contains 2 users', async () => {
    const ivSocket = await connectSocket(ivToken);
    await joinRoom(ivSocket, testRoomId);

    const cdSocket = await connectSocket(cdToken);
    const cdJoinRes = await joinRoom(cdSocket, testRoomId);

    expect(cdJoinRes.ok).toBe(true);
    expect(cdJoinRes.participants).toHaveLength(2);
    expect(cdJoinRes.participants).toContain(interviewer.id);
    expect(cdJoinRes.participants).toContain(candidate.id);
  });

  // 6. User joined broadcast
  test('6. Interviewer is notified via user:joined when candidate joins', async () => {
    const ivSocket = await connectSocket(ivToken);
    await joinRoom(ivSocket, testRoomId);

    const userJoinedPromise = waitFor(ivSocket, 'user:joined');

    const cdSocket = await connectSocket(cdToken);
    await joinRoom(cdSocket, testRoomId);

    const joinedEvent = await userJoinedPromise;
    expect(joinedEvent).toBeDefined();
    expect(joinedEvent.userId).toBe(candidate.id);
  });

  // 7. Code sync
  test('7. Code change emitted by interviewer is broadcast to candidate', async () => {
    const ivSocket = await connectSocket(ivToken);
    await joinRoom(ivSocket, testRoomId);

    const cdSocket = await connectSocket(cdToken);
    await joinRoom(cdSocket, testRoomId);

    const codeUpdatePromise = waitFor(cdSocket, 'code:update');
    ivSocket.emit('code:change', { roomId: testRoomId, code: 'console.log("hello world");' });

    const update = await codeUpdatePromise;
    expect(update).toBeDefined();
    expect(update.code).toBe('console.log("hello world");');
    expect(update.from).toBe(interviewer.id);
  });

  // 8. Code length ceiling enforcement
  test('8. Code change exceeding 50,000 characters is rejected without broadcast', async () => {
    const ivSocket = await connectSocket(ivToken);
    await joinRoom(ivSocket, testRoomId);

    const cdSocket = await connectSocket(cdToken);
    await joinRoom(cdSocket, testRoomId);

    const codeUpdatePromise = waitFor(cdSocket, 'code:update', 500);
    const massiveCode = 'x'.repeat(50001);
    ivSocket.emit('code:change', { roomId: testRoomId, code: massiveCode });

    const update = await codeUpdatePromise;
    expect(update).toBeNull();
  });

  // 9. Outsider cannot push code
  test('9. User outside the room cannot emit code changes into the room', async () => {
    const outSocket = await connectSocket(outToken);
    const cdSocket = await connectSocket(cdToken);
    await joinRoom(cdSocket, testRoomId);

    const leakPromise = waitFor(cdSocket, 'code:update', 500);
    outSocket.emit('code:change', { roomId: testRoomId, code: 'HACKED' });

    const leak = await leakPromise;
    expect(leak).toBeNull();
  });

  // 10. Typing indicator broadcast
  test('10. Typing event emitted by candidate is broadcast to interviewer', async () => {
    const ivSocket = await connectSocket(ivToken);
    await joinRoom(ivSocket, testRoomId);

    const cdSocket = await connectSocket(cdToken);
    await joinRoom(cdSocket, testRoomId);

    const typingPromise = waitFor(ivSocket, 'typing');
    cdSocket.emit('typing', { roomId: testRoomId });

    const typing = await typingPromise;
    expect(typing).toBeDefined();
    expect(typing.userId).toBe(candidate.id);
  });

  // 11. Reconnection recovers current code buffer
  test('11. Reconnecting candidate receives latest room code buffer', async () => {
    const ivSocket = await connectSocket(ivToken);
    await joinRoom(ivSocket, testRoomId);

    const cdSocket = await connectSocket(cdToken);
    await joinRoom(cdSocket, testRoomId);

    // Set latest code in room
    ivSocket.emit('code:change', { roomId: testRoomId, code: 'function add(a, b) { return a + b; }' });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Candidate disconnects
    const leftPromise = waitFor(ivSocket, 'user:left');
    cdSocket.disconnect();
    const left = await leftPromise;
    expect(left).toBeDefined();

    // Candidate reconnects and rejoins
    const cdSocket2 = await connectSocket(cdToken);
    const rejoinRes = await joinRoom(cdSocket2, testRoomId);

    expect(rejoinRes.ok).toBe(true);
    expect(rejoinRes.code).toBe('function add(a, b) { return a + b; }');
  });
});

