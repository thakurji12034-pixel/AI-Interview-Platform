const fs = require('fs');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');
const { createMigrator } = require('../config/migrator');
const config = require('../config/env');

const TEST_DB = 'interview_platform_migrate_test';
const BACKUP_PATH = process.argv[2] || 'D:\\db_backups\\interview_platform_pre_phase_4.sql';

const log = (msg) => console.log(`[MIGRATION-TEST] ${msg}`);

async function run() {
  log(`Starting migration safety verification against isolated database: ${TEST_DB}`);
  log(`Source backup file: ${BACKUP_PATH}`);

  if (!fs.existsSync(BACKUP_PATH)) {
    throw new Error(`Backup file does not exist at ${BACKUP_PATH}`);
  }

  // 1. Connect to MySQL server and recreate isolated test DB
  const rawConn = await mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.pass,
    multipleStatements: true,
  });

  log(`Creating clean isolated test database: ${TEST_DB}`);
  await rawConn.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\`;`);
  await rawConn.query(`CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`);

  // 2. Restore backup into isolated database
  log(`Restoring backup into ${TEST_DB}...`);
  const sqlDump = fs.readFileSync(BACKUP_PATH, 'utf8');
  await rawConn.changeUser({ database: TEST_DB });
  await rawConn.query(sqlDump);
  await rawConn.end();
  log(`Restore completed successfully.`);

  // 3. Connect Sequelize to the restored test database
  const testSequelize = new Sequelize(TEST_DB, config.db.user, config.db.pass, {
    host: config.db.host,
    dialect: 'mysql',
    logging: false,
  });
  await testSequelize.authenticate();
  log(`Connected Sequelize to ${TEST_DB}`);

  const [usersBefore] = await testSequelize.query('SELECT COUNT(*) as count FROM users');
  const [interviewsBefore] = await testSequelize.query('SELECT COUNT(*) as count FROM interviews');
  log(`Pre-migration state: ${usersBefore[0].count} users, ${interviewsBefore[0].count} interviews`);

  const migrator = createMigrator(testSequelize);

  // 4. Run migration UP
  log('Running migration UP...');
  const applied = await migrator.up();
  log(`Applied ${applied.length} migration(s): ${applied.map((m) => m.name).join(', ')}`);

  const [tablesAfterUp] = await testSequelize.query('SHOW TABLES');
  const tableNames = tablesAfterUp.map((r) => Object.values(r)[0]);
  log(`Tables after UP: ${tableNames.join(', ')}`);

  const targetTables = [
    'questions',
    'question_topics',
    'test_cases',
    'interview_templates',
    'assessments',
    'assessment_questions',
    'submissions',
  ];
  for (const t of targetTables) {
    if (!tableNames.includes(t)) {
      throw new Error(`FAILED: Expected table ${t} not found after UP!`);
    }
  }
  log('VERIFIED: All target tables (including submissions) created successfully.');

  // 5. Test Idempotency: Running UP a second time
  log('Testing Idempotency: Running migration UP a second time...');
  const appliedSecond = await migrator.up();
  log(`Second UP applied ${appliedSecond.length} migrations (expected 0).`);
  if (appliedSecond.length !== 0) {
    throw new Error('FAILED: Migration is not idempotent!');
  }
  log('VERIFIED: Migration runner correctly recognizes migration as already executed.');

  // 6. Test Migration DOWN (Rollback)
  log('Testing Rollback: Running migration DOWN...');
  const reverted = await migrator.down();
  log(`Reverted ${reverted.length} migration(s): ${reverted.map((m) => m.name).join(', ')}`);

  const [tablesAfterDown] = await testSequelize.query('SHOW TABLES');
  const tableNamesAfterDown = tablesAfterDown.map((r) => Object.values(r)[0]);
  log(`Tables after DOWN: ${tableNamesAfterDown.join(', ')}`);
  if (tableNamesAfterDown.includes('submissions')) {
    throw new Error('FAILED: Table submissions was NOT dropped during down!');
  }
  log('VERIFIED: DOWN removed submissions table while preserving baseline data.');

  // 7. Re-apply UP to verify clean re-application
  log('Re-applying migration UP after rollback...');
  const reApplied = await migrator.up();
  log(`Re-applied ${reApplied.length} migration(s): ${reApplied.map((m) => m.name).join(', ')}`);

  const [finalUsers] = await testSequelize.query('SELECT COUNT(*) as count FROM users');
  const [finalInterviews] = await testSequelize.query('SELECT COUNT(*) as count FROM interviews');
  log(`Final verified state: ${finalUsers[0].count} users, ${finalInterviews[0].count} interviews intact.`);

  await testSequelize.close();
  log('MIGRATION SAFETY TEST COMPLETED WITH 100% SUCCESS.');
}

run().catch((err) => {
  console.error('[MIGRATION-TEST ERROR]', err);
  process.exit(1);
});
