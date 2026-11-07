const express = require('express');
const multer = require('multer');
const resumeController = require('../controllers/resumeController');
const auth = require('../middleware/auth');
const AppError = require('../utils/AppError');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.pdf') || file.mimetype !== 'application/pdf') {
      return cb(new AppError('Only PDF documents are allowed', 400, 'INVALID_FILE_TYPE'), false);
    }
    cb(null, true);
  },
});

router.use(auth);

router.post('/', upload.single('resume'), (req, res, next) => resumeController.upload(req, res, next));
router.get('/:id', (req, res, next) => resumeController.getById(req, res, next));
router.delete('/:id', (req, res, next) => resumeController.delete(req, res, next));
router.post('/match-job', (req, res, next) => resumeController.matchJob(req, res, next));

module.exports = router;
