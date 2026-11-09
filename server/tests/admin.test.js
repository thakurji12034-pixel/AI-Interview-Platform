const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const {
  User,
  Invitation,
  RefreshToken,
  AuditLog,
  PlatformSetting,
  Interview,
} = require('../src/models');
const config = require('../src/config/env');
const { hashToken } = require('../src/services/authService');

describe('RBAC, Invitations, Token Families & Admin API (/api/v1/admin)', () => {
  let adminUser;
  let interviewerUser;
  let candidateUser;
  let adminToken;
  let interviewerToken;
  let candidateToken;

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
    await RefreshToken.destroy({ where: {}, force: true });
    await Invitation.destroy({ where: {}, force: true });
    await AuditLog.destroy({ where: {}, force: true });
    await PlatformSetting.destroy({ where: {}, force: true });
    await Interview.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@example.com',
      passwordHash: 'dummyAdminHash123',
      role: 'admin',
      isActive: true,
    });

    interviewerUser = await User.create({
      name: 'Tech Lead',
      email: 'interviewer@example.com',
      passwordHash: 'dummyInterviewerHash123',
      role: 'interviewer',
      isActive: true,
    });

    candidateUser = await User.create({
      name: 'John Candidate',
      email: 'candidate@example.com',
      passwordHash: 'dummyCandidateHash123',
      role: 'candidate',
      isActive: true,
    });

    adminToken = createToken(adminUser);
    interviewerToken = createToken(interviewerUser);
    candidateToken = createToken(candidateUser);
  });

  // 1. Candidate role forbidden from admin endpoints
  test('1. Candidate is rejected from accessing admin routes (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 2. Interviewer role forbidden from admin endpoints
  test('2. Interviewer is rejected from accessing admin routes (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${interviewerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 3. Admin lists users with pagination
  test('3. Admin can list users with pagination and search', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?limit=10&page=1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(3);
    expect(res.body.pagination.total).toBe(3);
  });

  // 4. Admin updates user role
  test('4. Admin can promote candidate to interviewer', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${candidateUser.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'interviewer' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('interviewer');

    const updated = await User.findByPk(candidateUser.id);
    expect(updated.role).toBe('interviewer');
  });

  // 5. Admin cannot demote self
  test('5. Admin cannot demote themselves (400 Bad Request)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${adminUser.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'candidate' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_DEMOTE_SELF');
  });

  // 6. Admin can deactivate user and revoke sessions
  test('6. Admin can deactivate user, which revokes active sessions', async () => {
    // Issue a refresh token for candidate
    await RefreshToken.create({
      userId: candidateUser.id,
      tokenHash: 'sampleTokenHash123',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 86400000),
    });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${candidateUser.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.user.isActive).toBe(false);

    // Verify session revoked
    const activeTokens = await RefreshToken.findAll({
      where: { userId: candidateUser.id, revokedAt: null },
    });
    expect(activeTokens).toHaveLength(0);
  });

  // 7. Admin cannot deactivate self
  test('7. Admin cannot deactivate themselves (400 Bad Request)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${adminUser.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_DEACTIVATE_SELF');
  });

  // 8. Admin creates single-use invitation
  test('8. Admin can create an invitation for interviewer role', async () => {
    const res = await request(app)
      .post('/api/v1/admin/invitations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'new.interviewer@example.com', role: 'interviewer' });

    expect(res.status).toBe(201);
    expect(res.body.inviteToken).toBeDefined();
    expect(res.body.invitation.email).toBe('new.interviewer@example.com');
    expect(res.body.invitation.role).toBe('interviewer');
  });

  // 9. Registration with invitation assigns invited role
  test('9. User registering with valid invitation token receives interviewer role', async () => {
    const inviteRes = await request(app)
      .post('/api/v1/admin/invitations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'invited.pro@example.com', role: 'interviewer' });

    const { inviteToken } = inviteRes.body;

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Invited Pro',
        email: 'invited.pro@example.com',
        password: 'SecurePassword123!',
        inviteToken,
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.user.role).toBe('interviewer');

    // Verify invitation marked used
    const inv = await Invitation.findOne({ where: { tokenHash: hashToken(inviteToken) } });
    expect(inv.usedAt).not.toBeNull();
  });

  // 10. Reusing redeemed invitation fails
  test('10. Reusing a redeemed invitation token is rejected (400 Bad Request)', async () => {
    const inviteRes = await request(app)
      .post('/api/v1/admin/invitations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'single.use@example.com', role: 'interviewer' });

    const { inviteToken } = inviteRes.body;

    // First redemption succeeds
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Single Use User',
        email: 'single.use@example.com',
        password: 'SecurePassword123!',
        inviteToken,
      });

    // Second redemption attempt
    const secondRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Attacker Replay',
        email: 'single.use@example.com',
        password: 'SecurePassword123!',
        inviteToken,
      });

    expect(secondRes.status).toBe(400);
    expect(secondRes.body.error.code).toBe('INVALID_INVITATION');
  });

  // 11. Admin can list audit logs
  test('11. Admin can view recorded audit logs with actions', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.auditLogs).toBeDefined();
    expect(Array.isArray(res.body.auditLogs)).toBe(true);
  });

  // 12. Admin can manage platform settings
  test('12. Admin can read and update platform configuration settings', async () => {
    const updateRes = await request(app)
      .put('/api/v1/admin/settings/MAX_INTERVIEW_DURATION')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: { minutes: 120 }, description: 'Maximum allowed interview length' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.setting.key).toBe('MAX_INTERVIEW_DURATION');

    const getRes = await request(app)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.settings.MAX_INTERVIEW_DURATION).toEqual({ minutes: 120 });
  });

  // 13. Refresh token reuse detection & family revocation
  test('13. Refresh token reuse detection revokes entire token family (401)', async () => {
    // 1. Prepare user with valid bcrypt password hash
    const bcrypt = require('bcryptjs');
    candidateUser.passwordHash = await bcrypt.hash('RealPassword123!', 10);
    await candidateUser.save();

    const realLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: candidateUser.email, password: 'RealPassword123!' });

    const cookies = realLoginRes.headers['set-cookie'];

    // 2. Refresh token rotation (advancing iat)
    await new Promise((r) => setTimeout(r, 1050));
    const firstRefreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);

    expect(firstRefreshRes.status).toBe(200);

    // 3. Replay attack: Attacker tries to refresh again using the consumed old cookie!
    const replayRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);

    expect(replayRes.status).toBe(401);
    expect(replayRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');

    // 4. Verify all tokens in that family were revoked
    const activeTokens = await RefreshToken.findAll({
      where: { userId: candidateUser.id, revokedAt: null },
    });
    expect(activeTokens).toHaveLength(0);
  });
});

