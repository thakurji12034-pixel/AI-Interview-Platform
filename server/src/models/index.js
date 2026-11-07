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
const Submission = require('./Submission');
const AiUsage = require('./AiUsage');
const InterviewSession = require('./InterviewSession');
const SessionQuestion = require('./SessionQuestion');
const Answer = require('./Answer');
const Resume = require('./Resume');
const CandidateSkill = require('./CandidateSkill');
const Evaluation = require('./Evaluation');
const EvaluationOverride = require('./EvaluationOverride');
const InterviewReport = require('./InterviewReport');

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

// Phase 5: Code execution submissions associations
User.hasMany(Submission, { as: 'submissions', foreignKey: 'userId', onDelete: 'CASCADE' });
Submission.belongsTo(User, { as: 'user', foreignKey: 'userId' });

Question.hasMany(Submission, { as: 'submissions', foreignKey: 'questionId', onDelete: 'CASCADE' });
Submission.belongsTo(Question, { as: 'question', foreignKey: 'questionId' });

Assessment.hasMany(Submission, { as: 'submissions', foreignKey: 'assessmentId', onDelete: 'SET NULL' });
Submission.belongsTo(Assessment, { as: 'assessment', foreignKey: 'assessmentId' });

// Phase 6: AI Engine & Resume Intelligence associations
User.hasMany(InterviewSession, { foreignKey: 'userId', as: 'sessions', onDelete: 'CASCADE' });
InterviewSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });
InterviewSession.belongsTo(User, { foreignKey: 'interviewerId', as: 'interviewer' });

InterviewSession.hasMany(SessionQuestion, { foreignKey: 'sessionId', as: 'questions', onDelete: 'CASCADE' });
SessionQuestion.belongsTo(InterviewSession, { foreignKey: 'sessionId', as: 'session' });
SessionQuestion.belongsTo(Question, { foreignKey: 'questionId', as: 'baseQuestion' });

SessionQuestion.hasMany(Answer, { foreignKey: 'sessionQuestionId', as: 'answers', onDelete: 'CASCADE' });
Answer.belongsTo(SessionQuestion, { foreignKey: 'sessionQuestionId', as: 'question' });
Answer.belongsTo(InterviewSession, { foreignKey: 'sessionId', as: 'session' });
Answer.belongsTo(User, { foreignKey: 'candidateId', as: 'candidate' });

User.hasMany(Resume, { foreignKey: 'userId', as: 'resumes', onDelete: 'CASCADE' });
Resume.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(CandidateSkill, { foreignKey: 'userId', as: 'skills', onDelete: 'CASCADE' });
CandidateSkill.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(AiUsage, { foreignKey: 'userId', as: 'aiUsages', onDelete: 'SET NULL' });
AiUsage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Phase 7: AI Evaluations & Reports associations
InterviewSession.hasMany(Evaluation, { foreignKey: 'sessionId', as: 'evaluations', onDelete: 'CASCADE' });
Evaluation.belongsTo(InterviewSession, { foreignKey: 'sessionId', as: 'session' });

Answer.hasOne(Evaluation, { foreignKey: 'answerId', as: 'evaluation', onDelete: 'CASCADE' });
Evaluation.belongsTo(Answer, { foreignKey: 'answerId', as: 'answer' });

Evaluation.hasMany(EvaluationOverride, { foreignKey: 'evaluationId', as: 'overrides', onDelete: 'CASCADE' });
EvaluationOverride.belongsTo(Evaluation, { foreignKey: 'evaluationId', as: 'evaluation' });
EvaluationOverride.belongsTo(User, { foreignKey: 'interviewerId', as: 'interviewer' });

InterviewSession.hasOne(InterviewReport, { foreignKey: 'sessionId', as: 'report', onDelete: 'CASCADE' });
InterviewReport.belongsTo(InterviewSession, { foreignKey: 'sessionId', as: 'session' });

User.hasMany(InterviewReport, { foreignKey: 'candidateId', as: 'reports', onDelete: 'CASCADE' });
InterviewReport.belongsTo(User, { foreignKey: 'candidateId', as: 'candidate' });

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
  Submission,
  AiUsage,
  InterviewSession,
  SessionQuestion,
  Answer,
  Resume,
  CandidateSkill,
  Evaluation,
  EvaluationOverride,
  InterviewReport,
};
