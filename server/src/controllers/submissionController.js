const submissionService = require('../services/submissionService');
const { logAudit } = require('../services/auditService');

async function createSubmission(req, res, next) {
  try {
    const submission = await submissionService.createSubmission({
      userId: req.user.id,
      questionId: req.body.questionId,
      assessmentId: req.body.assessmentId || null,
      language: req.body.language,
      code: req.body.code,
    });

    await logAudit({
      actorId: req.user.id,
      action: 'CODE_SUBMITTED',
      targetType: 'Submission',
      targetId: submission.id,
      details: { questionId: req.body.questionId, language: req.body.language },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      submission: submissionService.serializeSubmission(submission, req.user.role),
    });
  } catch (err) {
    next(err);
  }
}

async function getSubmission(req, res, next) {
  try {
    const submission = await submissionService.getSubmissionById(req.params.id, req.user);
    res.json({
      submission: submissionService.serializeSubmission(submission, req.user.role),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSubmission,
  getSubmission,
};
