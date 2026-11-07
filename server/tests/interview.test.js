const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { User, Interview } = require('../src/models');
const { addMinutes } = require('../src/services/interviewService');
const config = require('../src/config/env');

describe('Interview Management API (/api/v1/interviews)', () => {
  let interviewerToken;
  let interviewer2Token;
  let candidateToken;
  let candidate2Token;
  let interviewerUser;
  let interviewer2User;
  let candidateUser;
  let candidate2User;

  const createToken = (user) =>
    jwt.sign({ id: user.id, role: user.role }, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiresIn,
      algorithm: config.jwt.algorithm,
    });

  beforeEach(async () => {
    await Interview.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    interviewerUser = await User.create({
      name: 'Lead Interviewer',
      email: 'lead.interviewer@example.com',
      passwordHash: 'mockPasswordHashForTesting',
      role: 'interviewer',
    });

    interviewer2User = await User.create({
      name: 'Second Interviewer',
      email: 'second.interviewer@example.com',
      passwordHash: 'mockPasswordHashForTesting',
      role: 'interviewer',
    });

    candidateUser = await User.create({
      name: 'John Candidate',
      email: 'john.candidate@example.com',
      passwordHash: 'mockPasswordHashForTesting',
      role: 'candidate',
    });

    candidate2User = await User.create({
      name: 'Jane Candidate',
      email: 'jane.candidate@example.com',
      passwordHash: 'mockPasswordHashForTesting',
      role: 'candidate',
    });

    interviewerToken = createToken(interviewerUser);
    interviewer2Token = createToken(interviewer2User);
    candidateToken = createToken(candidateUser);
    candidate2Token = createToken(candidate2User);
  });

  // 1. Unauthenticated rejection
  test('1. POST /interviews rejects unauthenticated request (401 Unauthorized)', async () => {
    const res = await request(app).post('/api/v1/interviews').send({});
    expect(res.status).toBe(401);
  });

  // 2. Candidate role forbidden
  test('2. POST /interviews forbids candidate from scheduling interviews (403 Forbidden)', async () => {
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();
    const res = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        candidateEmail: candidate2User.email,
        title: 'Peer Review',
        scheduledAt,
        durationMinutes: 45,
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/insufficient role/i);
  });

  // 3. Interviewer scheduling
  test('3. POST /interviews allows interviewer to schedule interview with candidate (201 Created)', async () => {
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();
    const res = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({
        candidateEmail: candidateUser.email,
        title: 'Backend Systems Architecture',
        scheduledAt,
        durationMinutes: 60,
      });

    expect(res.status).toBe(201);
    expect(res.body.interview).toBeDefined();
    expect(res.body.interview.interviewerId).toBe(interviewerUser.id);
    expect(res.body.interview.candidateId).toBe(candidateUser.id);
    expect(res.body.interview.roomId).toBeDefined();
    expect(res.body.interview.status).toBe('scheduled');
  });

  // 4. Non-existent candidate
  test('4. POST /interviews rejects non-existent candidate email (404 Not Found)', async () => {
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();
    const res = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({
        candidateEmail: 'ghost@example.com',
        title: 'Ghost Interview',
        scheduledAt,
        durationMinutes: 60,
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Candidate not found');
  });

  // 5. Candidate email belonging to an interviewer
  test('5. POST /interviews rejects candidate email belonging to an interviewer (404 Not Found)', async () => {
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();
    const res = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({
        candidateEmail: interviewer2User.email,
        title: 'Staff Review',
        scheduledAt,
        durationMinutes: 60,
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Candidate not found');
  });

  // 6. Rejects past scheduling
  test('6. POST /interviews rejects scheduledAt in the past (400 Bad Request)', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const res = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({
        candidateEmail: candidateUser.email,
        title: 'Past Interview',
        scheduledAt: pastDate,
        durationMinutes: 60,
      });

    expect(res.status).toBe(400);
  });

  // 7. Candidate clash detection
  test('7. POST /interviews rejects scheduling when candidate has an overlapping interview (409 Conflict)', async () => {
    const start = new Date(Date.now() + 86400000);
    const scheduledAt = start.toISOString();

    // First interview scheduled by interviewer 1 with candidate 1 (10:00 - 11:00)
    await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({
        candidateEmail: candidateUser.email,
        title: 'First Round',
        scheduledAt,
        durationMinutes: 60,
      });

    // Second interview scheduled by interviewer 2 with candidate 1 (10:30 - 11:30)
    const overlapTime = new Date(start.getTime() + 30 * 60000).toISOString();
    const clashRes = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewer2Token}`)
      .send({
        candidateEmail: candidateUser.email,
        title: 'Second Round Overlap',
        scheduledAt: overlapTime,
        durationMinutes: 60,
      });

    expect(clashRes.status).toBe(409);
    expect(clashRes.body.message).toMatch(/clashes/i);
  });

  // 8. Interviewer clash detection
  test('8. POST /interviews rejects scheduling when interviewer has an overlapping interview (409 Conflict)', async () => {
    const start = new Date(Date.now() + 86400000);
    const scheduledAt = start.toISOString();

    // Interviewer 1 schedules with candidate 1 (10:00 - 11:00)
    await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({
        candidateEmail: candidateUser.email,
        title: 'Session A',
        scheduledAt,
        durationMinutes: 60,
      });

    // Interviewer 1 attempts to schedule with candidate 2 at overlapping time
    const overlapTime = new Date(start.getTime() + 15 * 60000).toISOString();
    const clashRes = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({
        candidateEmail: candidate2User.email,
        title: 'Session B Overlap',
        scheduledAt: overlapTime,
        durationMinutes: 45,
      });

    expect(clashRes.status).toBe(409);
    expect(clashRes.body.message).toMatch(/clashes/i);
  });

  // 9. Adjacent scheduling allowed
  test('9. POST /interviews allows scheduling immediately adjacent sessions without conflict', async () => {
    const start = new Date(Date.now() + 86400000);
    const scheduledAt = start.toISOString();

    // Session 1: 10:00 to 11:00 (duration 60)
    await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({
        candidateEmail: candidateUser.email,
        title: 'Session 1',
        scheduledAt,
        durationMinutes: 60,
      });

    // Session 2: Exactly 11:00 to 12:00
    const adjacentTime = new Date(start.getTime() + 60 * 60000).toISOString();
    const adjacentRes = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({
        candidateEmail: candidate2User.email,
        title: 'Session 2 Adjacent',
        scheduledAt: adjacentTime,
        durationMinutes: 60,
      });

    expect(adjacentRes.status).toBe(201);
  });

  // 10. Interviewer visibility scoping
  test('10. GET /interviews scopes list strictly to sessions belonging to the requesting interviewer', async () => {
    const time = new Date(Date.now() + 86400000).toISOString();
    await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ candidateEmail: candidateUser.email, title: 'IV1 Interview', scheduledAt: time });

    await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewer2Token}`)
      .send({ candidateEmail: candidate2User.email, title: 'IV2 Interview', scheduledAt: time });

    const res = await request(app)
      .get('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.interviews).toHaveLength(1);
    expect(res.body.interviews[0].title).toBe('IV1 Interview');
  });

  // 11. Candidate visibility scoping
  test('11. GET /interviews scopes list strictly to sessions belonging to the requesting candidate', async () => {
    const time = new Date(Date.now() + 86400000).toISOString();
    await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ candidateEmail: candidateUser.email, title: 'Candidate 1 Session', scheduledAt: time });

    const res = await request(app)
      .get('/api/v1/interviews')
      .set('Authorization', `Bearer ${candidate2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.interviews).toHaveLength(0);
  });

  // 12. Status filtering
  test('12. GET /interviews?status=scheduled filters sessions by status accurately', async () => {
    const time = new Date(Date.now() + 86400000).toISOString();
    const created = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ candidateEmail: candidateUser.email, title: 'Status Filter Session', scheduledAt: time });

    const id = created.body.interview.id;
    await request(app)
      .patch(`/api/v1/interviews/${id}/status`)
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ status: 'in_progress' });

    const scheduledRes = await request(app)
      .get('/api/v1/interviews?status=scheduled')
      .set('Authorization', `Bearer ${interviewerToken}`);
    expect(scheduledRes.body.interviews).toHaveLength(0);

    const inProgressRes = await request(app)
      .get('/api/v1/interviews?status=in_progress')
      .set('Authorization', `Bearer ${interviewerToken}`);
    expect(inProgressRes.body.interviews).toHaveLength(1);
  });

  // 13. Single interview retrieval
  test('13. GET /interviews/:id returns interview with candidate and interviewer details for participant', async () => {
    const time = new Date(Date.now() + 86400000).toISOString();
    const created = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ candidateEmail: candidateUser.email, title: 'Details Session', scheduledAt: time });

    const id = created.body.interview.id;
    const res = await request(app)
      .get(`/api/v1/interviews/${id}`)
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(200);
    expect(res.body.interview.candidate.name).toBe(candidateUser.name);
    expect(res.body.interview.interviewer.name).toBe(interviewerUser.name);
  });

  // 14. Non-participant receives 404
  test('14. GET /interviews/:id returns 404 Not Found for non-participants to prevent resource enumeration', async () => {
    const time = new Date(Date.now() + 86400000).toISOString();
    const created = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ candidateEmail: candidateUser.email, title: 'Private Session', scheduledAt: time });

    const id = created.body.interview.id;
    const res = await request(app)
      .get(`/api/v1/interviews/${id}`)
      .set('Authorization', `Bearer ${interviewer2Token}`);

    expect(res.status).toBe(404);
  });

  // 15. Interviewer updates scheduled session
  test('15. PATCH /interviews/:id allows interviewer to edit and reschedule scheduled session', async () => {
    const time = new Date(Date.now() + 86400000).toISOString();
    const created = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ candidateEmail: candidateUser.email, title: 'Initial Title', scheduledAt: time });

    const id = created.body.interview.id;
    const newTime = new Date(Date.now() + 2 * 86400000).toISOString();

    const res = await request(app)
      .patch(`/api/v1/interviews/${id}`)
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ title: 'Updated Title', scheduledAt: newTime });

    expect(res.status).toBe(200);
    expect(res.body.interview.title).toBe('Updated Title');
  });

  // 16. In-progress session cannot be edited
  test('16. PATCH /interviews/:id rejects edits on in_progress or completed sessions (409 Conflict)', async () => {
    const time = new Date(Date.now() + 86400000).toISOString();
    const created = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ candidateEmail: candidateUser.email, title: 'Active Session', scheduledAt: time });

    const id = created.body.interview.id;
    await request(app)
      .patch(`/api/v1/interviews/${id}/status`)
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ status: 'in_progress' });

    const editRes = await request(app)
      .patch(`/api/v1/interviews/${id}`)
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ title: 'Cannot Change' });

    expect(editRes.status).toBe(409);
    expect(editRes.body.message).toMatch(/only scheduled interviews can be edited/i);
  });

  // 17. Valid state transitions
  test('17. PATCH /interviews/:id/status allows interviewer to transition scheduled -> in_progress -> completed', async () => {
    const time = new Date(Date.now() + 86400000).toISOString();
    const created = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ candidateEmail: candidateUser.email, title: 'State Flow Session', scheduledAt: time });

    const id = created.body.interview.id;

    const startRes = await request(app)
      .patch(`/api/v1/interviews/${id}/status`)
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ status: 'in_progress' });
    expect(startRes.status).toBe(200);
    expect(startRes.body.interview.status).toBe('in_progress');

    const finishRes = await request(app)
      .patch(`/api/v1/interviews/${id}/status`)
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ status: 'completed' });
    expect(finishRes.status).toBe(200);
    expect(finishRes.body.interview.status).toBe('completed');
  });

  // 18. Candidate role restrictions on status transition
  test('18. PATCH /interviews/:id/status allows candidate to cancel, but forbids candidate from starting session (403)', async () => {
    const time = new Date(Date.now() + 86400000).toISOString();
    const created = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({ candidateEmail: candidateUser.email, title: 'Candidate Transition Session', scheduledAt: time });

    const id = created.body.interview.id;

    // Candidate forbidden from starting session
    const startRes = await request(app)
      .patch(`/api/v1/interviews/${id}/status`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ status: 'in_progress' });
    expect(startRes.status).toBe(403);

    // Candidate permitted to cancel session
    const cancelRes = await request(app)
      .patch(`/api/v1/interviews/${id}/status`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ status: 'cancelled' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.interview.status).toBe('cancelled');
  });
});
