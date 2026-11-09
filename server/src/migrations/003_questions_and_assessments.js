const { DataTypes } = require('sequelize');

const DOMAINS = [
  'DSA',
  'Java',
  'OOP',
  'DBMS',
  'Operating Systems',
  'Computer Networks',
  'SQL',
  'JavaScript',
  'React',
  'System Design',
];

module.exports = {
  name: '003_questions_and_assessments',

  up: async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();
    const existingTables = await queryInterface.showAllTables();

    // 1. Create questions table
    if (!existingTables.includes('questions')) {
      await queryInterface.createTable('questions', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        statement: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        domain: {
          type: DataTypes.ENUM(...DOMAINS),
          allowNull: false,
        },
        difficulty: {
          type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
          allowNull: false,
          defaultValue: 'intermediate',
        },
        type: {
          type: DataTypes.ENUM('coding', 'mcq', 'theory', 'system_design'),
          allowNull: false,
          defaultValue: 'coding',
        },
        starterCode: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        referenceKeyPoints: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('draft', 'published', 'archived'),
          allowNull: false,
          defaultValue: 'published',
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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

      await queryInterface.addIndex('questions', ['domain', 'status'], {
        name: 'idx_questions_domain_status',
      });
      await queryInterface.addIndex('questions', ['difficulty'], {
        name: 'idx_questions_difficulty',
      });
      await queryInterface.addIndex('questions', ['type'], {
        name: 'idx_questions_type',
      });
      await queryInterface.addIndex('questions', ['createdBy'], {
        name: 'idx_questions_createdBy',
      });
    }

    // 2. Create question_topics table
    if (!existingTables.includes('question_topics')) {
      await queryInterface.createTable('question_topics', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        questionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'questions',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        topic: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('question_topics', ['questionId'], {
        name: 'idx_question_topics_questionId',
      });
      await queryInterface.addIndex('question_topics', ['topic'], {
        name: 'idx_question_topics_topic',
      });
    }

    // 3. Create test_cases table
    if (!existingTables.includes('test_cases')) {
      await queryInterface.createTable('test_cases', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        questionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'questions',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        input: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        expectedOutput: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        isHidden: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        weight: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        timeLimitMs: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        memoryLimitKb: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('test_cases', ['questionId', 'isHidden'], {
        name: 'idx_test_cases_question_hidden',
      });
    }

    // 4. Create interview_templates table
    if (!existingTables.includes('interview_templates')) {
      await queryInterface.createTable('interview_templates', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        domain: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        durationMinutes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 60,
        },
        sections: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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
    }

    // 5. Create assessments table
    if (!existingTables.includes('assessments')) {
      await queryInterface.createTable('assessments', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        candidateId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        templateId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'interview_templates',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'expired'),
          allowNull: false,
          defaultValue: 'pending',
        },
        scheduledAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        startedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        completedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        score: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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

      await queryInterface.addIndex('assessments', ['candidateId'], {
        name: 'idx_assessments_candidate',
      });
      await queryInterface.addIndex('assessments', ['status'], {
        name: 'idx_assessments_status',
      });
    }

    // 6. Create assessment_questions table
    if (!existingTables.includes('assessment_questions')) {
      await queryInterface.createTable('assessment_questions', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        assessmentId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'assessments',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        questionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'questions',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        orderIndex: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        candidateCode: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('unanswered', 'submitted', 'evaluated'),
          allowNull: false,
          defaultValue: 'unanswered',
        },
        score: {
          type: DataTypes.FLOAT,
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

      await queryInterface.addIndex('assessment_questions', ['assessmentId', 'questionId'], {
        unique: true,
        name: 'idx_assessment_questions_unique',
      });
    }
  },

  down: async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();
    const existingTables = await queryInterface.showAllTables();

    if (existingTables.includes('assessment_questions')) {
      await queryInterface.dropTable('assessment_questions');
    }
    if (existingTables.includes('assessments')) {
      await queryInterface.dropTable('assessments');
    }
    if (existingTables.includes('interview_templates')) {
      await queryInterface.dropTable('interview_templates');
    }
    if (existingTables.includes('test_cases')) {
      await queryInterface.dropTable('test_cases');
    }
    if (existingTables.includes('question_topics')) {
      await queryInterface.dropTable('question_topics');
    }
    if (existingTables.includes('questions')) {
      await queryInterface.dropTable('questions');
    }
  },
};
