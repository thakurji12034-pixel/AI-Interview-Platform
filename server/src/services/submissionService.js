const { Submission, Question, User } = require('../models');
const { queueManager, QUEUE_NAMES } = require('../jobs/queueManager');
const { EXECUTION_LIMITS } = require('./execution');
const AppError = require('../utils/AppError');

class SubmissionService {
  async createSubmission({ userId, questionId, assessmentId = null, language, code }) {
    if (!code || typeof code !== 'string') {
      throw new AppError('Code is required', 400, 'INVALID_CODE');
    }

    if (code.length > EXECUTION_LIMITS.maxSourceLength) {
      throw new AppError(
        `Source code exceeds maximum limit of ${EXECUTION_LIMITS.maxSourceLength} characters.`,
        400,
        'CODE_TOO_LARGE'
      );
    }

    const validLanguages = ['javascript', 'python', 'java', 'cpp'];
    if (!validLanguages.includes(language.toLowerCase())) {
      throw new AppError(
        `Unsupported language: ${language}. Valid options are: ${validLanguages.join(', ')}`,
        400,
        'UNSUPPORTED_LANGUAGE'
      );
    }

    const question = await Question.findByPk(questionId);
    if (!question) {
      throw new AppError('Question not found', 404, 'QUESTION_NOT_FOUND');
    }

    const submission = await Submission.create({
      userId,
      questionId,
      assessmentId,
      language: language.toLowerCase(),
      code,
      status: 'queued',
      passedTests: 0,
      totalTests: 0,
    });

    // Enqueue execution job into BullMQ
    await queueManager.addJob(
      QUEUE_NAMES.CODE_EXECUTION,
      'executeSubmission',
      { submissionId: submission.id },
      { jobId: `submission-${submission.id}` }
    );

    return submission;
  }

  async getSubmissionById(id, user) {
    const submission = await Submission.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] },
        { model: Question, as: 'question', attributes: ['id', 'title', 'domain', 'difficulty'] },
      ],
    });

    if (!submission) {
      throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    }

    // Role-based authorization: candidate can only view their own submissions
    if (user.role === 'candidate' && submission.userId !== user.id) {
      throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    }

    return submission;
  }

  /**
   * Sanitizes testResults for candidate responses so hidden test inputs/outputs NEVER leak
   */
  serializeSubmission(submission, role) {
    const plain = typeof submission.toJSON === 'function' ? submission.toJSON() : { ...submission };

    if (role === 'candidate' && Array.isArray(plain.testResults)) {
      plain.testResults = plain.testResults.map((tr) => {
        if (tr.isHidden) {
          // Expose only pass/fail status and test index for hidden tests
          return {
            index: tr.index,
            status: tr.status,
            executionTimeMs: tr.executionTimeMs,
            isHidden: true,
          };
        }
        return tr;
      });
    }

    return plain;
  }
}

module.exports = new SubmissionService();

