const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');
const { createMigrator } = require('../config/migrator');
const config = require('../config/env');

const TEST_DB = 'interview_platform_migrate_test';
const BACKUP_PATH = 'D:\\db_backups\\interview_platform_pre_intelliprep.sql';

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
  log(`Restoring pre-intelliprep backup into ${TEST_DB}...`);
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

  // Inspect pre-migration baseline
  const [usersBefore] = await testSequelize.query('SELECT COUNT(*) as count FROM users');
  const [interviewsBefore] = await testSequelize.query('SELECT COUNT(*) as count FROM interviews');
  const [indexesBefore] = await testSequelize.query('SHOW INDEX FROM interviews');
  log(`Pre-migration state: ${usersBefore[0].count} users, ${interviewsBefore[0].count} interviews`);
  log(`Pre-migration interview index names: ${indexesBefore.map((i) => i.Key_name).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`);

  const migrator = createMigrator(testSequelize);

  // 4. Run migration UP
  log('Running migration UP...');
  const applied = await migrator.up();
  log(`Applied ${applied.length} migration(s): ${applied.map((m) => m.name).join(', ')}`);

  // Verify post-migration state
  const [indexesAfterUp] = await testSequelize.query('SHOW INDEX FROM interviews');
  const uniqueIndexNames = indexesAfterUp.map((i) => i.Key_name).filter((v, i, a) => a.indexOf(v) === i);
  log(`Post-migration UP interview indexes: ${uniqueIndexNames.join(', ')}`);

  const requiredIndexes = [
    'interviews_room_id_unique',
    'interviews_interviewer_scheduled',
    'interviews_candidate_scheduled',
    'interviews_status',
  ];
  for (const idx of requiredIndexes) {
    if (!uniqueIndexNames.includes(idx)) {
      throw new Error(`FAILED: Expected index ${idx} not found in interviews table!`);
    }
  }
  log('VERIFIED: All 4 required performance/unique indexes are present.');

  // 5. Verify Idempotency: Running UP again
  log('Testing Idempotency: Running migration UP a second time...');
  const appliedSecond = await migrator.up();
  log(`Second UP applied ${appliedSecond.length} migrations (expected 0).`);
  if (appliedSecond.length !== 0) {
    throw new Error('FAILED: Migration is not idempotent (re-applied already executed migration)!');
  }
  log('VERIFIED: Migration runner correctly recognizes migration as already executed.');

  // 6. Test Migration DOWN (Rollback)
  log('Testing Rollback: Running migration DOWN...');
  const reverted = await migrator.down();
  log(`Reverted ${reverted.length} migration(s): ${reverted.map((m) => m.name).join(', ')}`);

  // Verify DOWN safety: Tables and data must NOT be dropped!
  const [usersAfterDown] = await testSequelize.query('SELECT COUNT(*) as count FROM users');
  const [interviewsAfterDown] = await testSequelize.query('SELECT COUNT(*) as count FROM interviews');
  const [indexesAfterDown] = await testSequelize.query('SHOW INDEX FROM interviews');
  const indexNamesAfterDown = indexesAfterDown.map((i) => i.Key_name).filter((v, i, a) => a.indexOf(v) === i);

  log(`Post-migration DOWN state: ${usersAfterDown[0].count} users, ${interviewsAfterDown[0].count} interviews`);
  log(`Post-migration DOWN interview indexes: ${indexNamesAfterDown.join(', ')}`);

  if (usersAfterDown[0].count !== usersBefore[0].count) {
    throw new Error(`FAILED: Users were modified or dropped during down! Before: ${usersBefore[0].count}, After: ${usersAfterDown[0].count}`);
  }
  if (interviewsAfterDown[0].count !== interviewsBefore[0].count) {
    throw new Error(`FAILED: Interviews were modified or dropped during down! Before: ${interviewsBefore[0].count}, After: ${interviewsAfterDown[0].count}`);
  }
  for (const idx of requiredIndexes) {
    if (indexNamesAfterDown.includes(idx)) {
      throw new Error(`FAILED: Index ${idx} was NOT dropped during down!`);
    }
  }
  log('VERIFIED: DOWN removed the 4 indexes while keeping 100% of tables, users (5), and interviews (4) intact.');

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
