const router = require('express').Router();
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/permission');
const {
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getRandomQuestions,
} = require('../controllers/questionController');

router.use(auth);

router.get('/', listQuestions);
router.get('/random', requirePermission('questions:read'), getRandomQuestions);
router.get('/:id', getQuestion);
router.post('/', requirePermission('questions:write'), createQuestion);
router.patch('/:id', requirePermission('questions:write'), updateQuestion);
router.put('/:id', requirePermission('questions:write'), updateQuestion);
router.delete('/:id', requirePermission('questions:write'), deleteQuestion);

module.exports = router;
