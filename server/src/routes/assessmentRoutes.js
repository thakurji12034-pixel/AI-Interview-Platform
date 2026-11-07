const router = require('express').Router();
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/permission');
const {
  listAssessments,
  getAssessment,
  createAssessment,
  submitAnswer,
} = require('../controllers/assessmentController');

router.use(auth);

router.get('/', listAssessments);
router.get('/:id', getAssessment);
router.post('/', requirePermission('assessments:write'), createAssessment);
router.post('/:id/submit', submitAnswer);

module.exports = router;
