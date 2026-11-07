const { resumeService } = require('../services/resumeService');

class ResumeController {
  async upload(req, res, next) {
    try {
      const resume = await resumeService.uploadResume({
        userId: req.user.id,
        file: req.file,
      });

      return res.status(201).json({
        message: 'Resume uploaded successfully. Parsing job queued.',
        resume: {
          id: resume.id,
          originalFileName: resume.originalFileName,
          fileSize: resume.fileSize,
          status: resume.status,
          createdAt: resume.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const resume = await resumeService.getResumeById(req.params.id, req.user);
      return res.json({ resume });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await resumeService.deleteResume(req.params.id, req.user, req.ip);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async matchJob(req, res, next) {
    try {
      const result = await resumeService.matchJobDescription(req.user.id, req.body.jobDescription);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ResumeController();
