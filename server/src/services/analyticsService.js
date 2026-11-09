const { Op, fn, col } = require('sequelize');
const {
  User,
  Interview,
  InterviewSession,
  InterviewReport,
  Evaluation,
  Submission,
  CandidateSkill,
  AiUsage,
  AuditLog,
  Question,
} = require('../models');
const cacheService = require('./cacheService');

const CACHE_TTL_SECONDS = 300; // 5-minute cache TTL

class AnalyticsService {
  /**
   * Helper to build date range clause
   */
  _buildDateFilter(field = 'createdAt', startDate = null, endDate = null) {
    if (!startDate && !endDate) return {};
    const range = {};
    if (startDate) range[Op.gte] = new Date(startDate);
    if (endDate) range[Op.lte] = new Date(endDate);
    return { [field]: range };
  }

  /**
   * Invalidate cached analytics for a user or globally
   */
  async invalidateAnalytics(userId = null) {
    if (userId) {
      await cacheService.delPattern(`analytics:candidate:${userId}:*`);
      await cacheService.delPattern(`analytics:interviewer:${userId}:*`);
    }
    await cacheService.delPattern('analytics:admin:*');
  }

  /**
   * Candidate Analytics: interview history, score progression, skill profile, code submissions
   */
  async getCandidateAnalytics({ userId, startDate = null, endDate = null }) {
    const dateKey = `${startDate || 'all'}_${endDate || 'all'}`;
    const cacheKey = `analytics:candidate:${userId}:${dateKey}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return { ...cached, _cached: true };

    const dateFilter = this._buildDateFilter('createdAt', startDate, endDate);

    // 1. Interview session statistics
    const interviews = await Interview.findAll({
      where: { candidateId: userId, ...dateFilter },
      attributes: ['id', 'status', 'scheduledAt', 'durationMinutes'],
    });

    const interviewStats = {
      total: interviews.length,
      scheduled: interviews.filter((i) => i.status === 'scheduled').length,
      inProgress: interviews.filter((i) => i.status === 'in_progress').length,
      completed: interviews.filter((i) => i.status === 'completed').length,
      cancelled: interviews.filter((i) => i.status === 'cancelled').length,
      completionRate: interviews.length > 0
        ? Math.round((interviews.filter((i) => i.status === 'completed').length / interviews.length) * 100)
        : 0,
    };

    // 2. Score progression from completed interview sessions & reports
    const sessions = await InterviewSession.findAll({
      where: { userId, status: 'completed', ...dateFilter },
      include: [
        {
          model: InterviewReport,
          as: 'report',
          attributes: ['aiEvaluationScore', 'createdAt'],
        },
        {
          model: Evaluation,
          as: 'evaluations',
          attributes: ['overallScore', 'technicalCorrectness', 'problemSolving', 'communicationClarity'],
        },
      ],
      order: [['createdAt', 'ASC']],
      limit: 20,
    });

    const scoreHistory = sessions.map((s) => {
      const avgEval = s.evaluations && s.evaluations.length > 0
        ? s.evaluations.reduce((acc, ev) => acc + (ev.overallScore || 0), 0) / s.evaluations.length
        : 0;

      const score = s.report?.aiEvaluationScore || s.score || avgEval || 0;

      return {
        sessionId: s.id,
        date: s.createdAt,
        type: s.type || 'technical',
        score: Math.round(score * 10) / 10,
        technicalCorrectness: s.evaluations?.[0]?.technicalCorrectness || 0,
        problemSolving: s.evaluations?.[0]?.problemSolving || 0,
        communicationClarity: s.evaluations?.[0]?.communicationClarity || 0,
      };
    });

    // 3. Candidate skill proficiencies
    const skills = await CandidateSkill.findAll({
      where: { userId },
      attributes: ['skillName', 'category', 'proficiencyLevel', 'verified', 'yearsOfExperience'],
      order: [['proficiencyLevel', 'DESC']],
    });

    const skillProficiencies = skills.map((sk) => ({
      name: sk.skillName,
      category: sk.category,
      level: sk.proficiencyLevel,
      years: sk.yearsOfExperience || 1,
      verified: Boolean(sk.verified),
    }));

    // 4. Code assessment submission metrics
    const submissions = await Submission.findAll({
      where: { userId, ...dateFilter },
      attributes: ['id', 'language', 'status', 'resultStatus', 'passedTests', 'totalTests', 'executionTimeMs'],
    });

    const acceptedSubmissions = submissions.filter((sub) => sub.resultStatus === 'accepted');
    const totalRuntime = submissions.reduce((acc, sub) => acc + (sub.executionTimeMs || 0), 0);

    const codingStats = {
      totalSubmissions: submissions.length,
      acceptedCount: acceptedSubmissions.length,
      acceptanceRate: submissions.length > 0
        ? Math.round((acceptedSubmissions.length / submissions.length) * 100)
        : 0,
      averageRuntimeMs: submissions.length > 0
        ? Math.round(totalRuntime / submissions.length)
        : 0,
    };

    const analytics = {
      interviewStats,
      scoreHistory,
      skillProficiencies,
      codingStats,
      generatedAt: new Date().toISOString(),
    };

    await cacheService.set(cacheKey, analytics, CACHE_TTL_SECONDS);
    return analytics;
  }

  /**
   * Interviewer Analytics: conducted sessions, candidate score distribution, rubric averages, question domains
   */
  async getInterviewerAnalytics({ userId, startDate = null, endDate = null }) {
    const dateKey = `${startDate || 'all'}_${endDate || 'all'}`;
    const cacheKey = `analytics:interviewer:${userId}:${dateKey}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return { ...cached, _cached: true };

    const dateFilter = this._buildDateFilter('createdAt', startDate, endDate);

    // 1. Session statistics conducted by this interviewer
    const interviews = await Interview.findAll({
      where: { interviewerId: userId, ...dateFilter },
      attributes: ['id', 'status', 'candidateId'],
    });

    const completedInterviews = interviews.filter((i) => i.status === 'completed');
    const uniqueCandidates = new Set(interviews.map((i) => i.candidateId)).size;

    const sessionStats = {
      totalConducted: interviews.length,
      completed: completedInterviews.length,
      scheduled: interviews.filter((i) => i.status === 'scheduled').length,
      cancelled: interviews.filter((i) => i.status === 'cancelled').length,
      uniqueCandidates,
      completionRate: interviews.length > 0
        ? Math.round((completedInterviews.length / interviews.length) * 100)
        : 0,
    };

    // 2. Candidate score distribution (histograms) from reports
    const sessions = await InterviewSession.findAll({
      where: { interviewerId: userId, ...dateFilter },
      attributes: ['id', 'score'],
    });

    const distribution = {
      below50: 0,
      range50To69: 0,
      range70To84: 0,
      range85To100: 0,
    };

    for (const sess of sessions) {
      const score = sess.score || 0;
      if (score < 50) distribution.below50++;
      else if (score < 70) distribution.range50To69++;
      else if (score < 85) distribution.range70To84++;
      else distribution.range85To100++;
    }

    // 3. Average rubric dimension ratings across evaluations
    const evaluations = await Evaluation.findAll({
      include: [
        {
          model: InterviewSession,
          as: 'session',
          where: { interviewerId: userId, ...dateFilter },
          attributes: ['id'],
        },
      ],
      attributes: [
        'technicalCorrectness',
        'problemSolving',
        'explanationQuality',
        'relevance',
        'communicationClarity',
      ],
    });

    const rubricAverages = {
      technicalCorrectness: 0,
      problemSolving: 0,
      explanationQuality: 0,
      relevance: 0,
      communicationClarity: 0,
      evaluationsCount: evaluations.length,
    };

    if (evaluations.length > 0) {
      for (const ev of evaluations) {
        rubricAverages.technicalCorrectness += ev.technicalCorrectness || 0;
        rubricAverages.problemSolving += ev.problemSolving || 0;
        rubricAverages.explanationQuality += ev.explanationQuality || 0;
        rubricAverages.relevance += ev.relevance || 0;
        rubricAverages.communicationClarity += ev.communicationClarity || 0;
      }
      const len = evaluations.length;
      rubricAverages.technicalCorrectness = Math.round((rubricAverages.technicalCorrectness / len) * 10) / 10;
      rubricAverages.problemSolving = Math.round((rubricAverages.problemSolving / len) * 10) / 10;
      rubricAverages.explanationQuality = Math.round((rubricAverages.explanationQuality / len) * 10) / 10;
      rubricAverages.relevance = Math.round((rubricAverages.relevance / len) * 10) / 10;
      rubricAverages.communicationClarity = Math.round((rubricAverages.communicationClarity / len) * 10) / 10;
    }

    // 4. Question domain breakdown
    const domainCounts = await Question.findAll({
      attributes: ['domain', [fn('COUNT', col('id')), 'count']],
      group: ['domain'],
      raw: true,
    });

    const domainBreakdown = domainCounts.map((d) => ({
      domain: d.domain,
      count: parseInt(d.count, 10),
    }));

    const analytics = {
      sessionStats,
      scoreDistribution: [
        { range: '< 50', count: distribution.below50 },
        { range: '50 - 69', count: distribution.range50To69 },
        { range: '70 - 84', count: distribution.range70To84 },
        { range: '85 - 100', count: distribution.range85To100 },
      ],
      rubricAverages,
      domainBreakdown,
      generatedAt: new Date().toISOString(),
    };

    await cacheService.set(cacheKey, analytics, CACHE_TTL_SECONDS);
    return analytics;
  }

