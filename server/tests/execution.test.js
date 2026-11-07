const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { User, Question, TestCase, Submission } = require('../src/models');
const config = require('../src/config/env');
const { startWorker, stopWorker } = require('../src/worker');
const { queueManager } = require('../src/jobs/queueManager');
const { LANGUAGE_MAP, EXECUTION_LIMITS } = require('../src/services/execution');

describe('Secure Code Execution Engine & Submissions API (/api/v1/submissions)', () => {
  let candidateUser;
  let otherCandidateUser;
  let interviewerUser;
  let candidateToken;
  let otherCandidateToken;
  let interviewerToken;
  let sampleQuestion;

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

  beforeAll(async () => {
    startWorker();
  });

  afterAll(async () => {
    await stopWorker();
    await queueManager.closeAll();
  });

  beforeEach(async () => {
    await Submission.destroy({ where: {}, force: true });
    await TestCase.destroy({ where: {}, force: true });
    await Question.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    candidateUser = await User.create({
      name: 'Alice Coder',
      email: 'alice@coder.test',
      passwordHash: 'dummyHash123',
      role: 'candidate',
      isActive: true,
    });

    otherCandidateUser = await User.create({
      name: 'Bob Coder',
      email: 'bob@coder.test',
      passwordHash: 'dummyHash123',
      role: 'candidate',
      isActive: true,
    });

    interviewerUser = await User.create({
      name: 'Tech Interviewer',
      email: 'interviewer@coder.test',
      passwordHash: 'dummyHash123',
      role: 'interviewer',
      isActive: true,
    });

    candidateToken = createToken(candidateUser);
    otherCandidateToken = createToken(otherCandidateUser);
    interviewerToken = createToken(interviewerUser);

    sampleQuestion = await Question.create({
      title: 'Two Sum Problem',
      statement: 'Return indices that sum to target.',
      domain: 'DSA',
      difficulty: 'beginner',
      type: 'coding',
      status: 'published',
    });

    // Public test case
    await TestCase.create({
      questionId: sampleQuestion.id,
      input: '[2,7,11,15], 9',
      expectedOutput: '[0,1]',
      isHidden: false,
      weight: 1,
    });

    // Hidden test case
    await TestCase.create({
      questionId: sampleQuestion.id,
      input: 'SECRET_HIDDEN_INPUT_ARRAY, 99',
      expectedOutput: '[0,1]',
      isHidden: true,
      weight: 2,
    });
  });

  describe('Language Mappings & Input Validation', () => {
    test('1. Documented Judge0 language ID mappings are defined for all 4 supported languages', () => {
      expect(LANGUAGE_MAP.javascript).toBe(63);
      expect(LANGUAGE_MAP.python).toBe(71);
      expect(LANGUAGE_MAP.java).toBe(62);
      expect(LANGUAGE_MAP.cpp).toBe(54);
    });

    test('2. Rejects submission with unsupported language (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          questionId: sampleQuestion.id,
          language: 'ruby',
          code: 'puts "hello"',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UNSUPPORTED_LANGUAGE');
    });

    test('3. Rejects code exceeding maximum source length limit of 50,000 characters', async () => {
      const oversizedCode = 'a'.repeat(EXECUTION_LIMITS.maxSourceLength + 1);
      const res = await request(app)
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          questionId: sampleQuestion.id,
          language: 'javascript',
          code: oversizedCode,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CODE_TOO_LARGE');
    });
  });

  describe('Asynchronous Execution Pipeline & Result Normalization', () => {
    test('4. Valid submission transitions from queued to completed with accepted status', async () => {
      const res = await request(app)
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          questionId: sampleQuestion.id,
          language: 'javascript',
          code: 'function twoSum(nums, target) { return [0, 1]; }',
        });

      expect(res.status).toBe(201);
      expect(res.body.submission.id).toBeDefined();
      expect(res.body.submission.status).toBe('queued');

      const submissionId = res.body.submission.id;

      // Allow background worker to process submission
      await new Promise((resolve) => setTimeout(resolve, 350));

      const pollRes = await request(app)
        .get(`/api/v1/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(pollRes.status).toBe(200);
      expect(pollRes.body.submission.status).toBe('completed');
      expect(pollRes.body.submission.resultStatus).toBe('accepted');
      expect(pollRes.body.submission.passedTests).toBe(2);
      expect(pollRes.body.submission.totalTests).toBe(2);
    });

    test('5. Code with syntax error normalizes to compilation_error status', async () => {
      const res = await request(app)
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          questionId: sampleQuestion.id,
          language: 'javascript',
          code: 'SYNTAX_ERROR function missing bracket',
        });

      const submissionId = res.body.submission.id;
      await new Promise((resolve) => setTimeout(resolve, 350));

      const pollRes = await request(app)
        .get(`/api/v1/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(pollRes.status).toBe(200);
      expect(pollRes.body.submission.resultStatus).toBe('compilation_error');
    });

    test('6. Code with infinite loop normalizes to time_limit_exceeded status', async () => {
      const res = await request(app)
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          questionId: sampleQuestion.id,
          language: 'python',
          code: 'INFINITE_LOOP while True: pass',
        });

      const submissionId = res.body.submission.id;
      await new Promise((resolve) => setTimeout(resolve, 350));

      const pollRes = await request(app)
        .get(`/api/v1/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(pollRes.status).toBe(200);
      expect(pollRes.body.submission.resultStatus).toBe('time_limit_exceeded');
    });
  });

  describe('Candidate Privacy & Anti-Leak Protection', () => {
    test('7. Candidate inspecting submission receives ONLY pass/fail count for hidden tests without leaking inputs/outputs', async () => {
      const res = await request(app)
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          questionId: sampleQuestion.id,
          language: 'javascript',
          code: 'function twoSum() { return [0,1]; }',
        });

      const submissionId = res.body.submission.id;
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Query as candidate
      const candRes = await request(app)
        .get(`/api/v1/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(candRes.status).toBe(200);
      const testResults = candRes.body.submission.testResults;
      expect(testResults.length).toBe(2);

      // Public test case has input/output
      expect(testResults[0].isHidden).toBe(false);
      expect(testResults[0].input).toBe('[2,7,11,15], 9');

      // Hidden test case has status but NO input or expectedOutput
      expect(testResults[1].isHidden).toBe(true);
      expect(testResults[1].input).toBeUndefined();
      expect(testResults[1].expectedOutput).toBeUndefined();

      // Check entire raw response body for leakage of secret input
      const rawString = JSON.stringify(candRes.body);
      expect(rawString).not.toContain('SECRET_HIDDEN_INPUT_ARRAY');
    });

    test('8. Candidate cannot view another user\'s submission (404 Not Found to prevent IDOR)', async () => {
      const res = await request(app)
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          questionId: sampleQuestion.id,
          language: 'javascript',
          code: 'function twoSum() {}',
        });

      const aliceSubmissionId = res.body.submission.id;

      // Bob tries to view Alice's submission -> 404
      const idorRes = await request(app)
        .get(`/api/v1/submissions/${aliceSubmissionId}`)
        .set('Authorization', `Bearer ${otherCandidateToken}`);

      expect(idorRes.status).toBe(404);
      expect(idorRes.body.error.code).toBe('SUBMISSION_NOT_FOUND');
    });

    test('9. Interviewer can view candidate submission with full test case details including hidden tests', async () => {
      const res = await request(app)
        .post('/api/v1/submissions')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          questionId: sampleQuestion.id,
          language: 'javascript',
          code: 'function twoSum() { return [0,1]; }',
        });

      const submissionId = res.body.submission.id;
      await new Promise((resolve) => setTimeout(resolve, 350));

      const viewRes = await request(app)
        .get(`/api/v1/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${interviewerToken}`);

      expect(viewRes.status).toBe(200);
      const testResults = viewRes.body.submission.testResults;
      expect(testResults.length).toBe(2);
      expect(testResults[1].isHidden).toBe(true);
      expect(testResults[1].input).toBe('SECRET_HIDDEN_INPUT_ARRAY, 99');
    });
  });
});
