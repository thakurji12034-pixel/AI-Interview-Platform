const { Buffer } = require('buffer');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Y = require('yjs');
const { Interview, User } = require('../models');
const config = require('../config/env');
const { roomStore } = require('./roomStore');

const MAX_CODE_LENGTH = 50000;
const LANGUAGES = ['javascript', 'python', 'java', 'cpp'];

function toUint8Array(data) {
  if (!data) return null;
  if (data instanceof Uint8Array) return data;
  if (Buffer.isBuffer(data)) return new Uint8Array(data);
  if (typeof data === 'string') return new Uint8Array(Buffer.from(data, 'base64'));
  if (Array.isArray(data)) return new Uint8Array(data);
  if (data.type === 'Buffer' && Array.isArray(data.data)) return new Uint8Array(data.data);
  return null;
}

function initYjsSockets(server) {
  const io = new Server(server, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
    maxHttpBufferSize: 1e6, // 1 MB payload protection
  });

  // Authenticate socket handshake using JWT access token with pinned HS256 algorithm
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Access token missing'));

    try {
      const payload = jwt.verify(token, config.jwt.secret, {
        algorithms: [config.jwt.algorithm],
      });
      socket.data.user = { id: payload.id, role: payload.role };
      next();
    } catch (_err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    socket.on('room:join', async (payload, ack = () => {}) => {
      try {
        const roomId = payload?.roomId;
        if (typeof roomId !== 'string') {
          return ack({ ok: false, message: 'roomId required' });
        }

        // Authorize room join: participant or admin
        const whereClause = { roomId };
        if (user.role !== 'admin') {
          whereClause[Op.or] = [{ interviewerId: user.id }, { candidateId: user.id }];
        }

        const interview = await Interview.findOne({
          where: whereClause,
          include: [
            { model: User, as: 'interviewer', attributes: ['id', 'name'] },
            { model: User, as: 'candidate', attributes: ['id', 'name'] },
          ],
        });

        if (!interview) {
          return ack({ ok: false, message: 'Interview not found' });
        }

        if (!['scheduled', 'in_progress'].includes(interview.status)) {
          return ack({ ok: false, message: `Interview is ${interview.status}` });
        }

        const requestedObserver = payload?.role === 'observer' || payload?.observer === true;
        const isObserver = requestedObserver || (user.role === 'admin' && interview.interviewerId !== user.id && interview.candidateId !== user.id);
        socket.data.isObserver = isObserver;
        socket.data.roomId = roomId;
        socket.data.interviewId = interview.id;

        socket.join(roomId);

        const room = await roomStore.getOrCreateRoom(roomId, interview.id);

        // Record room session join
        const participantRole = isObserver
          ? 'observer'
          : interview.interviewerId === user.id
            ? 'interviewer'
            : 'candidate';

        const session = await roomStore.recordUserJoin(roomId, interview.id, user.id, participantRole);
        if (session) {
          socket.data.roomSessionId = session.id;
        }

        const sockets = await io.in(roomId).fetchSockets();
        const participants = [...new Set(sockets.map((s) => s.data.user.id))];

        socket.to(roomId).emit('user:joined', { userId: user.id, isObserver });

        const stateVector = Buffer.from(Y.encodeStateVector(room.doc));

        ack({
          ok: true,
          code: room.code,
          language: room.language,
          participants,
          isObserver,
          stateVector: stateVector.toString('base64'),
          interview: {
            title: interview.title,
            status: interview.status,
            interviewer: { id: interview.interviewer?.id, name: interview.interviewer?.name },
            candidate: { id: interview.candidate?.id, name: interview.candidate?.name },
          },
        });
      } catch (err) {
        console.error('Socket room:join error:', err);
        ack({ ok: false, message: 'Could not join room' });
      }
    });

    // Yjs sync step 1: client provides stateVector -> server responds with missing update
    socket.on('yjs:sync-step-1', (payload, ack = () => {}) => {
      const { roomId, stateVector } = payload || {};
      if (!socket.rooms.has(roomId)) return ack({ ok: false, message: 'Not in room' });

      const room = roomStore.getRoom(roomId);
      if (!room) return ack({ ok: false, message: 'Room not found' });

      try {
        const sv = toUint8Array(stateVector);
        const diffUpdate = sv ? Y.encodeStateAsUpdate(room.doc, sv) : Y.encodeStateAsUpdate(room.doc);
        const updateBuffer = Buffer.from(diffUpdate);

        socket.emit('yjs:sync-step-2', { roomId, update: updateBuffer });
        ack({ ok: true });
      } catch (err) {
        console.error('yjs:sync-step-1 error:', err);
        ack({ ok: false, message: 'Sync failed' });
      }
    });

    // Yjs incremental update from client
    socket.on('yjs:update', (payload, ack = () => {}) => {
      const { roomId, update } = payload || {};
      if (!socket.rooms.has(roomId)) return ack({ ok: false, message: 'Not in room' });

      // Enforce read-only observer protection: drop updates from observer sockets
      if (socket.data.isObserver) {
        return ack({ ok: false, message: 'Observer is read-only' });
      }

      // Per-socket rate limit check
      if (!roomStore.checkRateLimit(socket.id, 60)) {
        return ack({ ok: false, message: 'Rate limit exceeded' });
      }

      const room = roomStore.getRoom(roomId);
      if (!room) return ack({ ok: false, message: 'Room not found' });

      try {
        const updateBin = toUint8Array(update);
        if (!updateBin) return ack({ ok: false, message: 'Invalid update binary' });

        // Enforce document length limit
        if (room.ytext.length > MAX_CODE_LENGTH) {
          return ack({ ok: false, message: 'Document size limit exceeded' });
        }

        Y.applyUpdate(room.doc, updateBin, socket.id);
        room.code = room.ytext.toString();

        const updateBuffer = Buffer.from(updateBin);
        socket.to(roomId).emit('yjs:update', {
          roomId,
          update: updateBuffer,
          from: user.id,
        });

        // Emit legacy code:update for non-Yjs clients
        socket.to(roomId).emit('code:update', { code: room.code, from: user.id });

        ack({ ok: true });
      } catch (err) {
        console.error('yjs:update error:', err);
        ack({ ok: false, message: 'Update failed' });
      }
    });

    // Yjs awareness protocol relay (cursors, selections, remote user state)
    socket.on('yjs:awareness', (payload) => {
      const { roomId, awarenessUpdate } = payload || {};
      if (!socket.rooms.has(roomId)) return;

      socket.to(roomId).emit('yjs:awareness', {
        roomId,
        awarenessUpdate,
        from: user.id,
      });
    });

    // Manual or triggered snapshot save
    socket.on('snapshot:save', async (payload, ack = () => {}) => {
      const roomId = payload?.roomId || socket.data.roomId;
      if (!socket.rooms.has(roomId)) return ack({ ok: false, message: 'Not in room' });

      try {
        const snapshot = await roomStore.saveSnapshot(roomId, user.id);
        if (snapshot) {
          ack({ ok: true, version: snapshot.version, id: snapshot.id });
        } else {
          ack({ ok: false, message: 'Could not save snapshot' });
        }
      } catch (err) {
        ack({ ok: false, message: err.message });
      }
    });

    // Legacy code:change event handling with automatic Yjs synchronization
    socket.on('code:change', (payload) => {
      const { roomId, code } = payload || {};
      if (!socket.rooms.has(roomId)) return;
      if (socket.data.isObserver) return;
      if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) return;

      const room = roomStore.getRoom(roomId);
      if (!room) return;

      room.doc.transact(() => {
        room.ytext.delete(0, room.ytext.length);
        room.ytext.insert(0, code);
      }, socket.id);

      room.code = code;
      socket.to(roomId).emit('code:update', { code, from: user.id });
    });

    // Legacy language:change event handling with Y.Map metadata sync
    socket.on('language:change', (payload) => {
      const { roomId, language } = payload || {};
      if (!socket.rooms.has(roomId) || !LANGUAGES.includes(language)) return;
      if (socket.data.isObserver) return;

      const room = roomStore.getRoom(roomId);
      if (!room) return;

      room.metadata.set('language', language);
      room.language = language;
      socket.to(roomId).emit('language:update', { language, from: user.id });
    });

    // Typing indicator
    socket.on('typing', (payload) => {
      const roomId = payload?.roomId;
      if (socket.rooms.has(roomId)) {
        socket.to(roomId).emit('typing', { userId: user.id });
      }
    });

    socket.on('disconnecting', async () => {
      socket.data.joinedRooms = [...socket.rooms].filter((r) => r !== socket.id);
      for (const roomId of socket.data.joinedRooms) {
        socket.to(roomId).emit('user:left', { userId: user.id });
      }

      if (socket.data.roomSessionId) {
        await roomStore.recordUserLeave(socket.data.roomSessionId);
      }
    });

    socket.on('disconnect', () => {
      for (const roomId of socket.data.joinedRooms || []) {
        const size = io.sockets.adapter.rooms.get(roomId)?.size || 0;
        if (size === 0) {
          roomStore.scheduleCleanup(roomId, io);
        }
      }
    });
  });

  return io;
}

module.exports = { initYjsSockets };
