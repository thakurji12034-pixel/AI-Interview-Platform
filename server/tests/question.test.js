const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const {
  User,
  Question,
  TestCase,
  QuestionTopic,
  InterviewTemplate,
  Assessment,
  AssessmentQuestion,
} = require('../src/models');
const config = require('../src/config/env');
const { scanPayloadForCandidateLeaks } = require('../src/serializers/questionSerializer');

describe('Question Bank, Templates & Assessments API (/api/v1/questions, /api/v1/assessments)', () => {
  let adminUser;
  let interviewerUser;
  let candidateUser;
  let otherCandidateUser;
  let _adminToken;
  let interviewerToken;
  let candidateToken;
  let _otherCandidateToken;

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

  beforeEach(async () => {
    await AssessmentQuestion.destroy({ where: {}, force: true });
    await Assessment.destroy({ where: {}, force: true });
    await InterviewTemplate.destroy({ where: {}, force: true });
    await TestCase.destroy({ where: {}, force: true });
    await QuestionTopic.destroy({ where: {}, force: true });
    await Question.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@questions.test',
      passwordHash: 'dummyHash123',
      role: 'admin',
      isActive: true,
    });

    interviewerUser = await User.create({
      name: 'Interviewer Lead',
      email: 'lead@questions.test',
      passwordHash: 'dummyHash123',
      role: 'interviewer',
      isActive: true,
    });

    candidateUser = await User.create({
      name: 'Alice Candidate',
      email: 'alice@questions.test',
      passwordHash: 'dummyHash123',
      role: 'candidate',
      isActive: true,
    });

    otherCandidateUser = await User.create({
      name: 'Bob Candidate',
      email: 'bob@questions.test',
      passwordHash: 'dummyHash123',
      role: 'candidate',
      isActive: true,
    });

    _adminToken = createToken(adminUser);
    interviewerToken = createToken(interviewerUser);
    candidateToken = createToken(candidateUser);
    _otherCandidateToken = createToken(otherCandidateUser);
  });

  describe('RBAC & Question CRUD', () => {
    test('1. Candidate is forbidden from creating questions (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          title: 'Unauthorized Question',
          statement: 'Some statement',
          domain: 'DSA',
        });

      expect(res.status).toBe(403);
    });

    test('2. Interviewer can create a question with public and hidden test cases (201 Created)', async () => {
      const res = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({
          title: 'Reverse Linked List',
          statement: 'Given head, reverse the list.',
          domain: 'DSA',
          difficulty: 'beginner',
          type: 'coding',
          starterCode: { javascript: 'function reverseList(head) {}' },
          referenceKeyPoints: 'Three pointer iterative approach or recursive solution.',
          topics: ['Linked List', 'Pointers'],
          testCases: [
            { input: '[1,2,3,4,5]', expectedOutput: '[5,4,3,2,1]', isHidden: false, weight: 1 },
            { input: '[1,2]', expectedOutput: '[2,1]', isHidden: false, weight: 1 },
            { input: '[]', expectedOutput: '[]', isHidden: true, weight: 2 },
            { input: '[1]', expectedOutput: '[1]', isHidden: true, weight: 2 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.question).toBeDefined();
      expect(res.body.question.title).toBe('Reverse Linked List');
      expect(res.body.question.referenceKeyPoints).toBeDefined(); // Interviewer sees reference solution
      expect(res.body.question.testCases.length).toBe(4);
    });

    test('3. Interviewer can list questions with domain and difficulty filters and pagination', async () => {
      // Create 3 questions across different domains
      await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({
          title: 'Q1 SQL',
          statement: 'SQL Query',
          domain: 'SQL',
          difficulty: 'intermediate',
        });

      await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({
          title: 'Q2 React',
          statement: 'React Hooks',
          domain: 'React',
          difficulty: 'beginner',
        });

      const listRes = await request(app)
        .get('/api/v1/questions?domain=SQL')
        .set('Authorization', `Bearer ${interviewerToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.questions.length).toBe(1);
      expect(listRes.body.questions[0].domain).toBe('SQL');
      expect(listRes.body.pagination.total).toBe(1);
    });
  });

  describe('Candidate Anti-Leak Guard (Zero Hidden Data Exposure)', () => {
    test('4. Candidate listing or viewing questions NEVER receives referenceKeyPoints or hidden test cases', async () => {
      // Create question with secret reference and hidden test cases
      const createRes = await request(app)
        .post('/api/v1/questions')
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({
          title: 'Secret Question',
          statement: 'Secret problem statement',
          domain: 'DSA',
          difficulty: 'intermediate',
          referenceKeyPoints: 'TOP_SECRET_OPTIMAL_SOLUTION_KEY_POINTS_12345',
          testCases: [
            { input: 'public_input_1', expectedOutput: 'public_out_1', isHidden: false },
            { input: 'TOP_SECRET_HIDDEN_INPUT_999', expectedOutput: 'TOP_SECRET_OUTPUT_999', isHidden: true },
          ],
        });

      const questionId = createRes.body.question.id;

      // Now query as candidate
      const candGetRes = await request(app)
        .get(`/api/v1/questions/${questionId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(candGetRes.status).toBe(200);
      const candQ = candGetRes.body.question;

      // Assert zero leak of reference solution
      expect(candQ.referenceKeyPoints).toBeUndefined();

      // Assert zero leak of hidden test cases
      expect(candQ.testCases.length).toBe(1);
      expect(candQ.testCases[0].input).toBe('public_input_1');
      expect(candQ.testCases[0].isHidden).toBeUndefined();

      // Run automated string scanner across candidate response
      const violations = scanPayloadForCandidateLeaks(candGetRes.body);
      expect(violations).toEqual([]);

      const rawJson = JSON.stringify(candGetRes.body);
      expect(rawJson).not.toContain('TOP_SECRET_OPTIMAL_SOLUTION_KEY_POINTS_12345');
      expect(rawJson).not.toContain('TOP_SECRET_HIDDEN_INPUT_999');
      expect(rawJson).not.toContain('TOP_SECRET_OUTPUT_999');
    });
  });

  describe('Randomized Selection & Candidate Encounter Avoidance', () => {
    test('5. Randomized selection avoids questions already encountered by the candidate', async () => {
      // Create 3 questions in DBMS domain
      const q1 = await Question.create({
        title: 'DBMS Indexing',
        statement: 'Explain B-Trees vs Hash indexes',
        domain: 'DBMS',
        status: 'published',
      });
      const q2 = await Question.create({
        title: 'DBMS Normalization',
        statement: 'Explain 3NF vs BCNF',
        domain: 'DBMS',
        status: 'published',
      });
      const q3 = await Question.create({
        title: 'DBMS Sharding',
        statement: 'Explain range vs hash sharding',
        domain: 'DBMS',
        status: 'published',
      });

      // Give candidate an assessment containing q1 and q2
      const previousAssessment = await Assessment.create({
        candidateId: candidateUser.id,
        title: 'Prior Assessment',
        status: 'completed',
      });

      await AssessmentQuestion.create({ assessmentId: previousAssessment.id, questionId: q1.id });
      await AssessmentQuestion.create({ assessmentId: previousAssessment.id, questionId: q2.id });

      // Request 1 random question for candidateUser -> must choose q3 (unseen)
      const randomRes = await request(app)
        .get(`/api/v1/questions/random?domain=DBMS&count=1&candidateId=${candidateUser.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`);

      expect(randomRes.status).toBe(200);
      expect(randomRes.body.questions.length).toBe(1);
      expect(randomRes.body.questions[0].id).toBe(q3.id);
    });
  });

  describe('Assessments & Candidate Access Controls', () => {
    test('6. Interviewer can create assessment for candidate with questions', async () => {
      const q = await Question.create({
        title: 'Two Sum',
        statement: 'Two sum statement',
        domain: 'DSA',
        status: 'published',
      });

      const res = await request(app)
        .post('/api/v1/assessments')
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({
          candidateId: candidateUser.id,
          title: 'Frontend Technical Assessment',
          questionIds: [q.id],
        });

      expect(res.status).toBe(201);
      expect(res.body.assessment).toBeDefined();
      expect(res.body.assessment.candidateId).toBe(candidateUser.id);
      expect(res.body.assessment.questions.length).toBe(1);
    });

    test('7. Candidate can only view their own assessment; requesting other candidate returns 404', async () => {
      const otherAssessment = await Assessment.create({
        candidateId: otherCandidateUser.id,
        title: 'Bob Assessment',
        status: 'pending',
      });

      // Alice tries to access Bob's assessment -> 404 Not Found to prevent IDOR
      const res = await request(app)
        .get(`/api/v1/assessments/${otherAssessment.id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ASSESSMENT_NOT_FOUND');
    });

    test('8. Candidate can submit code answer to their assessment question', async () => {
      const q = await Question.create({
        title: 'Fibonacci',
        statement: 'Calculate fibonacci',
        domain: 'DSA',
        status: 'published',
      });

      const assessment = await Assessment.create({
        candidateId: candidateUser.id,
        title: 'Alice Assessment',
        status: 'pending',
      });

      await AssessmentQuestion.create({
        assessmentId: assessment.id,
        questionId: q.id,
        orderIndex: 1,
      });

      const submitRes = await request(app)
        .post(`/api/v1/assessments/${assessment.id}/submit`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          questionId: q.id,
          candidateCode: 'function fib(n) { return n <= 1 ? n : fib(n-1) + fib(n-2); }',
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);
      expect(submitRes.body.submission.status).toBe('submitted');

      // Verify assessment moved to in_progress
      const updatedAssessment = await Assessment.findByPk(assessment.id);
      expect(updatedAssessment.status).toBe('in_progress');
      expect(updatedAssessment.startedAt).not.toBeNull();
    });
  });
});
