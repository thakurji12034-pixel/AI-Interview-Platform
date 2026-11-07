const { InterviewSession, SessionQuestion, Answer, CandidateSkill, User } = require('../models');
const { aiManager } = require('../ai');
const { buildTechnicalQuestionPrompt } = require('../ai/prompts/technicalQuestionPrompt');
const { buildBehavioralQuestionPrompt } = require('../ai/prompts/behavioralQuestionPrompt');
const { buildFollowUpQuestionPrompt } = require('../ai/prompts/followUpQuestionPrompt');
const { buildSessionSummaryPrompt } = require('../ai/prompts/sessionSummaryPrompt');
const AppError = require('../utils/AppError');

const GRACE_PERIOD_MS = 60 * 1000; // 1-minute grace window for clock drift

class SessionService {
  /**
   * Configures and starts an AI interview session
   */
  async createSession({ userId, interviewerId = null, type = 'technical', difficulty = 'intermediate', mode = 'mock', durationMinutes = 30 }) {
    const session = await InterviewSession.create({
      userId,
      interviewerId,
      type,
      difficulty,
      mode,
      durationMinutes,
      status: 'configured',
    });

    // Populate questions based on session type
    const candidateSkills = await CandidateSkill.findAll({ where: { userId } });
    const skillNames = candidateSkills.map((s) => s.skillName);

    let generatedQuestions;

    if (type === 'technical') {
      const promptObj = buildTechnicalQuestionPrompt({
        domain: 'DSA',
        difficulty,
        candidateSkills: skillNames,
        count: 2,
      });
      const res = await aiManager.execute({
        prompt: promptObj.prompt,
        purpose: promptObj.purpose,
        promptVersion: promptObj.version,
        userId,
      });
      generatedQuestions = res.questions || [];
    } else if (type === 'hr') {
      const promptObj = buildBehavioralQuestionPrompt({ count: 2 });
      const res = await aiManager.execute({
        prompt: promptObj.prompt,
        purpose: promptObj.purpose,
        promptVersion: promptObj.version,
        userId,
      });
      generatedQuestions = res.questions || [];
    } else {
      // Mixed: 1 technical + 1 behavioral
      const techPrompt = buildTechnicalQuestionPrompt({ domain: 'General', difficulty, candidateSkills: skillNames, count: 1 });
      const hrPrompt = buildBehavioralQuestionPrompt({ count: 1 });

      const [techRes, hrRes] = await Promise.all([
        aiManager.execute({ prompt: techPrompt.prompt, purpose: techPrompt.purpose, promptVersion: techPrompt.version, userId }),
        aiManager.execute({ prompt: hrPrompt.prompt, purpose: hrPrompt.purpose, promptVersion: hrPrompt.version, userId }),
      ]);
      generatedQuestions = [...(techRes.questions || []), ...(hrRes.questions || [])];
    }

    // Save session questions
    let order = 1;
    for (const q of generatedQuestions) {
      await SessionQuestion.create({
        sessionId: session.id,
        orderIndex: order++,
        prompt: q.prompt,
        domain: q.domain,
        difficulty: q.difficulty || difficulty,
        type: q.type || 'theory',
        expectedKeyPoints: q.expectedKeyPoints || [],
        status: 'pending',
      });
    }

    return this.getSessionById(session.id, { id: userId, role: 'candidate' });
  }

  async startSession(sessionId, user) {
    const session = await this.getSessionById(sessionId, user);
    if (session.status !== 'configured') {
      throw new AppError(`Cannot start session in '${session.status}' status`, 400, 'INVALID_SESSION_STATE');
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + session.durationMinutes * 60 * 1000);

    await session.update({
      status: 'in_progress',
      startedAt: now,
      endsAt,
    });

    return session;
  }

