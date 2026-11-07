const router = require('express').Router();
const auth = require('../middleware/auth');
const { createSubmission, getSubmission } = require('../controllers/submissionController');

router.use(auth);

router.post('/', createSubmission);
router.get('/:id', getSubmission);

module.exports = router;
