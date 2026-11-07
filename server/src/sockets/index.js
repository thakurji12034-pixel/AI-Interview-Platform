const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Interview, User } = require('../models');
const config = require('../config/env');

const MAX_CODE_LENGTH = 50000;
const LANGUAGES = ['javascript', 'python', 'java', 'cpp'];
const CLEANUP_AFTER_MS = 10 * 60 * 1000; // Inactive room buffer expires after 10 minutes

// In-memory room store: Map<roomId, { code, language, timer }>
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { code: '', language: 'javascript', timer: null });
  }
  const room = rooms.get(roomId);
  clearTimeout(room.timer); // Cancel pending cleanup on participant return
  room.timer = null;
  return room;
}

function initSockets(server) {
  const io = new Server(server, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
  });

  const scheduleCleanup = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    clearTimeout(room.timer);
    room.timer = setTimeout(() => {
      const size = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      if (size === 0) rooms.delete(roomId);
    }, CLEANUP_AFTER_MS);
  };

  // Authenticate socket handshake using JWT access token with pinned algorithm
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

        // Authorize room join: user must be the assigned interviewer or candidate
        const interview = await Interview.findOne({
          where: {
            roomId,
            [Op.or]: [{ interviewerId: user.id }, { candidateId: user.id }],
          },
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

        socket.join(roomId);
        const room = getRoom(roomId);

        const sockets = await io.in(roomId).fetchSockets();
        const participants = [...new Set(sockets.map((s) => s.data.user.id))];

        socket.to(roomId).emit('user:joined', { userId: user.id });
        ack({
          ok: true,
          code: room.code,
          language: room.language,
          participants,
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

    socket.on('code:change', (payload) => {
      const { roomId, code } = payload || {};
      // Verify user has joined the room and code adheres to size limit
      if (!socket.rooms.has(roomId)) return;
      if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) return;

      const room = rooms.get(roomId);
      if (!room) return;

      room.code = code;
      socket.to(roomId).emit('code:update', { code, from: user.id });
    });

    socket.on('language:change', (payload) => {
      const { roomId, language } = payload || {};
      if (!socket.rooms.has(roomId) || !LANGUAGES.includes(language)) return;

      const room = rooms.get(roomId);
      if (!room) return;

      room.language = language;
      socket.to(roomId).emit('language:update', { language, from: user.id });
    });

    socket.on('typing', (payload) => {
      const roomId = payload?.roomId;
      if (socket.rooms.has(roomId)) {
        socket.to(roomId).emit('typing', { userId: user.id });
      }
    });

    socket.on('disconnecting', () => {
      socket.data.joinedRooms = [...socket.rooms].filter((r) => r !== socket.id);
      for (const roomId of socket.data.joinedRooms) {
        socket.to(roomId).emit('user:left', { userId: user.id });
      }
    });

    socket.on('disconnect', () => {
      for (const roomId of socket.data.joinedRooms || []) {
        const size = io.sockets.adapter.rooms.get(roomId)?.size || 0;
        if (size === 0) scheduleCleanup(roomId);
      }
    });
  });

  return io;
}

module.exports = { initSockets };
