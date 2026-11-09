const express = require('express');
const evaluationController = require('../controllers/evaluationController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.post('/answers/:answerId', (req, res, next) => evaluationController.evaluateAnswer(req, res, next));
router.get('/:id', (req, res, next) => evaluationController.getEvaluation(req, res, next));
router.post('/:id/override', (req, res, next) => evaluationController.addOverride(req, res, next));

module.exports = router;