  async getSessionById(id, user) {
    const session = await InterviewSession.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: SessionQuestion, as: 'questions', include: [{ model: Answer, as: 'answers' }] },
      ],
      order: [[{ model: SessionQuestion, as: 'questions' }, 'orderIndex', 'ASC']],
    });

    if (!session) {
      throw new AppError('Interview session not found', 404, 'SESSION_NOT_FOUND');
    }

    // Role-based visibility: candidate can only view their own sessions
    if (user.role === 'candidate' && session.userId !== user.id) {
      throw new AppError('Interview session not found', 404, 'SESSION_NOT_FOUND');
    }

    return session;
  }

  async submitAnswer({ sessionId, sessionQuestionId, user, answerText, codeSnippet = null, language = null, timeSpentSeconds = 0 }) {
    const session = await this.getSessionById(sessionId, user);

    if (session.status !== 'in_progress') {
      throw new AppError(`Cannot submit answer: session is ${session.status}`, 400, 'SESSION_NOT_ACTIVE');
    }

    // Server-authoritative timer check with grace period
    const now = new Date();
    if (session.endsAt && now.getTime() > new Date(session.endsAt).getTime() + GRACE_PERIOD_MS) {
      await session.update({ status: 'completed' });
      throw new AppError('Interview session deadline has expired', 400, 'SESSION_EXPIRED');
    }

    const question = await SessionQuestion.findOne({
      where: { id: sessionQuestionId, sessionId },
    });

    if (!question) {
      throw new AppError('Question not found in this session', 404, 'QUESTION_NOT_FOUND');
    }

    if (question.status === 'answered') {
      throw new AppError('Question has already been answered', 400, 'QUESTION_ALREADY_ANSWERED');
    }

    // Create answer
    const answer = await Answer.create({
      sessionId,
      sessionQuestionId,
      candidateId: user.id,
      answerText,
      codeSnippet,
      language,
      timeSpentSeconds,
      submittedAt: now,
    });

    await question.update({ status: 'answered' });

    // Generate adaptive follow-up question if depth < 2
    if (question.followUpDepth < 2 && answerText && answerText.length > 20) {
      const followUpPrompt = buildFollowUpQuestionPrompt({
        questionPrompt: question.prompt,
        candidateAnswer: answerText,
        followUpDepth: question.followUpDepth + 1,
      });

      const followUpResult = await aiManager.execute({
        prompt: followUpPrompt.prompt,
        purpose: followUpPrompt.purpose,
        promptVersion: followUpPrompt.version,
        userId: user.id,
      });

      if (followUpResult && followUpResult.followUp) {
        // Find max orderIndex
        const maxOrderQuestion = await SessionQuestion.findOne({
          where: { sessionId },
          order: [['orderIndex', 'DESC']],
        });
        const nextOrder = (maxOrderQuestion?.orderIndex || question.orderIndex) + 1;

        await SessionQuestion.create({
          sessionId,
          orderIndex: nextOrder,
          prompt: followUpResult.followUp.prompt,
          domain: question.domain,
          difficulty: followUpResult.followUp.difficulty || 'intermediate',
          type: followUpResult.followUp.type || 'theory',
          expectedKeyPoints: followUpResult.followUp.expectedKeyPoints || [],
          parentQuestionId: question.id,
          followUpDepth: question.followUpDepth + 1,
          status: 'pending',
        });
      }
    }

    return answer;
  }

  async completeSession(sessionId, user) {
    const session = await this.getSessionById(sessionId, user);
    if (session.status === 'completed') {
      return session;
    }

    // Synthesize session questions and answers for AI summary
    const questions = await SessionQuestion.findAll({
      where: { sessionId },
      include: [{ model: Answer, as: 'answers' }],
      order: [['orderIndex', 'ASC']],
    });

    const questionsWithAnswers = questions.map((q) => ({
      prompt: q.prompt,
      type: q.type,
      answer: q.answers && q.answers.length > 0 ? q.answers[0].answerText : null,
    }));

    const summaryPrompt = buildSessionSummaryPrompt({
      sessionType: session.type,
      questionsWithAnswers,
    });

    const summaryRes = await aiManager.execute({
      prompt: summaryPrompt.prompt,
      purpose: summaryPrompt.purpose,
      promptVersion: summaryPrompt.version,
      userId: user.id,
    });

    await session.update({
      status: 'completed',
      summary: summaryRes.summary || 'Session successfully completed.',
      score: summaryRes.score || 80.0,
    });

    return session;
  }
}

const sessionService = new SessionService();

module.exports = {
  SessionService,
  sessionService,
};
