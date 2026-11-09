const { DataTypes } = require('sequelize');

module.exports = {
  name: '006_evaluations_and_reports',

  async up({ context: sequelize }) {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    const hasTable = (name) => tables.includes(name) || tables.includes(name.toLowerCase());

    // 1. evaluations table
    if (!hasTable('evaluations')) {
      await queryInterface.createTable('evaluations', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        sessionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'interview_sessions', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        answerId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'answers', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        technicalCorrectness: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        relevance: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        explanationQuality: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        problemSolving: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        communicationClarity: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        overallScore: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        dimensionWeights: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        strengths: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        weaknesses: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        feedback: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        generatedBy: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: 'ai',
        },
        model: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        promptVersion: {
          type: DataTypes.STRING(32),
          allowNull: false,
        },
        disclaimer: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('pending', 'evaluating', 'completed', 'failed'),
          allowNull: false,
          defaultValue: 'pending',
        },
        error: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('evaluations', ['sessionId'], { name: 'evaluations_session_id_idx' });
      await queryInterface.addIndex('evaluations', ['answerId'], { name: 'evaluations_answer_id_idx' });
      await queryInterface.addIndex('evaluations', ['status'], { name: 'evaluations_status_idx' });
    }

    // 2. evaluation_overrides table
    if (!hasTable('evaluation_overrides')) {
      await queryInterface.createTable('evaluation_overrides', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        evaluationId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'evaluations', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        interviewerId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        overrideScore: {
          type: DataTypes.FLOAT,
          allowNull: false,
        },
        humanNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('evaluation_overrides', ['evaluationId'], { name: 'eval_overrides_eval_id_idx' });
      await queryInterface.addIndex('evaluation_overrides', ['interviewerId'], { name: 'eval_overrides_interviewer_id_idx' });
    }

    // 3. interview_reports table
    if (!hasTable('interview_reports')) {
      await queryInterface.createTable('interview_reports', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        sessionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'interview_sessions', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        candidateId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        aiEvaluationScore: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        codeExecutionSummary: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        verifiedTimings: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        humanOverride: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        overallRecommendations: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        pdfReportPath: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        disclaimer: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('interview_reports', ['sessionId'], { name: 'reports_session_id_idx', unique: true });
      await queryInterface.addIndex('interview_reports', ['candidateId'], { name: 'reports_candidate_id_idx' });
    }
  },

  async down({ context: sequelize }) {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    const hasTable = (name) => tables.includes(name) || tables.includes(name.toLowerCase());

    if (hasTable('interview_reports')) {
      await queryInterface.dropTable('interview_reports');
    }
    if (hasTable('evaluation_overrides')) {
      await queryInterface.dropTable('evaluation_overrides');
    }
    if (hasTable('evaluations')) {
      await queryInterface.dropTable('evaluations');
    }
  },
};
