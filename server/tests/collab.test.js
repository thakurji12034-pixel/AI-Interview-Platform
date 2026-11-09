const http = require('http');
const request = require('supertest');
const { io: Client } = require('socket.io-client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Y = require('yjs');
const app = require('../src/app');
const { initYjsSockets } = require('../src/sockets/yjsHandler');
const { roomStore } = require('../src/sockets/roomStore');
const { User, Interview, CodeSnapshot, RoomSession } = require('../src/models');
const config = require('../src/config/env');

describe('Yjs Collaborative Editor & Persistent Snapshots (/sockets, /interviews/:id/snapshots)', () => {
  let server;
  let serverPort;
  let serverUrl;
  let interviewer;
  let candidate;
  let observerUser;
  let outsider;
  let ivToken;
  let cdToken;
  let obToken;
  let outToken;
  let interview;
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

  const waitFor = (socket, event, ms = 2500) =>
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data ?? true);
      });
    });

  const joinRoom = (socket, roomId, extra = {}) =>
    new Promise((resolve) => socket.emit('room:join', { roomId, ...extra }, resolve));

  beforeAll(async () => {
    server = http.createServer(app);
    initYjsSockets(server);

    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        serverUrl = `http://localhost:${serverPort}`;
        resolve();
      });
    });

    const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

    interviewer = await User.create({
      name: 'Collab Interviewer',
      email: 'collab.interviewer@example.com',
      passwordHash,
      role: 'interviewer',
    });

    candidate = await User.create({
      name: 'Collab Candidate',
      email: 'collab.candidate@example.com',
      passwordHash,
      role: 'candidate',
    });

    observerUser = await User.create({
      name: 'Collab Observer',
      email: 'collab.observer@example.com',
      passwordHash,
      role: 'admin',
    });

    outsider = await User.create({
      name: 'Collab Outsider',
      email: 'collab.outsider@example.com',
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
    obToken = jwt.sign({ id: observerUser.id, role: observerUser.role }, config.jwt.secret, {
      expiresIn: '1h',
      algorithm: config.jwt.algorithm,
    });
    outToken = jwt.sign({ id: outsider.id, role: outsider.role }, config.jwt.secret, {
      expiresIn: '1h',
      algorithm: config.jwt.algorithm,
    });

    const scheduledAt = new Date(Date.now() + 86400000);
    const endAt = new Date(scheduledAt.getTime() + 60 * 60000);

    interview = await Interview.create({
      interviewerId: interviewer.id,
      candidateId: candidate.id,
      title: 'Collab Test Session',
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

  describe('Authentication & Room Join Authorization', () => {
    test('1. Reject connection without JWT access token', async () => {
      await expect(connectSocket(null)).rejects.toThrow(/Access token missing/);
    });

    test('2. Non-participant (outsider) cannot join collaborative room', async () => {
      const outSocket = await connectSocket(outToken);
      const res = await joinRoom(outSocket, testRoomId);
      expect(res.ok).toBe(false);
      expect(res.message).toMatch(/not found/i);
    });

    test('3. Authorized interviewer joins and receives state vector', async () => {
      const ivSocket = await connectSocket(ivToken);
      const res = await joinRoom(ivSocket, testRoomId);
      expect(res.ok).toBe(true);
      expect(res.language).toBe('javascript');
      expect(typeof res.stateVector).toBe('string');
      expect(res.isObserver).toBe(false);
    });
  });

  describe('Yjs Two-Step Synchronization Protocol', () => {
    test('4. Client exchanges state vector and receives initial server Yjs update', async () => {
      const cdSocket = await connectSocket(cdToken);
      await joinRoom(cdSocket, testRoomId);

      const clientDoc = new Y.Doc();
      const stateVector = Y.encodeStateVector(clientDoc);

      const syncStep2 = waitFor(cdSocket, 'yjs:sync-step-2');
      cdSocket.emit('yjs:sync-step-1', { roomId: testRoomId, stateVector });

      const syncRes = await syncStep2;
      expect(syncRes).toBeDefined();
      expect(syncRes.roomId).toBe(testRoomId);
      expect(syncRes.update).toBeDefined();

      const updateBin = new Uint8Array(syncRes.update);
      Y.applyUpdate(clientDoc, updateBin);
      expect(clientDoc.getText('monaco').toString()).toBe('');
    });
  });

  describe('Real-Time CRDT Collaborative Synchronization', () => {
    test('5. Updates typed by participant A propagate and converge conflict-free on participant B', async () => {
      const ivSocket = await connectSocket(ivToken);
      const cdSocket = await connectSocket(cdToken);

      await joinRoom(ivSocket, testRoomId);
      await joinRoom(cdSocket, testRoomId);

      const ivDoc = new Y.Doc();
      const cdDoc = new Y.Doc();

      const ivText = ivDoc.getText('monaco');
      const cdText = cdDoc.getText('monaco');

      // Listen for peer Yjs updates
      const cdUpdatePromise = waitFor(cdSocket, 'yjs:update');

      // Participant A inserts code
      ivDoc.on('update', (update, origin) => {
        if (origin !== 'remote') {
          ivSocket.emit('yjs:update', { roomId: testRoomId, update });
        }
      });

      ivText.insert(0, 'function add(a, b) {\n  return a + b;\n}');

      const receivedUpdate = await cdUpdatePromise;
      expect(receivedUpdate).toBeDefined();
      expect(receivedUpdate.roomId).toBe(testRoomId);
      expect(receivedUpdate.from).toBe(interviewer.id);

      // Participant B applies update
      Y.applyUpdate(cdDoc, new Uint8Array(receivedUpdate.update), 'remote');
      expect(cdText.toString()).toBe('function add(a, b) {\n  return a + b;\n}');
    });

    test('6. Language change updates shared metadata and broadcasts to participants', async () => {
      const ivSocket = await connectSocket(ivToken);
      const cdSocket = await connectSocket(cdToken);

      await joinRoom(ivSocket, testRoomId);
      await joinRoom(cdSocket, testRoomId);

      const langUpdatePromise = waitFor(cdSocket, 'language:update');
      ivSocket.emit('language:change', { roomId: testRoomId, language: 'python' });

      const langRes = await langUpdatePromise;
      expect(langRes).toBeDefined();
      expect(langRes.language).toBe('python');

      const room = roomStore.getRoom(testRoomId);
      expect(room.language).toBe('python');
      expect(room.metadata.get('language')).toBe('python');
    });
  });

  describe('Server-Authoritative Read-Only Observer Protection', () => {
    test('7. Observer socket cannot mutate document (updates are dropped by server)', async () => {
      const obSocket = await connectSocket(obToken);
      const ivSocket = await connectSocket(ivToken);

      // Join as observer
      const obJoin = await joinRoom(obSocket, testRoomId, { role: 'observer' });
      expect(obJoin.ok).toBe(true);
      expect(obJoin.isObserver).toBe(true);

      await joinRoom(ivSocket, testRoomId);

      const ivUpdateReceived = waitFor(ivSocket, 'yjs:update', 800);

      const hackerDoc = new Y.Doc();
      const hackerText = hackerDoc.getText('monaco');
      hackerText.insert(0, '// HACK ATTEMPT FROM OBSERVER');
      const hackerUpdate = Y.encodeStateAsUpdate(hackerDoc);

      // Attempt to transmit update from observer socket
      obSocket.emit('yjs:update', { roomId: testRoomId, update: hackerUpdate });

      const result = await ivUpdateReceived;
      expect(result).toBeNull(); // Update was dropped by server

      const room = roomStore.getRoom(testRoomId);
      expect(room.ytext.toString()).not.toContain('HACK ATTEMPT');
    });
  });

  describe('Persistent Snapshots & Restoration', () => {
    test('8. Explicit snapshot:save event creates code_snapshots record', async () => {
      const ivSocket = await connectSocket(ivToken);
      await joinRoom(ivSocket, testRoomId);

      const saveRes = await new Promise((resolve) =>
        ivSocket.emit('snapshot:save', { roomId: testRoomId }, resolve)
      );

      expect(saveRes.ok).toBe(true);
      expect(saveRes.version).toBeGreaterThanOrEqual(1);

      const snapshot = await CodeSnapshot.findOne({
        where: { roomId: testRoomId },
        order: [['createdAt', 'DESC']],
      });
      expect(snapshot).toBeDefined();
      expect(snapshot.codeContent).toContain('function add');
      expect(snapshot.language).toBe('python');
    });

    test('9. Snapshot restoration recovers code state on fresh room recreation', async () => {
      const room = roomStore.getRoom(testRoomId);
      if (room?.cleanupTimer) clearTimeout(room.cleanupTimer);
      if (room?.debounceTimer) clearTimeout(room.debounceTimer);

      // Force delete active in-memory room
      roomStore.rooms.delete(testRoomId);
      expect(roomStore.getRoom(testRoomId)).toBeUndefined();

      // Re-create room: should restore from CodeSnapshot
      const restoredRoom = await roomStore.getOrCreateRoom(testRoomId, interview.id);
      expect(restoredRoom.code).toContain('function add');
      expect(restoredRoom.language).toBe('python');
      expect(restoredRoom.version).toBeGreaterThanOrEqual(1);
    });

    test('10. GET /api/v1/interviews/:id/snapshots returns snapshot timeline for interviewer', async () => {
      const res = await request(app)
        .get(`/api/v1/interviews/${interview.id}/snapshots`)
        .set('Authorization', `Bearer ${ivToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.snapshots)).toBe(true);
      expect(res.body.snapshots.length).toBeGreaterThanOrEqual(1);
      const pySnapshot = res.body.snapshots.find((s) => s.language === 'python');
      expect(pySnapshot).toBeDefined();
    });
  });

  describe('Room Session Telemetry History', () => {
    test('11. Joining and leaving room logs session events in room_sessions', async () => {
      const cdSocket = await connectSocket(cdToken);
      await joinRoom(cdSocket, testRoomId);

      // Verify open session created
      const openSession = await RoomSession.findOne({
        where: { roomId: testRoomId, userId: candidate.id, leftAt: null },
      });
      expect(openSession).toBeDefined();
      expect(openSession.role).toBe('candidate');

      // Disconnect socket
      cdSocket.disconnect();
      await new Promise((r) => setTimeout(r, 200));

      // Verify session closed with leftAt
      const closedSession = await RoomSession.findByPk(openSession.id);
      expect(closedSession.leftAt).not.toBeNull();
      expect(typeof closedSession.durationSeconds).toBe('number');
    });

    test('12. GET /api/v1/interviews/:id/room-sessions returns participant timeline', async () => {
      const res = await request(app)
        .get(`/api/v1/interviews/${interview.id}/room-sessions`)
        .set('Authorization', `Bearer ${ivToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.sessions)).toBe(true);
      expect(res.body.sessions.length).toBeGreaterThanOrEqual(1);
      expect(res.body.sessions[0].user).toBeDefined();
      expect(res.body.sessions[0].user.name).toBeDefined();
    });

    test('13. Outsider receives 404 on interview snapshots or room-sessions endpoints (IDOR prevention)', async () => {
      const resSnap = await request(app)
        .get(`/api/v1/interviews/${interview.id}/snapshots`)
        .set('Authorization', `Bearer ${outToken}`);
      expect(resSnap.status).toBe(404);

      const resSessions = await request(app)
        .get(`/api/v1/interviews/${interview.id}/room-sessions`)
        .set('Authorization', `Bearer ${outToken}`);
      expect(resSessions.status).toBe(404);
    });
  });
});
