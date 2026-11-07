const { execSync } = require('child_process');
const config = require('../config/env');

const targetFile = process.argv[2] || 'D:\\db_backups\\interview_platform_pre_phase_2.sql';
console.log(`Backing up database ${config.db.name} to ${targetFile}...`);

const passArg = config.db.pass ? `-p${config.db.pass}` : '';
execSync(`mysqldump -h ${config.db.host} -u ${config.db.user} ${passArg} ${config.db.name} > "${targetFile}"`, {
  stdio: 'inherit',
  shell: true,
});

console.log(`Backup completed successfully: ${targetFile}`);

