const { evaluationService } = require('../services/evaluationService');
const { InterviewReport } = require('../models');
const AppError = require('../utils/AppError');

class EvaluationController {
  async evaluateAnswer(req, res, next) {
    try {
      const evaluation = await evaluationService.queueAnswerEvaluation(req.params.answerId, req.user);
      return res.status(202).json({
        message: 'Evaluation queued successfully',
        evaluation: {
          id: evaluation.id,
          status: evaluation.status,
          disclaimer: evaluation.disclaimer,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getEvaluation(req, res, next) {
    try {
      const evaluation = await evaluationService.getEvaluationById(req.params.id, req.user);
      return res.json({ evaluation });
    } catch (err) {
      next(err);
    }
  }

  async addOverride(req, res, next) {
    try {
      const { overrideScore, humanNotes } = req.body;
      const override = await evaluationService.addHumanOverride({
        evaluationId: req.params.id,
        user: req.user,
        overrideScore,
        humanNotes,
      });

      return res.status(201).json({
        message: 'Human override recorded successfully',
        override,
      });
    } catch (err) {
      next(err);
    }
  }

  async generateReport(req, res, next) {
    try {
      const report = await evaluationService.generateReport(req.params.sessionId, req.user);
      return res.status(201).json({ report });
    } catch (err) {
      next(err);
    }
  }

  async getReport(req, res, next) {
    try {
      const report = await InterviewReport.findOne({
        where: { sessionId: req.params.sessionId },
      });

      if (!report) {
        throw new AppError('Report not found for this session', 404, 'REPORT_NOT_FOUND');
      }

      if (req.user.role === 'candidate' && report.candidateId !== req.user.id) {
        throw new AppError('Report not found for this session', 404, 'REPORT_NOT_FOUND');
      }

      return res.json({ report });
    } catch (err) {
      next(err);
    }
  }

  async listReports(req, res, next) {
    try {
      const where = {};
      if (req.user.role === 'candidate') {
        where.candidateId = req.user.id;
      }
      const reports = await InterviewReport.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: 50,
      });
      return res.json({ reports });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EvaluationController();
