/**
 * Strict DTO Serializer & Candidate Anti-Leak Guard for Question Bank & Assessments.
 * Guarantees that hidden test cases and reference answers/key points never leak to candidates.
 */

function serializeTestCase(tc, role) {
  const plain = typeof tc.toJSON === 'function' ? tc.toJSON() : { ...tc };
  if (role === 'candidate') {
    if (plain.isHidden) return null; // Never leak hidden test cases
    // For public test cases, return input and expectedOutput
    return {
      id: plain.id,
      input: plain.input,
      expectedOutput: plain.expectedOutput,
      weight: plain.weight,
    };
  }

  // Interviewers and Admins see full test case details including hidden flag
  return {
    id: plain.id,
    questionId: plain.questionId,
    input: plain.input,
    expectedOutput: plain.expectedOutput,
    isHidden: Boolean(plain.isHidden),
    weight: plain.weight,
    timeLimitMs: plain.timeLimitMs,
    memoryLimitKb: plain.memoryLimitKb,
  };
}

function serializeQuestion(question, role = 'candidate') {
  if (!question) return null;
  const plain = typeof question.toJSON === 'function' ? question.toJSON() : { ...question };

  const isPrivileged = role === 'interviewer' || role === 'admin';

  // Format topics
  const topics = Array.isArray(plain.topics)
    ? plain.topics.map((t) => (typeof t === 'string' ? t : t.topic))
    : [];

  // Filter test cases according to role
  const rawTestCases = Array.isArray(plain.testCases) ? plain.testCases : [];
  const testCases = rawTestCases
    .map((tc) => serializeTestCase(tc, role))
    .filter(Boolean);

  const serialized = {
    id: plain.id,
    title: plain.title,
    statement: plain.statement,
    domain: plain.domain,
    difficulty: plain.difficulty,
    type: plain.type,
    starterCode: plain.starterCode,
    status: plain.status,
    topics,
    testCases,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };

  if (isPrivileged) {
    serialized.referenceKeyPoints = plain.referenceKeyPoints || null;
    serialized.createdBy = plain.createdBy;
    if (plain.author) {
      serialized.author = {
        id: plain.author.id,
        name: plain.author.name,
        email: plain.author.email,
        role: plain.author.role,
      };
    }
  }

  return serialized;
}

function serializeQuestions(questions, role = 'candidate') {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => serializeQuestion(q, role));
}

function serializeAssessment(assessment, role = 'candidate') {
  if (!assessment) return null;
  const plain = typeof assessment.toJSON === 'function' ? assessment.toJSON() : { ...assessment };

  const serialized = {
    id: plain.id,
    candidateId: plain.candidateId,
    templateId: plain.templateId,
    title: plain.title,
    status: plain.status,
    scheduledAt: plain.scheduledAt,
    startedAt: plain.startedAt,
    completedAt: plain.completedAt,
    score: plain.score,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };

  if (Array.isArray(plain.assessmentQuestions)) {
    serialized.questions = plain.assessmentQuestions.map((aq) => {
      const qPlain = aq.question ? serializeQuestion(aq.question, role) : null;
      return {
        id: aq.id,
        questionId: aq.questionId,
        orderIndex: aq.orderIndex,
        candidateCode: aq.candidateCode,
        status: aq.status,
        score: aq.score,
        question: qPlain,
      };
    });
  }

  return serialized;
}

/**
 * Audit scanner: Scans an object or JSON payload for any candidate data leakage.
 * Returns an array of detected leak violations (empty if clean).
 */
function scanPayloadForCandidateLeaks(payload) {
  const violations = [];
  const str = JSON.stringify(payload);

  if (str.includes('"referenceKeyPoints"')) {
    violations.push('Payload contains forbidden key "referenceKeyPoints"');
  }

  // Check for test cases flagged isHidden: true
  if (str.includes('"isHidden":true')) {
    violations.push('Payload contains hidden test cases ("isHidden":true)');
  }

  return violations;
}

module.exports = {
  serializeTestCase,
  serializeQuestion,
  serializeQuestions,
  serializeAssessment,
  scanPayloadForCandidateLeaks,
};
