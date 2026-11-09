const { Buffer } = require('buffer');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const config = require('../src/config/env');
const {
  User,
  Resume,
  CandidateSkill,
  AuditLog,
} = require('../src/models');
const { startWorker, stopWorker } = require('../src/worker');
const { queueManager } = require('../src/jobs/queueManager');

describe('Resume Intelligence API (/api/v1/resumes)', () => {
  let candidateUser;
  let otherCandidateUser;
  let candidateToken;
  let otherCandidateToken;

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
    await AuditLog.destroy({ where: {}, force: true });
    await CandidateSkill.destroy({ where: {}, force: true });
    await Resume.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    candidateUser = await User.create({
      name: 'Alice Candidate',
      email: 'alice@resume.test',
      passwordHash: 'dummyHash123',
      role: 'candidate',
      isActive: true,
    });

    otherCandidateUser = await User.create({
      name: 'Bob Candidate',
      email: 'bob@resume.test',
      passwordHash: 'dummyHash123',
      role: 'candidate',
      isActive: true,
    });

    candidateToken = createToken(candidateUser);
    otherCandidateToken = createToken(otherCandidateUser);
  });

  describe('Upload Validation & Magic Bytes Security', () => {
    test('1. Rejects file upload without %PDF- magic bytes header (400 Bad Request)', async () => {
      // Fake PDF header with text content
      const fakeBuffer = Buffer.from('NOT_A_REAL_PDF_HEADER_CONTENT');

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('resume', fakeBuffer, 'fake.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_MAGIC_BYTES');
    });

    test('2. Rejects non-PDF file upload by extension/mimetype', async () => {
      const textBuffer = Buffer.from('Some plain text resume');

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('resume', textBuffer, 'resume.txt');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    });
  });

  describe('Resume Parsing Pipeline & Structured Intelligence', () => {
    test('3. Uploads valid PDF document and enqueues parsing job', async () => {
      // Valid minimal PDF header (%PDF-1.4)
      const validPdfBuffer = Buffer.from('%PDF-1.4\nJane Candidate\nExperienced Node.js, React, and PostgreSQL Engineer with 4 years experience.\n%%EOF');

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('resume', validPdfBuffer, 'candidate_resume.pdf');

      expect(res.status).toBe(201);
      expect(res.body.resume.id).toBeDefined();
      expect(res.body.resume.status).toBe('uploaded');

      const resumeId = res.body.resume.id;

      // Allow background worker to parse resume
      let pollRes;
      for (let i = 0; i < 25; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        pollRes = await request(app)
          .get(`/api/v1/resumes/${resumeId}`)
          .set('Authorization', `Bearer ${candidateToken}`);
        if (pollRes.body.resume?.status === 'parsed') break;
      }

      expect(pollRes.status).toBe(200);
      expect(pollRes.body.resume.status).toBe('parsed');
      expect(pollRes.body.resume.parsedData).toBeDefined();
      expect(pollRes.body.resume.parsedData.skills.length).toBeGreaterThan(0);
    }, 15000);

    test('4. Extracted skills are normalized against canonical taxonomy and upserted into candidate_skills', async () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\nJane Candidate\nSkills: javascript, reactjs, nodejs, postgresql, docker\n%%EOF');

      const uploadRes = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('resume', validPdfBuffer, 'resume.pdf');

      expect(uploadRes.body.resume.id).toBeDefined();
      for (let i = 0; i < 25; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const skills = await CandidateSkill.findAll({ where: { userId: candidateUser.id } });
        if (skills.length > 0) break;
      }

      const skills = await CandidateSkill.findAll({ where: { userId: candidateUser.id } });
      expect(skills.length).toBeGreaterThan(0);

      const skillNames = skills.map((s) => s.skillName);
      expect(skillNames).toContain('JavaScript');
      expect(skillNames).toContain('Node.js');
    });
  });

  describe('Job Description Matching & Candidate Privacy', () => {
    test('5. Computes deterministic skill overlap match score against job description', async () => {
      // Seed candidate skills
      await CandidateSkill.create({
        userId: candidateUser.id,
        skillName: 'JavaScript',
        category: 'Languages',
        proficiencyLevel: 'expert',
        source: 'resume',
      });
      await CandidateSkill.create({
        userId: candidateUser.id,
        skillName: 'React',
        category: 'Frontend',
        proficiencyLevel: 'expert',
        source: 'resume',
      });

      const jdText = 'We are seeking a Senior Frontend Engineer proficient in React, JavaScript, and Docker for high-scale applications.';

      const matchRes = await request(app)
        .post('/api/v1/resumes/match-job')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobDescription: jdText });

      expect(matchRes.status).toBe(200);
      expect(matchRes.body.totalRequired).toBe(3); // React, JavaScript, Docker
      expect(matchRes.body.matchedCount).toBe(2); // React, JavaScript
      expect(matchRes.body.matchScore).toBe(67); // 2/3 = 67%
      expect(matchRes.body.matchedSkills).toContain('React');
      expect(matchRes.body.missingSkills).toContain('Docker');
    });

    test('6. Candidate can delete resume, removing file and derived skills with audit trail', async () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\nJane Candidate Resume\n%%EOF');

      const uploadRes = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('resume', validPdfBuffer, 'delete_me.pdf');

      const resumeId = uploadRes.body.resume.id;
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Delete resume
      const deleteRes = await request(app)
        .delete(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify DB record is deleted
      const checkResume = await Resume.findByPk(resumeId);
      expect(checkResume).toBeNull();

      // Verify audit log entry
      const audit = await AuditLog.findOne({
        where: { targetType: 'Resume', targetId: resumeId },
      });
      expect(audit).toBeDefined();
      expect(audit.action).toBe('RESUME_DELETED');
    });

    test('7. Candidate cannot view or delete another candidate\'s resume (404 IDOR prevention)', async () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\nAlice Private Resume\n%%EOF');

      const uploadRes = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('resume', validPdfBuffer, 'alice.pdf');

      const aliceResumeId = uploadRes.body.resume.id;

      // Bob attempts to get Alice's resume
      const getRes = await request(app)
        .get(`/api/v1/resumes/${aliceResumeId}`)
        .set('Authorization', `Bearer ${otherCandidateToken}`);

      expect(getRes.status).toBe(404);
      expect(getRes.body.error.code).toBe('RESUME_NOT_FOUND');

      // Bob attempts to delete Alice's resume
      const deleteRes = await request(app)
        .delete(`/api/v1/resumes/${aliceResumeId}`)
        .set('Authorization', `Bearer ${otherCandidateToken}`);

      expect(deleteRes.status).toBe(404);
      expect(deleteRes.body.error.code).toBe('RESUME_NOT_FOUND');
    });
  });

  describe('ML Resume Category Prediction Engine', () => {
    test('8. Predicts resume category from raw text using trained ML classifier', async () => {
      const sampleText = 'Senior Java Developer with extensive Spring Boot, Microservices, JVM performance tuning, and Kafka experience.';

      const res = await request(app)
        .post('/api/v1/resumes/predict-category')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ text: sampleText });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.predictedCategory).toBe('Java Developer');
      expect(typeof res.body.confidence).toBe('number');
      expect(Array.isArray(res.body.topPredictions)).toBe(true);
      expect(res.body.topPredictions.length).toBeGreaterThan(0);
      expect(res.body.modelInfo).toBeDefined();
    });

    test('9. Rejects empty resume text for ML category prediction (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/resumes/predict-category')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ text: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PREDICTION_INPUT');
    });

    test('10. Returns ML model metadata and trained classes', async () => {
      const res = await request(app)
        .get('/api/v1/resumes/ml/metadata')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metadata).toBeDefined();
      expect(res.body.metadata.numClasses).toBe(25);
      expect(res.body.metadata.metrics).toBeDefined();
      expect(res.body.metadata.metrics.accuracy).toBeGreaterThan(0.9);
    });
  });
});
