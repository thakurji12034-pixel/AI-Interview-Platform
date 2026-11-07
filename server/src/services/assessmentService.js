const { Assessment, AssessmentQuestion, Question, TestCase, QuestionTopic, User, InterviewTemplate } = require('../models');
const questionService = require('./questionService');
const templateService = require('./templateService');
const AppError = require('../utils/AppError');
const sequelize = require('../config/db');

class AssessmentService {
  async listAssessments(user) {
    const where = {};
    if (user.role === 'candidate') {
      where.candidateId = user.id;
    }

    return Assessment.findAll({
      where,
      include: [
        { model: User, as: 'candidate', attributes: ['id', 'name', 'email'] },
        { model: InterviewTemplate, as: 'template', attributes: ['id', 'title', 'domain', 'durationMinutes'] },
        {
          model: AssessmentQuestion,
          as: 'assessmentQuestions',
          include: [
            {
              model: Question,
              as: 'question',
              include: [
                { model: QuestionTopic, as: 'topics', attributes: ['id', 'topic'] },
                { model: TestCase, as: 'testCases' },
              ],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async getAssessmentById(id, user, transaction = null) {
    const assessment = await Assessment.findByPk(id, {
      include: [
        { model: User, as: 'candidate', attributes: ['id', 'name', 'email'] },
        { model: InterviewTemplate, as: 'template', attributes: ['id', 'title', 'domain', 'durationMinutes'] },
        {
          model: AssessmentQuestion,
          as: 'assessmentQuestions',
          include: [
            {
              model: Question,
              as: 'question',
              include: [
                { model: QuestionTopic, as: 'topics', attributes: ['id', 'topic'] },
                { model: TestCase, as: 'testCases' },
              ],
            },
          ],
        },
      ],
      ...(transaction && { transaction }),
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404, 'ASSESSMENT_NOT_FOUND');
    }

    // Role-based authorization guard: Candidate can only access their own assessment
    if (user.role === 'candidate' && assessment.candidateId !== user.id) {
      throw new AppError('Assessment not found', 404, 'ASSESSMENT_NOT_FOUND'); // 404 prevents IDOR enumeration
    }

    return assessment;
  }

  async createAssessment(data, authorId) {
    const candidate = await User.findByPk(data.candidateId);
    if (!candidate || candidate.role !== 'candidate') {
      throw new AppError('Candidate not found', 404, 'CANDIDATE_NOT_FOUND');
    }

    let selectedQuestions = [];

    if (Array.isArray(data.questionIds) && data.questionIds.length > 0) {
      for (const qId of data.questionIds) {
        const q = await questionService.getQuestionById(qId);
        selectedQuestions.push(q);
      }
    } else if (data.templateId) {
      const template = await templateService.getTemplateById(data.templateId);
      // Generate randomized questions from template sections
      if (Array.isArray(template.sections)) {
        for (const sec of template.sections) {
          const picked = await questionService.selectRandomQuestions({
            domain: sec.domain || template.domain,
            difficulty: sec.difficulty,
            count: sec.count || 2,
            candidateId: data.candidateId,
          });
          selectedQuestions.push(...picked);
        }
      }
    } else {
      // Default: select 3 random questions across domains
      selectedQuestions = await questionService.selectRandomQuestions({
        domain: data.domain,
        difficulty: data.difficulty,
        count: 3,
        candidateId: data.candidateId,
      });
    }

    return sequelize.transaction(async (t) => {
      const assessment = await Assessment.create(
        {
          candidateId: data.candidateId,
          templateId: data.templateId || null,
          title: data.title || 'Technical Assessment',
          scheduledAt: data.scheduledAt || null,
          status: 'pending',
          createdBy: authorId,
        },
        { transaction: t }
      );

      for (let i = 0; i < selectedQuestions.length; i++) {
        await AssessmentQuestion.create(
          {
            assessmentId: assessment.id,
            questionId: selectedQuestions[i].id,
            orderIndex: i + 1,
            status: 'unanswered',
          },
          { transaction: t }
        );
      }

      return this.getAssessmentById(assessment.id, { role: 'admin' }, t);
    });
  }

  async submitAnswer(assessmentId, questionId, candidateCode, user) {
    const assessment = await this.getAssessmentById(assessmentId, user);

    const aq = await AssessmentQuestion.findOne({
      where: { assessmentId: assessment.id, questionId },
    });

    if (!aq) {
      throw new AppError('Question not part of this assessment', 404, 'QUESTION_NOT_IN_ASSESSMENT');
    }

    await aq.update({
      candidateCode,
      status: 'submitted',
    });

    if (assessment.status === 'pending') {
      await assessment.update({ status: 'in_progress', startedAt: new Date() });
    }

    return aq;
  }
}

module.exports = new AssessmentService();
