require('dotenv').config();

const REQUIRED_ENV_VARS = [
  'DB_NAME',
  'DB_USER',
  'DB_PASS',
  'DB_HOST',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingEnvVars = REQUIRED_ENV_VARS.filter(
  (key) => process.env[key] === undefined
);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variable(s): ${missingEnvVars.join(', ')}`
  );
  process.exit(1);
}

const http = require('http');
const app = require('./app');
const sequelize = require('./config/db');
const { initSockets } = require('./sockets');

const server = http.createServer(app);
initSockets(server);
const PORT = process.env.PORT || 5000;

const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 3000;

async function connectWithRetry() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      console.log('MySQL connected');
      return;
    } catch (err) {
      console.warn(
        `Database connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`
      );
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Failed to connect to MySQL after ${MAX_RETRIES} attempts: ${err.message}`
        );
      }
      console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

async function start() {
  try {
    await connectWithRetry();
    await sequelize.sync();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

let isShuttingDown = false;
async function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Received ${signal}. Shutting down gracefully...`);

  const closeDb = async () => {
    try {
      await sequelize.close();
      console.log('Database connection closed');
      process.exit(0);
    } catch (dbErr) {
      console.error('Error closing database connection:', dbErr);
      process.exit(1);
    }
  };

  if (server.listening) {
    server.close((err) => {
      if (err) {
        console.error('Error closing HTTP server:', err);
        process.exit(1);
      }
      console.log('HTTP server closed');
      closeDb();
    });
  } else {
    closeDb();
  }

  setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

start();
