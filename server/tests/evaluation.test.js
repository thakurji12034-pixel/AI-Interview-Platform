const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const config = require('../src/config/env');
const {
  User,
  InterviewSession,
  SessionQuestion,
  Answer,
  Evaluation,
  EvaluationOverride,
  InterviewReport,
  Submission,
  Question,
} = require('../src/models');
const { evaluationService, DEFAULT_DIMENSION_WEIGHTS, AI_DISCLAIMER } = require('../src/services/evaluationService');
const { startWorker, stopWorker } = require('../src/worker');
const { queueManager } = require('../src/jobs/queueManager');

describe('AI Answer Evaluation & Interview Reports API (/api/v1/evaluations, /api/v1/reports)', () => {
  let candidateUser;
  let otherCandidateUser;
  let interviewerUser;
  let candidateToken;
  let otherCandidateToken;
  let interviewerToken;
  let testSession;
  let testQuestion;
  let testAnswer;

  const createToken = (user) =>
    jwt.sign(
      {
        id: user.id,
        role: user.role,
        isActive: user.isActive !== false,
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.accessExpiresIn,
        algorithm: config.jwt.algorithm,
      }
    );

  beforeAll(() => {
    startWorker();
  });

  afterAll(async () => {
    await stopWorker();
    await queueManager.closeAll();
  });

  beforeEach(async () => {
    await InterviewReport.destroy({ where: {}, force: true });
    await EvaluationOverride.destroy({ where: {}, force: true });
    await Evaluation.destroy({ where: {}, force: true });
    await Submission.destroy({ where: {}, force: true });
    await Answer.destroy({ where: {}, force: true });
    await SessionQuestion.destroy({ where: {}, force: true });
    await InterviewSession.destroy({ where: {}, force: true });
    await Question.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    candidateUser = await User.create({
      name: 'Alice Evaluated',
      email: 'alice@eval.test',
      passwordHash: 'dummyHash123',
      role: 'candidate',
      isActive: true,
    });

    otherCandidateUser = await User.create({
      name: 'Bob Evaluated',
      email: 'bob@eval.test',
      passwordHash: 'dummyHash123',
      role: 'candidate',
      isActive: true,
    });

    interviewerUser = await User.create({
      name: 'Senior Interviewer',
      email: 'interviewer@eval.test',
      passwordHash: 'dummyHash123',
      role: 'interviewer',
      isActive: true,
    });

    candidateToken = createToken(candidateUser);
    otherCandidateToken = createToken(otherCandidateUser);
    interviewerToken = createToken(interviewerUser);

    testSession = await InterviewSession.create({
      userId: candidateUser.id,
      interviewerId: interviewerUser.id,
      type: 'technical',
      difficulty: 'intermediate',
      status: 'in_progress',
      durationMinutes: 45,
    });

    testQuestion = await SessionQuestion.create({
      sessionId: testSession.id,
      orderIndex: 1,
      prompt: 'Implement a LRU Cache and explain get and put time complexity.',
      domain: 'DSA',
      difficulty: 'intermediate',
      type: 'coding',
      expectedKeyPoints: ['Doubly linked list with hash map', 'O(1) get and put', 'Edge cases like capacity 0 or 1'],
      status: 'answered',
    });

    testAnswer = await Answer.create({
      sessionId: testSession.id,
      sessionQuestionId: testQuestion.id,
      candidateId: candidateUser.id,
      answerText: 'I use a Doubly Linked List paired with a Hash Map for O(1) eviction and lookup.',
      codeSnippet: 'class LRUCache { constructor(capacity) { this.capacity = capacity; } }',
      language: 'javascript',
      timeSpentSeconds: 120,
      submittedAt: new Date(),
    });
  });

  describe('Server-Side Score Weighting & Rubric Dimensions', () => {
    test('1. Overall score is computed strictly on the server from weighted dimensions, never trusting model arithmetic', () => {
      const dimensions = {
        technicalCorrectness: 90,
        problemSolving: 80,
        explanationQuality: 70,
        relevance: 100,
        communicationClarity: 85,
      };

      // Formula: 90*0.35 (31.5) + 80*0.25 (20) + 70*0.20 (14) + 100*0.10 (10) + 85*0.10 (8.5) = 84.0
      const score = evaluationService.computeOverallScore(dimensions, DEFAULT_DIMENSION_WEIGHTS);
      expect(score).toBe(84.0);
    });

    test('2. Asynchronous evaluation transitions to completed with dimension rubrics and advisory disclaimer', async () => {
      const res = await request(app)
        .post(`/api/v1/evaluations/answers/${testAnswer.id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(202);
      expect(res.body.evaluation.id).toBeDefined();
      expect(res.body.evaluation.status).toBe('pending');
      expect(res.body.evaluation.disclaimer).toBe(AI_DISCLAIMER);

      const evaluationId = res.body.evaluation.id;

      // Allow background worker to process evaluation
      await new Promise((resolve) => setTimeout(resolve, 350));

      const pollRes = await request(app)
        .get(`/api/v1/evaluations/${evaluationId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(pollRes.status).toBe(200);
      const evalData = pollRes.body.evaluation;
      expect(evalData.status).toBe('completed');
      expect(evalData.technicalCorrectness).toBeGreaterThan(0);
      expect(evalData.problemSolving).toBeGreaterThan(0);
      expect(evalData.overallScore).toBeGreaterThan(0);
      expect(evalData.generatedBy).toBe('ai');
      expect(evalData.disclaimer).toContain('advisory estimate');
    });
  });

  describe('Human Overrides & Verified Telemetry Reports', () => {
    test('3. Interviewer can record a human override score and notes, keeping original AI evaluation intact', async () => {
      const evalRes = await request(app)
        .post(`/api/v1/evaluations/answers/${testAnswer.id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      const evaluationId = evalRes.body.evaluation.id;
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Interviewer adds override
      const overrideRes = await request(app)
        .post(`/api/v1/evaluations/${evaluationId}/override`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({
          overrideScore: 92.5,
          humanNotes: 'Candidate demonstrated exceptional clarity when explaining cache eviction mechanics in person.',
        });

      expect(overrideRes.status).toBe(201);
      expect(overrideRes.body.override.overrideScore).toBe(92.5);

      // Verify evaluation still preserves raw AI scores alongside human override
      const getRes = await request(app)
        .get(`/api/v1/evaluations/${evaluationId}`)
        .set('Authorization', `Bearer ${interviewerToken}`);

      expect(getRes.body.evaluation.overallScore).toBeDefined();
      expect(getRes.body.evaluation.overrides.length).toBe(1);
      expect(getRes.body.evaluation.overrides[0].overrideScore).toBe(92.5);
    });

    test('4. Candidate is forbidden from recording an evaluation override (403 Forbidden)', async () => {
      const evalRes = await request(app)
        .post(`/api/v1/evaluations/answers/${testAnswer.id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      const evaluationId = evalRes.body.evaluation.id;

      const overrideRes = await request(app)
        .post(`/api/v1/evaluations/${evaluationId}/override`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ overrideScore: 100 });

      expect(overrideRes.status).toBe(403);
    });

    test('5. Unified report synthesizes AI scores, verified code execution facts, and verified timings', async () => {
      // 1. Process an evaluation
      await request(app)
        .post(`/api/v1/evaluations/answers/${testAnswer.id}`)
        .set('Authorization', `Bearer ${candidateToken}`);
      await new Promise((resolve) => setTimeout(resolve, 350));

      // 2. Seed verified code execution Submission
      const sampleQuestion = await Question.create({
        title: 'Two Sum',
        statement: 'Two sum statement',
        domain: 'DSA',
        difficulty: 'beginner',
        type: 'coding',
      });

      await Submission.create({
        userId: candidateUser.id,
        questionId: sampleQuestion.id,
        language: 'javascript',
        code: 'function twoSum() {}',
        status: 'completed',
        resultStatus: 'accepted',
        passedTests: 5,
        totalTests: 5,
      });

      // 3. Generate report
      const reportRes = await request(app)
        .post(`/api/v1/reports/sessions/${testSession.id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(reportRes.status).toBe(201);
      const report = reportRes.body.report;
      expect(report.aiEvaluationScore).toBeGreaterThan(0);

      // Verify code execution facts
      expect(report.codeExecutionSummary.source).toBe('verified_execution');
      expect(report.codeExecutionSummary.passedTests).toBe(5);
      expect(report.codeExecutionSummary.acceptanceRate).toBe(100);

      // Verify timings telemetry
      expect(report.verifiedTimings.source).toBe('verified_telemetry');
      expect(report.verifiedTimings.totalTimeSpentSeconds).toBe(120);

      // Verify mandatory disclaimer
      expect(report.disclaimer).toBe(AI_DISCLAIMER);
    });

    test('6. Candidate cannot view another user\'s evaluation or report (404 IDOR prevention)', async () => {
      const evalRes = await request(app)
        .post(`/api/v1/evaluations/answers/${testAnswer.id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      const aliceEvalId = evalRes.body.evaluation.id;

      // Bob tries to view Alice's evaluation
      const idorRes = await request(app)
        .get(`/api/v1/evaluations/${aliceEvalId}`)
        .set('Authorization', `Bearer ${otherCandidateToken}`);

      expect(idorRes.status).toBe(404);
      expect(idorRes.body.error.code).toBe('EVALUATION_NOT_FOUND');
    });

    test('7. Recovers gracefully from malformed model output without crashing', async () => {
      const corruptedAnswer = await Answer.create({
        sessionId: testSession.id,
        sessionQuestionId: testQuestion.id,
        candidateId: candidateUser.id,
        answerText: 'INJECT_MALFORMED_OUTPUT testing bad model response',
        submittedAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/v1/evaluations/answers/${corruptedAnswer.id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      const evalId = res.body.evaluation.id;
      await new Promise((resolve) => setTimeout(resolve, 350));

      const pollRes = await request(app)
        .get(`/api/v1/evaluations/${evalId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(pollRes.status).toBe(200);
      expect(pollRes.body.evaluation.status).toBe('completed');
      expect(pollRes.body.evaluation.overallScore).toBe(70); // Bounded fallback score
    });

    test('8. Candidate can query completed interview report via GET /api/v1/reports/sessions/:sessionId', async () => {
      await request(app)
        .post(`/api/v1/reports/sessions/${testSession.id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      const getRes = await request(app)
        .get(`/api/v1/reports/sessions/${testSession.id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.report.sessionId).toBe(testSession.id);
      expect(getRes.body.report.candidateId).toBe(candidateUser.id);
    });
  });
});
