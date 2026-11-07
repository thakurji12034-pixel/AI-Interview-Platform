const User = require('./User');
const Interview = require('./Interview');
const Invitation = require('./Invitation');
const RefreshToken = require('./RefreshToken');
const AuditLog = require('./AuditLog');
const PlatformSetting = require('./PlatformSetting');
const Question = require('./Question');
const QuestionTopic = require('./QuestionTopic');
const TestCase = require('./TestCase');
const InterviewTemplate = require('./InterviewTemplate');
const Assessment = require('./Assessment');
const AssessmentQuestion = require('./AssessmentQuestion');

User.hasMany(Interview, { as: 'interviewsGiven', foreignKey: 'interviewerId' });
User.hasMany(Interview, { as: 'interviewsTaken', foreignKey: 'candidateId' });
Interview.belongsTo(User, { as: 'interviewer', foreignKey: 'interviewerId' });
Interview.belongsTo(User, { as: 'candidate', foreignKey: 'candidateId' });

User.hasMany(Invitation, { as: 'invitationsSent', foreignKey: 'invitedById' });
Invitation.belongsTo(User, { as: 'invitedBy', foreignKey: 'invitedById' });

User.hasMany(RefreshToken, { as: 'refreshTokens', foreignKey: 'userId', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { as: 'user', foreignKey: 'userId' });

User.hasMany(AuditLog, { as: 'auditLogs', foreignKey: 'actorId' });
AuditLog.belongsTo(User, { as: 'actor', foreignKey: 'actorId' });

PlatformSetting.belongsTo(User, { as: 'updatedBy', foreignKey: 'updatedById' });

// Phase 4: Question bank & Assessments associations
User.hasMany(Question, { as: 'authoredQuestions', foreignKey: 'createdBy' });
Question.belongsTo(User, { as: 'author', foreignKey: 'createdBy' });

Question.hasMany(QuestionTopic, { as: 'topics', foreignKey: 'questionId', onDelete: 'CASCADE' });
QuestionTopic.belongsTo(Question, { as: 'question', foreignKey: 'questionId' });

Question.hasMany(TestCase, { as: 'testCases', foreignKey: 'questionId', onDelete: 'CASCADE' });
TestCase.belongsTo(Question, { as: 'question', foreignKey: 'questionId' });

User.hasMany(InterviewTemplate, { as: 'templates', foreignKey: 'createdBy' });
InterviewTemplate.belongsTo(User, { as: 'author', foreignKey: 'createdBy' });

User.hasMany(Assessment, { as: 'assessments', foreignKey: 'candidateId' });
Assessment.belongsTo(User, { as: 'candidate', foreignKey: 'candidateId' });
Assessment.belongsTo(InterviewTemplate, { as: 'template', foreignKey: 'templateId' });

Assessment.hasMany(AssessmentQuestion, { as: 'assessmentQuestions', foreignKey: 'assessmentId', onDelete: 'CASCADE' });
AssessmentQuestion.belongsTo(Assessment, { as: 'assessment', foreignKey: 'assessmentId' });
AssessmentQuestion.belongsTo(Question, { as: 'question', foreignKey: 'questionId' });

module.exports = {
  User,
  Interview,
  Invitation,
  RefreshToken,
  AuditLog,
  PlatformSetting,
  Question,
  QuestionTopic,
  TestCase,
  InterviewTemplate,
  Assessment,
  AssessmentQuestion,
};
