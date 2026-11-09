const { DataTypes } = require('sequelize');

module.exports = {
  name: '005_ai_engine_and_resumes',

  async up({ context: sequelize }) {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();

    // Helper to check if a table exists
    const hasTable = (name) => tables.includes(name) || tables.includes(name.toLowerCase());

    // 1. ai_usage table
    if (!hasTable('ai_usage')) {
      await queryInterface.createTable('ai_usage', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        purpose: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        promptVersion: {
          type: DataTypes.STRING(32),
          allowNull: false,
        },
        model: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        inputTokens: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        outputTokens: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        latencyMs: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        status: {
          type: DataTypes.ENUM('success', 'failed', 'fallback'),
          allowNull: false,
          defaultValue: 'success',
        },
        errorMessage: {
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

      await queryInterface.addIndex('ai_usage', ['userId'], { name: 'ai_usage_user_id_idx' });
      await queryInterface.addIndex('ai_usage', ['purpose'], { name: 'ai_usage_purpose_idx' });
      await queryInterface.addIndex('ai_usage', ['createdAt'], { name: 'ai_usage_created_at_idx' });
    }

    // 2. interview_sessions table
    if (!hasTable('interview_sessions')) {
      await queryInterface.createTable('interview_sessions', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        interviewerId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        type: {
          type: DataTypes.ENUM('technical', 'hr', 'mixed'),
          allowNull: false,
          defaultValue: 'technical',
        },
        difficulty: {
          type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
          allowNull: false,
          defaultValue: 'intermediate',
        },
        status: {
          type: DataTypes.ENUM('configured', 'in_progress', 'completed', 'cancelled'),
          allowNull: false,
          defaultValue: 'configured',
        },
        mode: {
          type: DataTypes.ENUM('mock', 'live_assisted'),
          allowNull: false,
          defaultValue: 'mock',
        },
        startedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        endsAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        durationMinutes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 30,
        },
        summary: {
          type: DataTypes.TEXT,
          allowNull: true,
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

      await queryInterface.addIndex('interview_sessions', ['userId'], { name: 'sessions_user_id_idx' });
      await queryInterface.addIndex('interview_sessions', ['status'], { name: 'sessions_status_idx' });
      await queryInterface.addIndex('interview_sessions', ['startedAt'], { name: 'sessions_started_at_idx' });
    }

    // 3. session_questions table
    if (!hasTable('session_questions')) {
      await queryInterface.createTable('session_questions', {
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
        questionId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'questions', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        orderIndex: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        prompt: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        domain: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        difficulty: {
          type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
          allowNull: false,
          defaultValue: 'intermediate',
        },
        type: {
          type: DataTypes.ENUM('coding', 'mcq', 'theory', 'system_design', 'behavioral'),
          allowNull: false,
          defaultValue: 'theory',
        },
        expectedKeyPoints: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        parentQuestionId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'session_questions', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        followUpDepth: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        status: {
          type: DataTypes.ENUM('pending', 'answered', 'skipped'),
          allowNull: false,
          defaultValue: 'pending',
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

      await queryInterface.addIndex('session_questions', ['sessionId'], { name: 'sq_session_id_idx' });
      await queryInterface.addIndex('session_questions', ['orderIndex'], { name: 'sq_order_idx' });
    }

    // 4. answers table
    if (!hasTable('answers')) {
      await queryInterface.createTable('answers', {
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
        sessionQuestionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'session_questions', key: 'id' },
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
        answerText: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        codeSnippet: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        language: {
          type: DataTypes.STRING(32),
          allowNull: true,
        },
        submittedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        timeSpentSeconds: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
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

      await queryInterface.addIndex('answers', ['sessionId'], { name: 'answers_session_id_idx' });
      await queryInterface.addIndex('answers', ['sessionQuestionId'], { name: 'answers_sq_id_idx' });
      await queryInterface.addIndex('answers', ['candidateId'], { name: 'answers_candidate_id_idx' });
    }

    // 5. resumes table
    if (!hasTable('resumes')) {
      await queryInterface.createTable('resumes', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        originalFileName: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        storedFileName: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        fileSize: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        mimeType: {
          type: DataTypes.STRING(128),
          allowNull: false,
          defaultValue: 'application/pdf',
        },
        extractedText: {
          type: DataTypes.TEXT('long'),
          allowNull: true,
        },
        parsedData: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('uploaded', 'parsing', 'parsed', 'failed'),
          allowNull: false,
          defaultValue: 'uploaded',
        },
        parseError: {
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

      await queryInterface.addIndex('resumes', ['userId'], { name: 'resumes_user_id_idx' });
    }

    // 6. candidate_skills table
    if (!hasTable('candidate_skills')) {
      await queryInterface.createTable('candidate_skills', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        skillName: {
          type: DataTypes.STRING(128),
          allowNull: false,
        },
        category: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        proficiencyLevel: {
          type: DataTypes.ENUM('beginner', 'intermediate', 'expert'),
          allowNull: false,
          defaultValue: 'intermediate',
        },
        yearsOfExperience: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        source: {
          type: DataTypes.ENUM('resume', 'assessment', 'interview'),
          allowNull: false,
          defaultValue: 'resume',
        },
        verified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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

      await queryInterface.addIndex('candidate_skills', ['userId', 'skillName'], {
        name: 'cand_skills_user_skill_unique',
        unique: true,
      });
      await queryInterface.addIndex('candidate_skills', ['userId'], { name: 'cand_skills_user_id_idx' });
      await queryInterface.addIndex('candidate_skills', ['category'], { name: 'cand_skills_category_idx' });
    }
  },

  async down({ context: sequelize }) {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    const hasTable = (name) => tables.includes(name) || tables.includes(name.toLowerCase());

    if (hasTable('candidate_skills')) {
      await queryInterface.dropTable('candidate_skills');
    }
    if (hasTable('resumes')) {
      await queryInterface.dropTable('resumes');
    }
    if (hasTable('answers')) {
      await queryInterface.dropTable('answers');
    }
    if (hasTable('session_questions')) {
      await queryInterface.dropTable('session_questions');
    }
    if (hasTable('interview_sessions')) {
      await queryInterface.dropTable('interview_sessions');
    }
    if (hasTable('ai_usage')) {
      await queryInterface.dropTable('ai_usage');
    }
  },
};
