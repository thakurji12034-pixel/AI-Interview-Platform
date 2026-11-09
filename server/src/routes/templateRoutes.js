const express = require('express');
const templateService = require('../services/templateService');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const templates = await templateService.listTemplates();
    return res.json({ templates });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const template = await templateService.getTemplateById(req.params.id);
    return res.json({ template });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('interviewer', 'admin'), async (req, res, next) => {
  try {
    const template = await templateService.createTemplate(req.body, req.user.id);
    return res.status(201).json({ template });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize('interviewer', 'admin'), async (req, res, next) => {
  try {
    const result = await templateService.deleteTemplate(req.params.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
