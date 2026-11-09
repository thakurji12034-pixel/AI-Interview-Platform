const { Op } = require('sequelize');
const { Question, QuestionTopic, TestCase, User, Assessment, AssessmentQuestion } = require('../models');
const AppError = require('../utils/AppError');
const sequelize = require('../config/db');

const SORTABLE_FIELDS = ['id', 'title', 'domain', 'difficulty', 'createdAt', 'updatedAt'];

class QuestionService {
  async listQuestions(options = {}, role = 'interviewer') {
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = {};

    // Candidates can only see published questions
    if (role === 'candidate') {
      where.status = 'published';
    } else if (options.status) {
      where.status = options.status;
    }

    if (options.domain) {
      where.domain = options.domain;
    }

    if (options.difficulty) {
      where.difficulty = options.difficulty;
    }

    if (options.type) {
      where.type = options.type;
    }

    if (options.search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${options.search}%` } },
        { statement: { [Op.like]: `%${options.search}%` } },
      ];
    }

    const sortBy = SORTABLE_FIELDS.includes(options.sortBy) ? options.sortBy : 'createdAt';
    const sortOrder = options.sortOrder && options.sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const include = [
      { model: QuestionTopic, as: 'topics', attributes: ['id', 'topic'] },
      { model: TestCase, as: 'testCases' },
    ];

    if (role !== 'candidate') {
      include.push({
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'role'],
      });
    }

    const { rows, count } = await Question.findAndCountAll({
      where,
      include,
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      distinct: true,
    });

    return {
      questions: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async getQuestionById(id, transaction = null) {
    const question = await Question.findByPk(id, {
      include: [
        { model: QuestionTopic, as: 'topics', attributes: ['id', 'topic'] },
        { model: TestCase, as: 'testCases' },
        { model: User, as: 'author', attributes: ['id', 'name', 'email', 'role'] },
      ],
      ...(transaction && { transaction }),
    });

    if (!question) {
      throw new AppError('Question not found', 404, 'QUESTION_NOT_FOUND');
    }

    return question;
  }

  async createQuestion(data, authorId) {
    return sequelize.transaction(async (t) => {
      const question = await Question.create(
        {
          title: data.title,
          statement: data.statement,
          domain: data.domain,
          difficulty: data.difficulty || 'intermediate',
          type: data.type || 'coding',
          starterCode: data.starterCode || null,
          referenceKeyPoints: data.referenceKeyPoints || null,
          status: data.status || 'published',
          createdBy: authorId,
        },
        { transaction: t }
      );

      if (Array.isArray(data.topics) && data.topics.length > 0) {
        for (const topic of data.topics) {
          await QuestionTopic.create(
            { questionId: question.id, topic: String(topic) },
            { transaction: t }
          );
        }
      }

      if (Array.isArray(data.testCases) && data.testCases.length > 0) {
        for (const tc of data.testCases) {
          await TestCase.create(
            {
              questionId: question.id,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: Boolean(tc.isHidden),
              weight: tc.weight || 1,
              timeLimitMs: tc.timeLimitMs || null,
              memoryLimitKb: tc.memoryLimitKb || null,
            },
            { transaction: t }
          );
        }
      }

      return this.getQuestionById(question.id, t);
    });
  }

  async updateQuestion(id, data) {
    const question = await this.getQuestionById(id);

    return sequelize.transaction(async (t) => {
      await question.update(
        {
          title: data.title !== undefined ? data.title : question.title,
          statement: data.statement !== undefined ? data.statement : question.statement,
          domain: data.domain !== undefined ? data.domain : question.domain,
          difficulty: data.difficulty !== undefined ? data.difficulty : question.difficulty,
          type: data.type !== undefined ? data.type : question.type,
          starterCode: data.starterCode !== undefined ? data.starterCode : question.starterCode,
          referenceKeyPoints:
            data.referenceKeyPoints !== undefined ? data.referenceKeyPoints : question.referenceKeyPoints,
          status: data.status !== undefined ? data.status : question.status,
        },
        { transaction: t }
      );

      if (Array.isArray(data.topics)) {
        await QuestionTopic.destroy({ where: { questionId: question.id }, transaction: t });
        for (const topic of data.topics) {
          await QuestionTopic.create(
            { questionId: question.id, topic: String(topic) },
            { transaction: t }
          );
        }
      }

      if (Array.isArray(data.testCases)) {
        await TestCase.destroy({ where: { questionId: question.id }, transaction: t });
        for (const tc of data.testCases) {
          await TestCase.create(
            {
              questionId: question.id,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: Boolean(tc.isHidden),
              weight: tc.weight || 1,
              timeLimitMs: tc.timeLimitMs || null,
              memoryLimitKb: tc.memoryLimitKb || null,
            },
            { transaction: t }
          );
        }
      }

      return this.getQuestionById(question.id, t);
    });
  }

  async deleteQuestion(id) {
    const question = await this.getQuestionById(id);
    // Soft-archive to preserve integrity of historical assessment submissions
    await question.update({ status: 'archived' });
    return { success: true, message: 'Question archived successfully' };
  }

  /**
   * Randomized question selector: avoids questions recently given to the same candidate
   */
  async selectRandomQuestions({ domain, difficulty, count = 3, candidateId = null }) {
    const where = { status: 'published' };

    if (domain) where.domain = domain;
    if (difficulty) where.difficulty = difficulty;

    if (candidateId) {
      // Find questions candidate has already encountered
      const previousAssessments = await Assessment.findAll({
        where: { candidateId },
        attributes: ['id'],
        include: [{ model: AssessmentQuestion, as: 'assessmentQuestions', attributes: ['questionId'] }],
      });

      const usedQuestionIds = [];
      for (const a of previousAssessments) {
        if (a.assessmentQuestions) {
          for (const aq of a.assessmentQuestions) {
            usedQuestionIds.push(aq.questionId);
          }
        }
      }

      if (usedQuestionIds.length > 0) {
        where.id = { [Op.notIn]: usedQuestionIds };
      }
    }

    let questions = await Question.findAll({
      where,
      include: [
        { model: QuestionTopic, as: 'topics', attributes: ['id', 'topic'] },
        { model: TestCase, as: 'testCases' },
      ],
      order: sequelize.random(),
      limit: count,
    });

    // Fallback if not enough unseen questions exist for this candidate
    if (questions.length < count && candidateId) {
      delete where.id;
      questions = await Question.findAll({
        where,
        include: [
          { model: QuestionTopic, as: 'topics', attributes: ['id', 'topic'] },
          { model: TestCase, as: 'testCases' },
        ],
        order: sequelize.random(),
        limit: count,
      });
    }

    return questions;
  }
}

module.exports = new QuestionService();
