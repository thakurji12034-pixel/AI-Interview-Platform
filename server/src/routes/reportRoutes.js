const express = require('express');
const evaluationController = require('../controllers/evaluationController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', (req, res, next) => evaluationController.listReports(req, res, next));
router.post('/sessions/:sessionId', (req, res, next) => evaluationController.generateReport(req, res, next));
router.get('/sessions/:sessionId', (req, res, next) => evaluationController.getReport(req, res, next));

module.exports = router;
