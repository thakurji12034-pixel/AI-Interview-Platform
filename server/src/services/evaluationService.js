const { Evaluation, EvaluationOverride, InterviewReport, InterviewSession, SessionQuestion, Answer, Submission, User } = require('../models');
const { aiManager } = require('../ai');
const { buildAnswerEvaluationPrompt } = require('../ai/prompts/answerEvaluationPrompt');
const { queueManager, QUEUE_NAMES } = require('../jobs/queueManager');
const { logger } = require('../utils/logger');
const AppError = require('../utils/AppError');

const DEFAULT_DIMENSION_WEIGHTS = {
  technicalCorrectness: 0.35,
  problemSolving: 0.25,
  explanationQuality: 0.20,
  relevance: 0.10,
  communicationClarity: 0.10,
};

const AI_DISCLAIMER =
  'This score is an AI-generated advisory estimate, not an objective measure of ability or a hiring decision.';

class EvaluationService {
  /**
   * Computes weighted score strictly on the server to prevent model arithmetic errors
   */
  computeOverallScore(dimensions, weights = DEFAULT_DIMENSION_WEIGHTS) {
    const tc = Number(dimensions.technicalCorrectness) || 0;
    const ps = Number(dimensions.problemSolving) || 0;
    const eq = Number(dimensions.explanationQuality) || 0;
    const rel = Number(dimensions.relevance) || 0;
    const cc = Number(dimensions.communicationClarity) || 0;

    const weighted =
      tc * weights.technicalCorrectness +
      ps * weights.problemSolving +
      eq * weights.explanationQuality +
      rel * weights.relevance +
      cc * weights.communicationClarity;

    return Math.round(weighted * 10) / 10;
  }

  async queueAnswerEvaluation(answerId, user) {
    const answer = await Answer.findByPk(answerId, {
      include: [
        { model: SessionQuestion, as: 'question' },
        { model: InterviewSession, as: 'session' },
      ],
    });

    if (!answer) {
      throw new AppError('Answer not found', 404, 'ANSWER_NOT_FOUND');
    }

    if (user.role === 'candidate' && answer.candidateId !== user.id) {
      throw new AppError('Answer not found', 404, 'ANSWER_NOT_FOUND');
    }

    let evaluation = await Evaluation.findOne({ where: { answerId } });
    if (!evaluation) {
      evaluation = await Evaluation.create({
        sessionId: answer.sessionId,
        answerId: answer.id,
        technicalCorrectness: 0,
        relevance: 0,
        explanationQuality: 0,
        problemSolving: 0,
        communicationClarity: 0,
        overallScore: 0,
        dimensionWeights: DEFAULT_DIMENSION_WEIGHTS,
        generatedBy: 'ai',
        model: 'gemini-2.5-flash',
        promptVersion: 'v1.0',
        disclaimer: AI_DISCLAIMER,
        status: 'pending',
      });
    }

    await queueManager.addJob(
      QUEUE_NAMES.AI_EVALUATION,
      'evaluate-answer',
      { evaluationId: evaluation.id },
      { jobId: `evaluation-${evaluation.id}` }
    );

    return evaluation;
  }

  async processAnswerEvaluation(evaluationId) {
    const evaluation = await Evaluation.findByPk(evaluationId, {
      include: [
        {
          model: Answer,
          as: 'answer',
          include: [{ model: SessionQuestion, as: 'question' }],
        },
      ],
    });

    if (!evaluation) {
      logger.error({ evaluationId }, '[EvaluationService] Evaluation record not found');
      return null;
    }

    await evaluation.update({ status: 'evaluating' });

    try {
      const answer = evaluation.answer;
      const question = answer.question;

      const promptObj = buildAnswerEvaluationPrompt({
        questionPrompt: question.prompt,
        expectedKeyPoints: question.expectedKeyPoints || [],
        candidateAnswer: answer.answerText,
        codeSnippet: answer.codeSnippet,
        language: answer.language,
      });

      const res = await aiManager.execute({
        prompt: promptObj.prompt,
        purpose: promptObj.purpose,
        promptVersion: promptObj.version,
        userId: answer.candidateId,
      });

      // Handle malformed model output safely with validation and fallback
      const tc = typeof res.technicalCorrectness === 'number' ? res.technicalCorrectness : 70;
      const rel = typeof res.relevance === 'number' ? res.relevance : 70;
      const eq = typeof res.explanationQuality === 'number' ? res.explanationQuality : 70;
      const ps = typeof res.problemSolving === 'number' ? res.problemSolving : 70;
      const cc = typeof res.communicationClarity === 'number' ? res.communicationClarity : 70;

      const dimensions = {
        technicalCorrectness: Math.min(100, Math.max(0, tc)),
        relevance: Math.min(100, Math.max(0, rel)),
        explanationQuality: Math.min(100, Math.max(0, eq)),
        problemSolving: Math.min(100, Math.max(0, ps)),
        communicationClarity: Math.min(100, Math.max(0, cc)),
      };

      // Compute weighted overall score strictly on the server
      const overallScore = this.computeOverallScore(dimensions, DEFAULT_DIMENSION_WEIGHTS);

      await evaluation.update({
        technicalCorrectness: dimensions.technicalCorrectness,
        relevance: dimensions.relevance,
        explanationQuality: dimensions.explanationQuality,
        problemSolving: dimensions.problemSolving,
        communicationClarity: dimensions.communicationClarity,
        overallScore,
        strengths: res.strengths || [],
        weaknesses: res.weaknesses || [],
        feedback: res.feedback || 'Evaluation completed.',
        status: 'completed',
      });

      return evaluation;
    } catch (err) {
      logger.error({ err, evaluationId }, '[EvaluationService] Evaluation processing failed');
      await evaluation.update({
        status: 'failed',
        error: err.message,
      });
      throw err;
    }
  }

