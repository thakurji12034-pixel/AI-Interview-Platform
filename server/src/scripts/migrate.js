const { migrator } = require('../config/migrator');
const sequelize = require('../config/db');

const action = process.argv[2] || 'up';

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Database connected (${sequelize.config.database} on ${sequelize.config.host})`);

    if (action === 'up') {
      console.log('Applying pending migrations...');
      const migrations = await migrator.up();
      if (migrations.length === 0) {
        console.log('No pending migrations to apply.');
      } else {
        console.log(`Successfully executed ${migrations.length} migration(s):`);
        migrations.forEach((m) => console.log(` - ${m.name}`));
      }
    } else if (action === 'down' || action === 'undo') {
      console.log('Reverting last migration...');
      const migrations = await migrator.down();
      if (migrations.length === 0) {
        console.log('No executed migrations to revert.');
      } else {
        console.log(`Successfully reverted ${migrations.length} migration(s):`);
        migrations.forEach((m) => console.log(` - ${m.name}`));
      }
    } else if (action === 'status') {
      const executed = await migrator.executed();
      const pending = await migrator.pending();
      console.log('Executed migrations:', executed.map((m) => m.name));
      console.log('Pending migrations:', pending.map((m) => m.name));
    } else {
      console.error(`Unknown action: "${action}". Valid actions: up, down, status`);
      process.exit(1);
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    try {
      await sequelize.close();
    } catch (_) {}
    process.exit(1);
  }
};

run();
