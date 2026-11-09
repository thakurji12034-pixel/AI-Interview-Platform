const { Buffer } = require('buffer');
const Y = require('yjs');
const { CodeSnapshot, RoomSession } = require('../models');

const CLEANUP_AFTER_MS = 10 * 60 * 1000; // 10 minutes
const SNAPSHOT_DEBOUNCE_MS = 3000; // 3 seconds debounce for auto-saving snapshots

class RoomStore {
  constructor() {
    this.rooms = new Map();
  }

  async getOrCreateRoom(roomId, interviewId = null, initialCode = '', initialLanguage = 'javascript') {
    if (this.rooms.has(roomId)) {
      const room = this.rooms.get(roomId);
      if (room.cleanupTimer) {
        clearTimeout(room.cleanupTimer);
        room.cleanupTimer = null;
      }
      if (interviewId && !room.interviewId) {
        room.interviewId = interviewId;
      }
      return room;
    }

    const doc = new Y.Doc();
    const ytext = doc.getText('monaco');
    const metadata = doc.getMap('metadata');

    const room = {
      roomId,
      interviewId,
      doc,
      ytext,
      metadata,
      code: '',
      language: initialLanguage,
      version: 0,
      cleanupTimer: null,
      debounceTimer: null,
      socketRateLimits: new Map(),
    };

    // Attempt to restore state from latest snapshot
    try {
      const latestSnapshot = await CodeSnapshot.findOne({
        where: { roomId },
        order: [['createdAt', 'DESC']],
      });

      if (latestSnapshot) {
        if (latestSnapshot.yjsUpdate && latestSnapshot.yjsUpdate.length > 0) {
          Y.applyUpdate(doc, new Uint8Array(latestSnapshot.yjsUpdate));
        } else if (latestSnapshot.codeContent) {
          ytext.insert(0, latestSnapshot.codeContent);
        }
        room.code = ytext.toString();
        room.language = latestSnapshot.language || initialLanguage;
        room.version = latestSnapshot.version || 1;
        metadata.set('language', room.language);
      } else {
        if (initialCode) {
          ytext.insert(0, initialCode);
        }
        room.code = initialCode;
        room.language = initialLanguage;
        metadata.set('language', initialLanguage);
      }
    } catch (err) {
      console.error(`Failed to load snapshot for room ${roomId}:`, err.message);
      if (initialCode && ytext.length === 0) {
        ytext.insert(0, initialCode);
      }
      room.code = ytext.toString();
      metadata.set('language', initialLanguage);
    }

    // Auto-update room.code on every Yjs document update and debounce snapshot save
    doc.on('update', () => {
      room.code = ytext.toString();
      this.scheduleDebouncedSnapshot(room);
    });

    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  scheduleDebouncedSnapshot(room, delayMs = SNAPSHOT_DEBOUNCE_MS) {
    if (room.debounceTimer) {
      clearTimeout(room.debounceTimer);
    }
    room.debounceTimer = setTimeout(() => {
      this.saveSnapshot(room.roomId).catch((err) => {
        console.error(`Debounced snapshot save error for room ${room.roomId}:`, err.message);
      });
    }, delayMs);
  }

  async saveSnapshot(roomId, createdById = null) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    if (room.debounceTimer) {
      clearTimeout(room.debounceTimer);
      room.debounceTimer = null;
    }

    const codeContent = room.ytext.toString();
    const yjsUpdate = Buffer.from(Y.encodeStateAsUpdate(room.doc));
    const language = room.metadata.get('language') || room.language || 'javascript';
    room.version = (room.version || 0) + 1;

    try {
      const snapshot = await CodeSnapshot.create({
        roomId,
        interviewId: room.interviewId,
        language,
        codeContent,
        yjsUpdate,
        version: room.version,
        createdById,
      });
      return snapshot;
    } catch (err) {
      console.error(`Error saving snapshot for room ${roomId}:`, err.message);
      return null;
    }
  }

  async recordUserJoin(roomId, interviewId, userId, role = 'candidate') {
    try {
      return await RoomSession.create({
        roomId,
        interviewId,
        userId,
        role,
        joinedAt: new Date(),
      });
    } catch (err) {
      console.error(`Error recording user join for room ${roomId}:`, err.message);
      return null;
    }
  }

  async recordUserLeave(sessionId) {
    if (!sessionId) return;
    try {
      const session = await RoomSession.findByPk(sessionId);
      if (session && !session.leftAt) {
        const now = new Date();
        const durationSeconds = Math.max(0, Math.floor((now.getTime() - new Date(session.joinedAt).getTime()) / 1000));
        await session.update({ leftAt: now, durationSeconds });
      }
    } catch (err) {
      console.error(`Error recording user leave for session ${sessionId}:`, err.message);
    }
  }

  checkRateLimit(socketId, maxPerSec = 60) {
    const now = Date.now();
    const roomStores = this.rooms.values();
    for (const room of roomStores) {
      if (!room.socketRateLimits.has(socketId)) {
        room.socketRateLimits.set(socketId, { count: 1, resetAt: now + 1000 });
        return true;
      }
      const record = room.socketRateLimits.get(socketId);
      if (now > record.resetAt) {
        record.count = 1;
        record.resetAt = now + 1000;
        return true;
      }
      record.count++;
      if (record.count > maxPerSec) {
        return false;
      }
      return true;
    }
    return true;
  }

  scheduleCleanup(roomId, io) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);

    // Save snapshot on last participant leave
    this.saveSnapshot(roomId).catch((err) => {
      console.error(`Final leave snapshot save error for room ${roomId}:`, err.message);
    });

    room.cleanupTimer = setTimeout(() => {
      const size = io?.sockets?.adapter?.rooms?.get(roomId)?.size || 0;
      if (size === 0) {
        this.rooms.delete(roomId);
      }
    }, CLEANUP_AFTER_MS);
  }
}

const roomStore = new RoomStore();
module.exports = { roomStore, RoomStore };
