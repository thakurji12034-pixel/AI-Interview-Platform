const questionService = require('../services/questionService');
const { serializeQuestion, serializeQuestions } = require('../serializers/questionSerializer');
const { logAudit } = require('../services/auditService');

async function listQuestions(req, res, next) {
  try {
    const result = await questionService.listQuestions(req.query, req.user.role);
    res.json({
      questions: serializeQuestions(result.questions, req.user.role),
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

async function getQuestion(req, res, next) {
  try {
    const question = await questionService.getQuestionById(req.params.id);
    res.json({
      question: serializeQuestion(question, req.user.role),
    });
  } catch (err) {
    next(err);
  }
}

async function createQuestion(req, res, next) {
  try {
    const question = await questionService.createQuestion(req.body, req.user.id);
    await logAudit({
      actorId: req.user.id,
      action: 'QUESTION_CREATED',
      targetType: 'Question',
      targetId: question.id,
      details: { title: question.title, domain: question.domain },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      question: serializeQuestion(question, req.user.role),
    });
  } catch (err) {
    next(err);
  }
}

async function updateQuestion(req, res, next) {
  try {
    const question = await questionService.updateQuestion(req.params.id, req.body);
    await logAudit({
      actorId: req.user.id,
      action: 'QUESTION_UPDATED',
      targetType: 'Question',
      targetId: question.id,
      details: { title: question.title },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      question: serializeQuestion(question, req.user.role),
    });
  } catch (err) {
    next(err);
  }
}

async function deleteQuestion(req, res, next) {
  try {
    const result = await questionService.deleteQuestion(req.params.id);
    await logAudit({
      actorId: req.user.id,
      action: 'QUESTION_ARCHIVED',
      targetType: 'Question',
      targetId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getRandomQuestions(req, res, next) {
  try {
    const questions = await questionService.selectRandomQuestions({
      domain: req.query.domain,
      difficulty: req.query.difficulty,
      count: parseInt(req.query.count, 10) || 3,
      candidateId: req.query.candidateId ? parseInt(req.query.candidateId, 10) : null,
    });

    res.json({
      questions: serializeQuestions(questions, req.user.role),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getRandomQuestions,
};
