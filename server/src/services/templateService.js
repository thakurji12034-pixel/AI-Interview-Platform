const { InterviewTemplate, User } = require('../models');
const AppError = require('../utils/AppError');

class TemplateService {
  async listTemplates() {
    return InterviewTemplate.findAll({
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
  }

  async getTemplateById(id) {
    const template = await InterviewTemplate.findByPk(id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }],
    });
    if (!template) {
      throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');
    }
    return template;
  }

  async createTemplate(data, authorId) {
    return InterviewTemplate.create({
      title: data.title,
      description: data.description || null,
      domain: data.domain || null,
      durationMinutes: data.durationMinutes || 60,
      sections: data.sections || [],
      createdBy: authorId,
    });
  }

  async deleteTemplate(id) {
    const template = await this.getTemplateById(id);
    await template.destroy();
    return { success: true };
  }
}

module.exports = new TemplateService();
