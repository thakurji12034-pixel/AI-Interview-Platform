const Joi = require('joi');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(5000),
  DB_HOST: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASS: Joi.string().allow('').default(''),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  CLIENT_URL: Joi.string().default('http://localhost:5173'),
  ALLOW_DEV_INTERVIEWER_REGISTRATION: Joi.boolean().default(false),
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_MOCK: Joi.boolean().default(false),
  REDIS_ENABLED: Joi.boolean().default(true),
  JUDGE0_ENDPOINT: Joi.string().default('http://localhost:2358'),
  JUDGE0_API_KEY: Joi.string().allow('').default(''),
  EXECUTION_PROVIDER: Joi.string().valid('mock', 'judge0').default('mock'),
  GEMINI_API_KEY: Joi.string().allow('').default(''),
  GEMINI_MODEL: Joi.string().default('gemini-2.5-flash'),
  AI_MOCK_MODE: Joi.boolean().default(true),
  COLLAB_ENGINE: Joi.string().valid('legacy', 'yjs').default('yjs'),
  ALLOW_MOCK_PROVIDERS: Joi.boolean().default(false),
  ALLOW_INMEMORY_REDIS: Joi.boolean().default(false),
})
  .unknown(true);

const { error, value: envVars } = envSchema.validate(process.env, {
  abortEarly: false,
});

if (error) {
  const missingOrInvalid = error.details.map((d) => d.message).join(', ');
  console.error(`[CONFIG ERROR] Invalid environment configuration: ${missingOrInvalid}`);
  process.exit(1);
}

// Ensure the dev registration override is never active in production
if (envVars.NODE_ENV === 'production' && envVars.ALLOW_DEV_INTERVIEWER_REGISTRATION) {
  console.error(
    '[SECURITY ERROR] ALLOW_DEV_INTERVIEWER_REGISTRATION must NOT be enabled in production environments.'
  );
  process.exit(1);
}

// In production, refuse to start with mock providers unless explicitly allowed
if (envVars.NODE_ENV === 'production' && !envVars.ALLOW_MOCK_PROVIDERS) {
  if (envVars.AI_MOCK_MODE || envVars.EXECUTION_PROVIDER === 'mock') {
    console.error(
      '[CONFIG ERROR] In production, AI_MOCK_MODE=true or EXECUTION_PROVIDER=mock is prohibited unless ALLOW_MOCK_PROVIDERS=true is set explicitly.'
    );
    process.exit(1);
  }
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  db: {
    host: envVars.DB_HOST,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    pass: envVars.DB_PASS,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    algorithm: 'HS256',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  clientUrl: envVars.CLIENT_URL,
  allowDevInterviewerRegistration: envVars.ALLOW_DEV_INTERVIEWER_REGISTRATION,
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD || undefined,
    mock: envVars.REDIS_MOCK,
    enabled: envVars.REDIS_ENABLED,
  },
  execution: {
    provider: envVars.EXECUTION_PROVIDER,
    judge0Endpoint: envVars.JUDGE0_ENDPOINT,
    judge0ApiKey: envVars.JUDGE0_API_KEY,
  },
  ai: {
    apiKey: envVars.GEMINI_API_KEY,
    model: envVars.GEMINI_MODEL,
    mockMode: envVars.AI_MOCK_MODE,
  },
  collab: {
    engine: envVars.COLLAB_ENGINE,
  },
  allowMockProviders: envVars.ALLOW_MOCK_PROVIDERS,
  allowInMemoryRedis: envVars.ALLOW_INMEMORY_REDIS,
};

