const { Op } = require('sequelize');
const { User, Interview, CodeSnapshot, RoomSession } = require('../models');
const { TRANSITIONS, addMinutes, findClash } = require('../services/interviewService');
const { roomStore } = require('../sockets/roomStore');

const withUsers = [
  { model: User, as: 'interviewer', attributes: ['id', 'name', 'email'] },
  { model: User, as: 'candidate', attributes: ['id', 'name', 'email'] },
];

/**
 * Retrieves interview only if the requesting user is an active participant (interviewer or candidate).
 * Returns null if not found or unauthorized to prevent resource enumeration.
 */
const findMine = (id, userId) =>
  Interview.findOne({
    where: {
      id,
      [Op.or]: [{ interviewerId: userId }, { candidateId: userId }],
    },
    include: withUsers,
  });

exports.create = async (req, res, next) => {
  try {
    const { candidateEmail, title, scheduledAt, durationMinutes } = req.body;

    const candidate = await User.findOne({
      where: { email: candidateEmail, role: 'candidate' },
    });
    if (!candidate) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Candidate not found' },
        message: 'Candidate not found',
      });
    }

    const endAt = addMinutes(scheduledAt, durationMinutes);
    const clash = await findClash({
      userIds: [req.user.id, candidate.id],
      start: scheduledAt,
      end: endAt,
    });
    if (clash) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Time slot clashes with another interview' },
        message: 'Time slot clashes with another interview',
      });
    }

    const interview = await Interview.create({
      interviewerId: req.user.id,
      candidateId: candidate.id,
      title,
      scheduledAt,
      durationMinutes,
      endAt,
    });

    res.status(201).json({ interview });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const where =
      req.user.role === 'interviewer'
        ? { interviewerId: req.user.id }
        : { candidateId: req.user.id };

    const { status } = req.query;
    if (status && Object.keys(TRANSITIONS).includes(status)) {
      where.status = status;
    }

    const interviews = await Interview.findAll({
      where,
      order: [['scheduledAt', 'ASC']],
      include: withUsers,
    });
    res.json({ interviews });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const interview = await findMine(req.params.id, req.user.id);
    if (!interview) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Interview not found' },
        message: 'Interview not found',
      });
    }
    res.json({ interview });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const interview = await findMine(req.params.id, req.user.id);
    if (!interview || interview.interviewerId !== req.user.id) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Interview not found' },
        message: 'Interview not found',
      });
    }
    if (interview.status !== 'scheduled') {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Only scheduled interviews can be edited' },
        message: 'Only scheduled interviews can be edited',
      });
    }

    const title = req.body.title ?? interview.title;
    const scheduledAt = req.body.scheduledAt ?? interview.scheduledAt;
    const durationMinutes = req.body.durationMinutes ?? interview.durationMinutes;
    const endAt = addMinutes(scheduledAt, durationMinutes);

    const clash = await findClash({
      userIds: [interview.interviewerId, interview.candidateId],
      start: scheduledAt,
      end: endAt,
      excludeId: interview.id, // Exclude current interview from conflict calculation
    });
    if (clash) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Time slot clashes with another interview' },
        message: 'Time slot clashes with another interview',
      });
    }

    await interview.update({ title, scheduledAt, durationMinutes, endAt });
    res.json({ interview });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const interview = await findMine(req.params.id, req.user.id);
    if (!interview) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Interview not found' },
        message: 'Interview not found',
      });
    }

    // Only interviewers may advance or complete sessions; candidates may only cancel
    const isInterviewer = interview.interviewerId === req.user.id;
    if (!isInterviewer && status !== 'cancelled') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the interviewer can do this' },
        message: 'Only the interviewer can do this',
      });
    }

    if (!TRANSITIONS[interview.status].includes(status)) {
      return res.status(409).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot change status from ${interview.status} to ${status}`,
        },
        message: `Cannot change status from ${interview.status} to ${status}`,
      });
    }

    await interview.update({ status });

    if (status === 'completed' && interview.roomId) {
      try {
        await roomStore.saveSnapshot(interview.roomId, req.user.id);
      } catch (_snapErr) {
        // Logged internally
      }
    }

    res.json({ interview });
  } catch (err) {
    next(err);
  }
};

exports.getSnapshots = async (req, res, next) => {
  try {
    const interview = await findMine(req.params.id, req.user.id);
    if (!interview && req.user.role !== 'admin') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Interview not found' },
        message: 'Interview not found',
      });
    }

    const target = interview || (await Interview.findByPk(req.params.id));
    if (!target) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Interview not found' },
        message: 'Interview not found',
      });
    }

    if (req.user.role === 'candidate' && target.interviewerId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only interviewer or admin can access snapshots' },
        message: 'Only interviewer or admin can access snapshots',
      });
    }

    const snapshots = await CodeSnapshot.findAll({
      where: { interviewId: target.id },
      attributes: ['id', 'roomId', 'interviewId', 'language', 'codeContent', 'version', 'createdById', 'createdAt'],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    res.json({ snapshots });
  } catch (err) {
    next(err);
  }
};

exports.createSnapshot = async (req, res, next) => {
  try {
    const interview = await findMine(req.params.id, req.user.id);
    if (!interview && req.user.role !== 'admin') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Interview not found' },
        message: 'Interview not found',
      });
    }

    const target = interview || (await Interview.findByPk(req.params.id));
    if (!target) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Interview not found' },
        message: 'Interview not found',
      });
    }

    if (target.interviewerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only interviewer or admin can capture snapshots' },
        message: 'Only interviewer or admin can capture snapshots',
      });
    }

    let snapshot = null;
    if (roomStore.getRoom(target.roomId)) {
      snapshot = await roomStore.saveSnapshot(target.roomId, req.user.id);
    }

    if (!snapshot) {
      const codeContent = req.body.codeContent || '';
      const language = req.body.language || 'javascript';
      snapshot = await CodeSnapshot.create({
        roomId: target.roomId,
        interviewId: target.id,
        language,
        codeContent,
        version: 1,
        createdById: req.user.id,
      });
    }

    res.status(201).json({ snapshot });
  } catch (err) {
    next(err);
  }
};

exports.getRoomSessions = async (req, res, next) => {
  try {
    const interview = await findMine(req.params.id, req.user.id);
    if (!interview && req.user.role !== 'admin') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Interview not found' },
        message: 'Interview not found',
      });
    }

    const target = interview || (await Interview.findByPk(req.params.id));
    if (!target) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Interview not found' },
        message: 'Interview not found',
      });
    }

    if (target.interviewerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only interviewer or admin can view room sessions' },
        message: 'Only interviewer or admin can view room sessions',
      });
    }

    const sessions = await RoomSession.findAll({
      where: { interviewId: target.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['joinedAt', 'ASC']],
    });

    res.json({ sessions });
  } catch (err) {
    next(err);
  }
};

