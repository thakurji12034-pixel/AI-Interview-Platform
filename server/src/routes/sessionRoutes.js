const express = require('express');
const sessionController = require('../controllers/sessionController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.post('/', (req, res, next) => sessionController.create(req, res, next));
router.post('/:id/start', (req, res, next) => sessionController.start(req, res, next));
router.get('/:id', (req, res, next) => sessionController.getById(req, res, next));
router.post('/:id/answers', (req, res, next) => sessionController.submitAnswer(req, res, next));
router.post('/:id/complete', (req, res, next) => sessionController.complete(req, res, next));

module.exports = router;
