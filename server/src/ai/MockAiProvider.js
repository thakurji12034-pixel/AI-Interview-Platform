const AiProvider = require('./AiProvider');

class MockAiProvider extends AiProvider {
  constructor(options = {}) {
    super();
    this.modelName = options.modelName || 'mock-gemini-2.5-flash';
  }

  getProviderName() {
    return 'mock';
  }

  async generateStructuredJson({ prompt, purpose, promptVersion: _promptVersion, userId: _userId }) {
    // 1. Simulate network/processing latency
    await new Promise((resolve) => setTimeout(resolve, 30));

    // 2. Behavioral Question Generation
    if (purpose === 'behavioral_question_generation' || prompt.includes('behavioral interview questions')) {
      return {
        questions: [
          {
            prompt: 'Describe a situation where you had to resolve a high-stakes disagreement with a senior engineer regarding architectural trade-offs.',
            domain: 'Behavioral',
            difficulty: 'intermediate',
            type: 'behavioral',
            expectedKeyPoints: [
              'Context of the architectural trade-off',
              'Collaborative communication and objective evaluation',
              'Outcome, lessons learned, and team alignment',
            ],
          },
          {
            prompt: 'Tell me about a time a production incident was caused by your code. How did you respond under pressure?',
            domain: 'Behavioral',
            difficulty: 'intermediate',
            type: 'behavioral',
            expectedKeyPoints: [
              'Incident triage and root cause isolation',
              'Blameless post-mortem and mitigation',
              'Actionable prevention mechanisms implemented',
            ],
          },
        ],
      };
    }

    // 3. Technical Question Generation
    if (purpose === 'technical_question_generation' || prompt.includes('Domain:')) {
      const isDSA = prompt.includes('Domain: DSA');
      return {
        questions: [
          {
            prompt: isDSA
              ? 'Given a binary tree, implement an algorithm to find the maximum path sum between any two nodes.'
              : 'Explain the internal architecture of Node.js event loop phases and how microtasks are scheduled.',
            domain: isDSA ? 'DSA' : 'Backend',
            difficulty: 'intermediate',
            type: isDSA ? 'coding' : 'theory',
            expectedKeyPoints: [
              'Accurate time and space complexity analysis',
              'Handling edge cases like negative values or empty trees',
              'Clear explanation of core underlying mechanisms',
            ],
          },
        ],
      };
    }

    // 4. Follow-up Question Generation
    if (purpose === 'follow_up_generation' || prompt.includes('UNTRUSTED_CANDIDATE_ANSWER')) {
      // Prompt injection defense: verify untrusted input doesn't override output
      return {
        followUp: {
          prompt: 'How would your proposed solution scale if the dataset exceeded available RAM by 100x?',
          difficulty: 'advanced',
          type: 'theory',
          expectedKeyPoints: [
            'External merge sort or distributed stream processing',
            'I/O disk bottlenecks and chunking strategies',
          ],
        },
      };
    }

    // 5. Session Summary
    if (purpose === 'session_summary' || prompt.includes('UNTRUSTED_SESSION_TRANSCRIPT')) {
      return {
        summary: 'The candidate demonstrated solid fundamental knowledge of backend systems and algorithmic complexity. Communication was structured and concise.',
        score: 84.5,
        strengths: [
          'Strong command of asynchronous concurrency patterns',
          'Methodical approach to edge case identification',
        ],
        areasForImprovement: [
          'Could elaborate further on distributed failure modes',
          'Explore memory optimization strategies in high-throughput pipelines',
        ],
        recommendedTopics: [
          'Distributed consensus algorithms',
          'Database indexing internals',
        ],
      };
    }

    // 6. Resume Extraction
    if (purpose === 'resume_parsing' || prompt.includes('UNTRUSTED_RESUME_TEXT')) {
      return {
        personal: {
          name: 'Jane Candidate',
          email: 'jane@example.com',
          phone: '+1 555-0199',
          location: 'San Francisco, CA',
        },
        skills: [
          { name: 'JavaScript', category: 'Frontend', proficiency: 'expert' },
          { name: 'Node.js', category: 'Backend', proficiency: 'expert' },
          { name: 'React', category: 'Frontend', proficiency: 'intermediate' },
          { name: 'PostgreSQL', category: 'Database', proficiency: 'intermediate' },
          { name: 'Docker', category: 'DevOps', proficiency: 'intermediate' },
        ],
        experience: [
          {
            company: 'Acme Cloud Technologies',
            role: 'Software Engineer',
            startDate: '2022-01',
            endDate: 'Present',
            highlights: ['Designed high-throughput streaming microservices serving 50M daily events.'],
          },
        ],
        education: [
          {
            institution: 'University of Engineering',
            degree: 'B.S. in Computer Science',
            year: '2021',
          },
        ],
        projects: [
          {
            title: 'Real-Time Distributed Queue',
            description: 'Built a lightweight in-memory persistent queue using Redis and WebSocket feeds.',
            technologies: ['Node.js', 'Redis', 'Socket.io'],
          },
        ],
      };
    }

    // Default fallback structured response
    return {
      status: 'ok',
      message: 'Generated fallback response',
    };
  }
}

module.exports = MockAiProvider;
