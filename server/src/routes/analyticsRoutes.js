const router = require('express').Router();
const auth = require('../middleware/auth');
const { analyticsController } = require('../controllers/analyticsController');

// All analytics endpoints require authentication
router.use(auth);

router.get('/candidate', analyticsController.getCandidateAnalytics);
router.get('/interviewer', analyticsController.getInterviewerAnalytics);
router.get('/admin', analyticsController.getAdminAnalytics);

module.exports = router;

