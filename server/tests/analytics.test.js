const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const {
  User,
  Interview,
  InterviewSession,
  SessionQuestion,
  Answer,
  Evaluation,
  Submission,
  CandidateSkill,
  AiUsage,
  AuditLog,
  Question,
} = require('../src/models');
const { analyticsService } = require('../src/services/analyticsService');
const config = require('../src/config/env');

describe('Role-Scoped Analytics API (/api/v1/analytics)', () => {
  let candidateUser;
  let interviewerUser;
  let adminUser;
  let candidateToken;
  let interviewerToken;
  let adminToken;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

    candidateUser = await User.create({
      name: 'Analytics Candidate',
      email: 'analytics.candidate@example.com',
      passwordHash,
      role: 'candidate',
      isActive: true,
    });

    interviewerUser = await User.create({
      name: 'Analytics Interviewer',
      email: 'analytics.interviewer@example.com',
      passwordHash,
      role: 'interviewer',
      isActive: true,
    });

    adminUser = await User.create({
      name: 'Analytics Admin',
      email: 'analytics.admin@example.com',
      passwordHash,
      role: 'admin',
      isActive: true,
    });

    candidateToken = jwt.sign(
      { id: candidateUser.id, role: candidateUser.role },
      config.jwt.secret,
      { expiresIn: '1h', algorithm: config.jwt.algorithm }
    );
    interviewerToken = jwt.sign(
      { id: interviewerUser.id, role: interviewerUser.role },
      config.jwt.secret,
      { expiresIn: '1h', algorithm: config.jwt.algorithm }
    );
    adminToken = jwt.sign(
      { id: adminUser.id, role: adminUser.role },
      config.jwt.secret,
      { expiresIn: '1h', algorithm: config.jwt.algorithm }
    );

    // Seed test interview
    const scheduledAt = new Date(Date.now() + 86400000);
    const endAt = new Date(scheduledAt.getTime() + 3600000);
    await Interview.create({
      interviewerId: interviewerUser.id,
      candidateId: candidateUser.id,
      title: 'Analytics Test Session',
      scheduledAt,
      endAt,
      durationMinutes: 60,
      status: 'completed',
    });

    // Seed test session, question, answer & evaluation
    const session = await InterviewSession.create({
      userId: candidateUser.id,
      interviewerId: interviewerUser.id,
      type: 'technical',
      difficulty: 'intermediate',
      durationMinutes: 45,
      status: 'completed',
      score: 82.5,
    });

    const sessionQuestion = await SessionQuestion.create({
      sessionId: session.id,
      orderIndex: 1,
      prompt: 'Explain hash table collision resolution.',
      domain: 'dsa',
      difficulty: 'intermediate',
      type: 'coding',
      status: 'answered',
    });

    const answer = await Answer.create({
      sessionId: session.id,
      sessionQuestionId: sessionQuestion.id,
      candidateId: candidateUser.id,
      answerText: 'Chaining and open addressing with linear or quadratic probing.',
      language: 'javascript',
      timeSpentSeconds: 90,
    });

    await Evaluation.create({
      sessionId: session.id,
      answerId: answer.id,
      technicalCorrectness: 85,
      relevance: 90,
      explanationQuality: 80,
      problemSolving: 80,
      communicationClarity: 75,
      overallScore: 82.5,
      dimensionWeights: { tc: 0.35, ps: 0.25, eq: 0.2, rel: 0.1, cc: 0.1 },
      generatedBy: 'ai',
      model: 'gemini-2.5-flash',
      promptVersion: 'v1.0',
      disclaimer: 'Advisory estimate',
      status: 'completed',
    });

    // Seed candidate skill
    await CandidateSkill.create({
      userId: candidateUser.id,
      skillName: 'TypeScript',
      category: 'languages',
      proficiencyLevel: 'expert',
      verified: true,
      yearsOfExperience: 3,
    });

    const question = await Question.create({
      title: 'Analytics Test Question',
      statement: 'Implement binary search',
      difficulty: 'beginner',
      type: 'coding',
      domain: 'DSA',
      createdBy: interviewerUser.id,
    });

    // Seed code submission
    await Submission.create({
      userId: candidateUser.id,
      questionId: question.id,
      language: 'javascript',
      code: 'console.log("hello");',
      status: 'completed',
      resultStatus: 'accepted',
      passedTests: 3,
      totalTests: 3,
      executionTimeMs: 140,
    });

    // Seed AI usage
    await AiUsage.create({
      userId: candidateUser.id,
      purpose: 'technical_question',
      promptVersion: 'v1.0',
      model: 'gemini-2.5-flash',
      inputTokens: 250,
      outputTokens: 120,
      latencyMs: 420,
      status: 'success',
    });

    // Seed audit log
    await AuditLog.create({
      actorId: adminUser.id,
      action: 'USER_ROLE_UPDATED',
      targetType: 'User',
      targetId: '123',
    });
  });

  afterEach(async () => {
    // Purge test cache
    await analyticsService.invalidateAnalytics(candidateUser.id);
    await analyticsService.invalidateAnalytics(interviewerUser.id);
  });

  describe('Candidate Analytics (GET /api/v1/analytics/candidate)', () => {
    test('1. Candidate receives personal analytics across interviews, scores, skills, and coding', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/candidate')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.analytics).toBeDefined();

      const a = res.body.analytics;
      expect(a.interviewStats.total).toBeGreaterThanOrEqual(1);
      expect(a.interviewStats.completed).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(a.scoreHistory)).toBe(true);
      expect(a.scoreHistory.length).toBeGreaterThanOrEqual(1);
      expect(a.scoreHistory[0].score).toBeGreaterThan(0);

      expect(Array.isArray(a.skillProficiencies)).toBe(true);
      expect(a.skillProficiencies.some((s) => s.name === 'TypeScript')).toBe(true);

      expect(a.codingStats.totalSubmissions).toBeGreaterThanOrEqual(1);
      expect(a.codingStats.acceptanceRate).toBeGreaterThan(0);
    });

    test('2. Second consecutive request returns cached response (Redis cache verification)', async () => {
      // First request primes the cache
      await request(app)
        .get('/api/v1/analytics/candidate')
        .set('Authorization', `Bearer ${candidateToken}`);

      // Second request hits the cache
      const cachedRes = await request(app)
        .get('/api/v1/analytics/candidate')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(cachedRes.status).toBe(200);
      expect(cachedRes.body.analytics._cached).toBe(true);
    });

    test('3. Date range filtering limits aggregate calculations', async () => {
      const futureDate = new Date(Date.now() + 864000000).toISOString();
      const res = await request(app)
        .get(`/api/v1/analytics/candidate?startDate=${futureDate}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.analytics.interviewStats.total).toBe(0);
      expect(res.body.analytics.scoreHistory.length).toBe(0);
    });

    test('4. Candidate is forbidden from accessing interviewer analytics (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/interviewer')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('5. Candidate is forbidden from accessing admin analytics (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Interviewer Analytics (GET /api/v1/analytics/interviewer)', () => {
    test('6. Interviewer receives conducted sessions, score distributions, and rubric averages', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/interviewer')
        .set('Authorization', `Bearer ${interviewerToken}`);

      expect(res.status).toBe(200);
      const a = res.body.analytics;

      expect(a.sessionStats.totalConducted).toBeGreaterThanOrEqual(1);
      expect(a.sessionStats.completed).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(a.scoreDistribution)).toBe(true);
      expect(a.scoreDistribution.length).toBe(4);

      expect(a.rubricAverages).toBeDefined();
      expect(a.rubricAverages.evaluationsCount).toBeGreaterThanOrEqual(1);
      expect(a.rubricAverages.technicalCorrectness).toBeGreaterThan(0);
    });

    test('7. Interviewer is forbidden from accessing admin analytics (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${interviewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Admin Analytics (GET /api/v1/analytics/admin)', () => {
    test('8. Admin receives global user velocity, throughput, AI token metrics, and audit activity', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const a = res.body.analytics;

      expect(a.userVelocity.totalUsers).toBeGreaterThanOrEqual(3);
      expect(a.userVelocity.candidateCount).toBeGreaterThanOrEqual(1);
      expect(a.userVelocity.activeUsers).toBeGreaterThanOrEqual(1);

      expect(a.platformStats.totalInterviews).toBeGreaterThanOrEqual(1);
      expect(a.aiTokenUsage.totalCalls).toBeGreaterThanOrEqual(1);
      expect(a.aiTokenUsage.totalTokens).toBeGreaterThan(0);

      expect(Array.isArray(a.auditActivity)).toBe(true);
      expect(a.auditActivity.some((x) => x.action === 'USER_ROLE_UPDATED')).toBe(true);
    });

    test('9. Admin can inspect another candidate analytics using query parameter', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/candidate?candidateId=${candidateUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.analytics.skillProficiencies.length).toBeGreaterThanOrEqual(1);
    });

    test('10. Unauthenticated access is rejected (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/v1/analytics/admin');
      expect(res.status).toBe(401);
    });
  });
});