  /**
   * Admin Analytics: platform user velocity, total throughput, AI token usage, audit activity
   */
  async getAdminAnalytics({ startDate = null, endDate = null }) {
    const dateKey = `${startDate || 'all'}_${endDate || 'all'}`;
    const cacheKey = `analytics:admin:${dateKey}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return { ...cached, _cached: true };

    const dateFilter = this._buildDateFilter('createdAt', startDate, endDate);

    // 1. User Velocity & Role Composition
    const totalUsers = await User.count();
    const candidateCount = await User.count({ where: { role: 'candidate' } });
    const interviewerCount = await User.count({ where: { role: 'interviewer' } });
    const adminCount = await User.count({ where: { role: 'admin' } });
    const activeUsers = await User.count({ where: { isActive: true } });
    const inactiveUsers = totalUsers - activeUsers;

    const userVelocity = {
      totalUsers,
      candidateCount,
      interviewerCount,
      adminCount,
      activeUsers,
      inactiveUsers,
    };

    // 2. Platform throughput
    const totalInterviews = await Interview.count({ where: dateFilter });
    const completedInterviews = await Interview.count({ where: { status: 'completed', ...dateFilter } });
    const totalSessions = await InterviewSession.count({ where: dateFilter });
    const totalSubmissions = await Submission.count({ where: dateFilter });
    const acceptedSubmissions = await Submission.count({ where: { resultStatus: 'accepted', ...dateFilter } });

    const platformStats = {
      totalInterviews,
      completedInterviews,
      totalSessions,
      totalSubmissions,
      acceptedSubmissions,
      globalAcceptanceRate: totalSubmissions > 0
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
        : 0,
    };

    // 3. AI Token Consumption & Purpose Breakdown
    const aiUsages = await AiUsage.findAll({
      where: dateFilter,
      attributes: ['purpose', 'model', 'inputTokens', 'outputTokens', 'latencyMs'],
    });

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalAiTokens = 0;
    let totalLatency = 0;
    const purposeMap = {};

    for (const u of aiUsages) {
      const inTok = u.inputTokens || 0;
      const outTok = u.outputTokens || 0;
      totalPromptTokens += inTok;
      totalCompletionTokens += outTok;
      totalAiTokens += inTok + outTok;
      totalLatency += u.latencyMs || 0;

      const p = u.purpose || 'other';
      purposeMap[p] = (purposeMap[p] || 0) + 1;
    }

    const aiTokenUsage = {
      totalCalls: aiUsages.length,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens: totalAiTokens,
      averageLatencyMs: aiUsages.length > 0 ? Math.round(totalLatency / aiUsages.length) : 0,
      purposeBreakdown: Object.entries(purposeMap).map(([purpose, count]) => ({ purpose, count })),
    };

    // 4. Audit Log Activity Distribution
    const auditLogs = await AuditLog.findAll({
      where: dateFilter,
      attributes: ['action'],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    const actionMap = {};
    for (const a of auditLogs) {
      actionMap[a.action] = (actionMap[a.action] || 0) + 1;
    }

    const auditActivity = Object.entries(actionMap).map(([action, count]) => ({ action, count }));

    const analytics = {
      userVelocity,
      platformStats,
      aiTokenUsage,
      auditActivity,
      generatedAt: new Date().toISOString(),
    };

    await cacheService.set(cacheKey, analytics, CACHE_TTL_SECONDS);
    return analytics;
  }
}

const analyticsService = new AnalyticsService();
module.exports = { AnalyticsService, analyticsService };