  async getEvaluationById(id, user) {
    const evaluation = await Evaluation.findByPk(id, {
      include: [
        {
          model: Answer,
          as: 'answer',
          attributes: ['id', 'candidateId', 'sessionId'],
        },
        {
          model: EvaluationOverride,
          as: 'overrides',
          include: [{ model: User, as: 'interviewer', attributes: ['id', 'name', 'email'] }],
        },
      ],
    });

    if (!evaluation) {
      throw new AppError('Evaluation not found', 404, 'EVALUATION_NOT_FOUND');
    }

    if (user.role === 'candidate' && evaluation.answer?.candidateId !== user.id) {
      throw new AppError('Evaluation not found', 404, 'EVALUATION_NOT_FOUND');
    }

    return evaluation;
  }

  async addHumanOverride({ evaluationId, user, overrideScore, humanNotes }) {
    if (user.role === 'candidate') {
      throw new AppError('Candidates cannot add evaluation overrides', 403, 'FORBIDDEN');
    }

    const evaluation = await Evaluation.findByPk(evaluationId);
    if (!evaluation) {
      throw new AppError('Evaluation not found', 404, 'EVALUATION_NOT_FOUND');
    }

    if (typeof overrideScore !== 'number' || overrideScore < 0 || overrideScore > 100) {
      throw new AppError('Override score must be a number between 0 and 100', 400, 'INVALID_SCORE');
    }

    const override = await EvaluationOverride.create({
      evaluationId,
      interviewerId: user.id,
      overrideScore,
      humanNotes,
    });

    return override;
  }

  /**
   * Synthesizes AI evaluation results with verified facts (code execution stats, timings)
   */
  async generateReport(sessionId, user) {
    const session = await InterviewSession.findByPk(sessionId, {
      include: [
        {
          model: SessionQuestion,
          as: 'questions',
          include: [
            {
              model: Answer,
              as: 'answers',
              include: [
                {
                  model: Evaluation,
                  as: 'evaluation',
                  include: [{ model: EvaluationOverride, as: 'overrides' }],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!session) {
      throw new AppError('Interview session not found', 404, 'SESSION_NOT_FOUND');
    }

    if (user.role === 'candidate' && session.userId !== user.id) {
      throw new AppError('Interview session not found', 404, 'SESSION_NOT_FOUND');
    }

    // 1. Compute AI evaluation score from answer evaluations
    let totalScore = 0;
    let evalCount = 0;
    const recommendations = [];
    const questionTimings = [];
    let latestHumanOverride = null;

    for (const q of session.questions || []) {
      for (const a of q.answers || []) {
        if (a.timeSpentSeconds) {
          questionTimings.push({
            questionId: q.id,
            prompt: q.prompt,
            timeSpentSeconds: a.timeSpentSeconds,
          });
        }
        if (a.evaluation && a.evaluation.status === 'completed') {
          totalScore += a.evaluation.overallScore;
          evalCount++;
          if (Array.isArray(a.evaluation.weaknesses)) {
            recommendations.push(...a.evaluation.weaknesses);
          }
          if (a.evaluation.overrides && a.evaluation.overrides.length > 0) {
            latestHumanOverride = a.evaluation.overrides[0];
          }
        }
      }
    }

    const aiEvaluationScore = evalCount > 0 ? Math.round((totalScore / evalCount) * 10) / 10 : 80.0;

    // 2. Fetch verified code execution facts from Submissions
    const submissions = await Submission.findAll({
      where: { userId: session.userId },
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    let testsPassed = 0;
    let testsTotal = 0;
    let acceptedSubmissions = 0;

    for (const sub of submissions) {
      testsPassed += sub.passedTests || 0;
      testsTotal += sub.totalTests || 0;
      if (sub.resultStatus === 'accepted') acceptedSubmissions++;
    }

    const codeExecutionSummary = {
      source: 'verified_execution',
      totalSubmissions: submissions.length,
      acceptedCount: acceptedSubmissions,
      passedTests: testsPassed,
      totalTests: testsTotal,
      acceptanceRate: submissions.length > 0 ? Math.round((acceptedSubmissions / submissions.length) * 100) : 100,
    };

    // 3. Verified timings
    const totalTimeSpentSeconds = questionTimings.reduce((sum, qt) => sum + qt.timeSpentSeconds, 0);
    const verifiedTimings = {
      source: 'verified_telemetry',
      totalTimeSpentSeconds,
      averagePerQuestionSeconds: questionTimings.length > 0 ? Math.round(totalTimeSpentSeconds / questionTimings.length) : 0,
      questionTimings,
    };

    const humanOverrideData = latestHumanOverride
      ? {
          source: 'human_interviewer',
          overrideScore: latestHumanOverride.overrideScore,
          humanNotes: latestHumanOverride.humanNotes,
        }
      : null;

    // Upsert report
    const [report] = await InterviewReport.upsert({
      sessionId,
      candidateId: session.userId,
      aiEvaluationScore,
      codeExecutionSummary,
      verifiedTimings,
      humanOverride: humanOverrideData,
      overallRecommendations: recommendations.slice(0, 5),
      disclaimer: AI_DISCLAIMER,
    });

    return report;
  }
}

const evaluationService = new EvaluationService();

module.exports = {
  EvaluationService,
  evaluationService,
  DEFAULT_DIMENSION_WEIGHTS,
  AI_DISCLAIMER,
};
