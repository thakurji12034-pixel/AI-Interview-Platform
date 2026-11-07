const { analyticsService } = require('../services/analyticsService');
const AppError = require('../utils/AppError');

class AnalyticsController {
  async getCandidateAnalytics(req, res, next) {
    try {
      let targetUserId = req.user.id;
      if (req.user.role === 'admin' && req.query.candidateId) {
        targetUserId = parseInt(req.query.candidateId, 10);
      } else if (req.user.role !== 'candidate' && req.user.role !== 'admin') {
        throw new AppError('Forbidden: Only candidates or administrators can view candidate analytics', 403, 'FORBIDDEN');
      }

      const analytics = await analyticsService.getCandidateAnalytics({
        userId: targetUserId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      });

      return res.json({ analytics });
    } catch (err) {
      next(err);
    }
  }

  async getInterviewerAnalytics(req, res, next) {
    try {
      if (req.user.role === 'candidate') {
        throw new AppError('Forbidden: Candidates cannot access interviewer analytics', 403, 'FORBIDDEN');
      }

      let targetUserId = req.user.id;
      if (req.user.role === 'admin' && req.query.interviewerId) {
        targetUserId = parseInt(req.query.interviewerId, 10);
      }

      const analytics = await analyticsService.getInterviewerAnalytics({
        userId: targetUserId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      });

      return res.json({ analytics });
    } catch (err) {
      next(err);
    }
  }

  async getAdminAnalytics(req, res, next) {
    try {
      if (req.user.role !== 'admin') {
        throw new AppError('Forbidden: Administrator access required', 403, 'FORBIDDEN');
      }

      const analytics = await analyticsService.getAdminAnalytics({
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      });

      return res.json({ analytics });
    } catch (err) {
      next(err);
    }
  }
}

const analyticsController = new AnalyticsController();
module.exports = { AnalyticsController, analyticsController };

