const Joi = require('joi');
const config = require('../config/env');

const allowedRoles =
  config.allowDevInterviewerRegistration && config.env !== 'production'
    ? ['candidate', 'interviewer']
    : ['candidate'];

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(10).max(64).required(),
  role: Joi.string().valid(...allowedRoles).default('candidate'),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
