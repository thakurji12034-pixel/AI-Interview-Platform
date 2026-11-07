const PROMPT_VERSION = 'v1.0';

/**
 * Builds prompt for behavioral/HR questions with STAR methodology
 */
function buildBehavioralQuestionPrompt({ count = 3, targetRole = 'Software Engineer' }) {
  return {
    version: PROMPT_VERSION,
    purpose: 'behavioral_question_generation',
    prompt: `You are an executive HR and leadership interviewer.
Generate ${count} behavioral interview questions tailored for a ${targetRole} role using the STAR (Situation, Task, Action, Result) methodology.

Return ONLY a valid JSON object matching this exact schema:
{
  "questions": [
    {
      "prompt": "Behavioral question statement",
      "domain": "Behavioral",
      "difficulty": "intermediate",
      "type": "behavioral",
      "expectedKeyPoints": [
        "Clear articulation of situation/context",
        "Ownership of specific actions taken",
        "Measurable results and reflections"
      ]
    }
  ]
}`,
  };
}

module.exports = {
  PROMPT_VERSION,
  buildBehavioralQuestionPrompt,
};
