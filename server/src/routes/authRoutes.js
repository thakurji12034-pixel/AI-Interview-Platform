const router = require('express').Router();
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { authLimiter, generalLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../validators/authValidator');
const {
  register,
  login,
  refresh,
  logout,
  me,
} = require('../controllers/authController');

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', generalLimiter, refresh);
router.post('/logout', logout);
router.get('/me', generalLimiter, auth, me);

module.exports = router;
