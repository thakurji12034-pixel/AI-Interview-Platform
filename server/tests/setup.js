// Set test environment configuration before loading any modules
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'interview_platform_test';
process.env.JWT_SECRET = 'test_secret_must_be_at_least_32_characters_long_for_security';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_characters_long_for_security';
process.env.ALLOW_DEV_INTERVIEWER_REGISTRATION = 'false';

// Non-negotiable test database safety guard
const targetDb = process.env.DB_NAME;
if (!targetDb || !targetDb.endsWith('_test') || targetDb === 'interview_platform') {
  throw new Error(
    `FATAL SAFETY VIOLATION: Test suite attempted to run against protected database "${targetDb}". Tests must strictly run on a database ending with "_test".`
  );
}

const mysql = require('mysql2/promise');
const sequelize = require('../src/config/db');
const { User, Interview } = require('../src/models');

beforeAll(async () => {
  // Ensure the dedicated test database exists in MySQL
  const adminConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
  });

  await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\``);
  await adminConn.end();

  // Connect and initialize clean tables in the test database
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});
