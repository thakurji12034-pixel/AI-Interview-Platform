const assessmentService = require('../services/assessmentService');
const { serializeAssessment } = require('../serializers/questionSerializer');
const { logAudit } = require('../services/auditService');

async function listAssessments(req, res, next) {
  try {
    const assessments = await assessmentService.listAssessments(req.user);
    res.json({
      assessments: assessments.map((a) => serializeAssessment(a, req.user.role)),
    });
  } catch (err) {
    next(err);
  }
}

async function getAssessment(req, res, next) {
  try {
    const assessment = await assessmentService.getAssessmentById(req.params.id, req.user);
    res.json({
      assessment: serializeAssessment(assessment, req.user.role),
    });
  } catch (err) {
    next(err);
  }
}

async function createAssessment(req, res, next) {
  try {
    const assessment = await assessmentService.createAssessment(req.body, req.user.id);
    await logAudit({
      actorId: req.user.id,
      action: 'ASSESSMENT_CREATED',
      targetType: 'Assessment',
      targetId: assessment.id,
      details: { title: assessment.title, candidateId: req.body.candidateId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      assessment: serializeAssessment(assessment, req.user.role),
    });
  } catch (err) {
    next(err);
  }
}

async function submitAnswer(req, res, next) {
  try {
    const result = await assessmentService.submitAnswer(
      req.params.id,
      req.body.questionId,
      req.body.candidateCode,
      req.user
    );

    res.json({
      success: true,
      submission: {
        id: result.id,
        status: result.status,
        questionId: result.questionId,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAssessments,
  getAssessment,
  createAssessment,
  submitAnswer,
};
