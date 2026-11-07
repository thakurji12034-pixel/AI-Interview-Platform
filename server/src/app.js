const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const { httpLogger } = require('./utils/logger');
const sequelize = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const questionRoutes = require('./routes/questionRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const errorHandler = require('./middleware/errorHandler');
const { isRedisHealthy } = require('./config/redis');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true, // Enables cookie transmission across origins when applicable
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(httpLogger);

// Health check endpoints
app.get('/health/live', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/health/ready', async (_req, res) => {
  const dbHealthy = await sequelize
    .authenticate()
    .then(() => true)
    .catch(() => false);
  const redisHealthy = await isRedisHealthy();

  const isReady = dbHealthy && redisHealthy;
  const status = isReady ? 'ready' : 'unhealthy';
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    status,
    checks: {
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: redisHealthy ? 'connected' : 'disconnected',
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Versioned API routes (/api/v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/assessments', assessmentRoutes);
app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/resumes', resumeRoutes);
app.use('/api/v1/sessions', sessionRoutes);

// Temporary backward compatibility aliases (/api/*)
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/sessions', sessionRoutes);

app.use(errorHandler);

module.exports = app;
