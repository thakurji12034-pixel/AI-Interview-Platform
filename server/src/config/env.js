const Joi = require('joi');
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
};

