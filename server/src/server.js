const http = require('http');
const config = require('./config/env');
const { logger } = require('./utils/logger');
const app = require('./app');
const sequelize = require('./config/db');
const { initSockets } = require('./sockets');

const server = http.createServer(app);
initSockets(server);
const PORT = config.port;

const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 3000;

async function connectWithRetry() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info('MySQL database connection established successfully');
      return;
    } catch (err) {
      logger.warn(
        `Database connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`
      );
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Failed to connect to MySQL after ${MAX_RETRIES} attempts: ${err.message}`
        );
      }
      logger.info(`Retrying database connection in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

async function start() {
  try {
    await connectWithRetry();

    // Disable sequelize.sync() outside test mode; schema changes are handled via migrations
    if (config.env === 'test') {
      await sequelize.sync();
    }

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.env} mode`);
    });
  } catch (err) {
    logger.error(`Server startup failure: ${err.message}`);
    process.exit(1);
  }
}

let isShuttingDown = false;
async function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  const closeDb = async () => {
    try {
      await sequelize.close();
      logger.info('Database connection closed gracefully');
      process.exit(0);
    } catch (dbErr) {
      logger.error(`Error closing database connection: ${dbErr.message}`);
      process.exit(1);
    }
  };

  if (server.listening) {
    server.close((err) => {
      if (err) {
        logger.error(`Error closing HTTP server: ${err.message}`);
        process.exit(1);
      }
      logger.info('HTTP server closed');
      closeDb();
    });
  } else {
    closeDb();
  }

  // Force shutdown after 10s if graceful termination hangs
  setTimeout(() => {
    logger.error('Forced process termination due to shutdown timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

start();
