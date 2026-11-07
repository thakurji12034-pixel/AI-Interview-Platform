const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../validators/authValidator');
const {
  register,
  login,
  refresh,
  logout,
  me,
} = require('../controllers/authController');

const config = require('../config/env');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  statusCode: 429,
  skip: () => config.env === 'test',
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many attempts, please try again later',
    },
    message: 'Too many attempts, please try again later',
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  statusCode: 429,
  skip: () => config.env === 'test',
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many attempts, please try again later',
    },
    message: 'Too many attempts, please try again later',
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', generalLimiter, refresh);
router.post('/logout', logout);
router.get('/me', generalLimiter, auth, me);

module.exports = router;
