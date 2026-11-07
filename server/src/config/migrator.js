const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const defaultSequelize = require('./db');

/**
 * Creates an Umzug migration runner instance bound to the provided Sequelize instance.
 *
 * @param {import('sequelize').Sequelize} [sequelize]
 * @returns {Umzug}
 */
const createMigrator = (sequelize = defaultSequelize) => {
  return new Umzug({
    migrations: {
      glob: ['migrations/*.js', { cwd: path.resolve(__dirname, '..') }],
      resolve: ({ name, path: migrationPath, context }) => {
        const migration = require(migrationPath);
        return {
          name,
          up: async () => migration.up({ context }),
          down: async () => migration.down({ context }),
        };
      },
    },
    context: sequelize,
    storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
    logger: console,
  });
};

module.exports = {
  createMigrator,
  migrator: createMigrator(),
};
