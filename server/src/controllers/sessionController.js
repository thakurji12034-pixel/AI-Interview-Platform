const { sessionService } = require('../services/sessionService');

class SessionController {
  async create(req, res, next) {
    try {
      const { type, difficulty, mode, durationMinutes } = req.body;
      const session = await sessionService.createSession({
        userId: req.user.id,
        interviewerId: req.user.role === 'interviewer' ? req.user.id : null,
        type,
        difficulty,
        mode,
        durationMinutes,
      });

      return res.status(201).json({ session });
    } catch (err) {
      next(err);
    }
  }

  async start(req, res, next) {
    try {
      const session = await sessionService.startSession(req.params.id, req.user);
      return res.json({ session });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const session = await sessionService.getSessionById(req.params.id, req.user);
      return res.json({ session });
    } catch (err) {
      next(err);
    }
  }

  async submitAnswer(req, res, next) {
    try {
      const { sessionQuestionId, answerText, codeSnippet, language, timeSpentSeconds } = req.body;
      const answer = await sessionService.submitAnswer({
        sessionId: req.params.id,
        sessionQuestionId,
        user: req.user,
        answerText,
        codeSnippet,
        language,
        timeSpentSeconds,
      });

      return res.status(201).json({ answer });
    } catch (err) {
      next(err);
    }
  }

  async complete(req, res, next) {
    try {
      const session = await sessionService.completeSession(req.params.id, req.user);
      return res.json({ session });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SessionController();
