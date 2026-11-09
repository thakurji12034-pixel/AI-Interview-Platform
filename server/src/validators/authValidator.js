const Joi = require('joi');
const config = require('../config/env');

const allowedPublicRoles =
  config.allowDevInterviewerRegistration && config.env !== 'production'
    ? ['candidate', 'interviewer']
    : ['candidate'];

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().lowercase().email({ tlds: false }).required(),
  password: Joi.string().min(10).max(64).required(),
  inviteToken: Joi.string().trim().hex().length(64).optional(),
  role: Joi.when('inviteToken', {
    is: Joi.exist(),
    then: Joi.string().valid('candidate', 'interviewer', 'admin').default('interviewer'),
    otherwise: Joi.string().valid(...allowedPublicRoles).default('candidate'),
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: false }).required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
