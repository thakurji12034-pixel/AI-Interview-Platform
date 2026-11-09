const request = require('supertest');
const app = require('../src/app');
const { User, Interview } = require('../src/models');

describe('Authentication API (/api/v1/auth)', () => {
  const testCandidate = {
    name: 'Alice Candidate',
    email: 'alice.candidate@example.com',
    password: 'SecurePassword123!',
  };

  beforeEach(async () => {
    await Interview.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  // 1. Successful registration
  test('1. POST /register creates a new candidate with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testCandidate);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testCandidate.email);
    expect(res.body.user.role).toBe('candidate');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  // 2. Duplicate email rejection
  test('2. POST /register rejects registration with an existing email (409 Conflict)', async () => {
    await request(app).post('/api/v1/auth/register').send(testCandidate);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testCandidate);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  // 3. Validation failure
  test('3. POST /register rejects invalid email or passwords under 10 characters (400 Bad Request)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Bob',
      email: 'not-an-email',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  // 4. Role escalation prevention on public registration
  test('4. POST /register rejects role escalation when requesting interviewer role on public registration (400 Bad Request)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      ...testCandidate,
      email: 'attacker@example.com',
      role: 'interviewer',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  // 5. Successful login
  test('5. POST /login authenticates valid user, returns access token, and sets httpOnly refresh cookie', async () => {
    await request(app).post('/api/v1/auth/register').send(testCandidate);

    const res = await request(app).post('/api/v1/auth/login').send({
      email: testCandidate.email,
      password: testCandidate.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(testCandidate.email);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('refreshToken=') && c.includes('HttpOnly'))).toBe(true);
  });

  // 6. Invalid credentials rejection
  test('6. POST /login rejects incorrect password with generic error message (401 Unauthorized)', async () => {
    await request(app).post('/api/v1/auth/register').send(testCandidate);

    const res = await request(app).post('/api/v1/auth/login').send({
      email: testCandidate.email,
      password: 'WrongPassword999!',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  // 7. Refresh token rotation
  test('7. POST /refresh rotates refresh token and returns new access token', async () => {
    await request(app).post('/api/v1/auth/register').send(testCandidate);
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: testCandidate.email,
      password: testCandidate.password,
    });

    const cookies = loginRes.headers['set-cookie'];

    // Wait 1.05s so that the JWT iat timestamp advances, producing a distinct signature
    await new Promise((resolve) => setTimeout(resolve, 1050));

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.accessToken).not.toBe(loginRes.body.accessToken);

    const rotatedCookies = res.headers['set-cookie'];
    expect(rotatedCookies).toBeDefined();
    expect(rotatedCookies.some((c) => c.includes('refreshToken=') && c.includes('HttpOnly'))).toBe(true);
  });

  // 8. Rejects invalid or missing refresh token
  test('8. POST /refresh rejects request without refresh cookie or with invalid token (401 Unauthorized)', async () => {
    const noCookieRes = await request(app).post('/api/v1/auth/refresh');
    expect(noCookieRes.status).toBe(401);

    const tamperedRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refreshToken=invalid.tampered.token; Path=/api/v1/auth']);
    expect(tamperedRes.status).toBe(401);
  });

  // 9. Logout clears session and invalidates refresh token
  test('9. POST /logout clears cookies and revokes refresh token in database', async () => {
    await request(app).post('/api/v1/auth/register').send(testCandidate);
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: testCandidate.email,
      password: testCandidate.password,
    });

    const cookies = loginRes.headers['set-cookie'];
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('Logged out');

    // Attempting refresh with revoked cookie must fail
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);
    expect(refreshRes.status).toBe(401);
  });
});
