const { Question, TestCase, QuestionTopic, User } = require('../models');
const sequelize = require('../config/db');

const STARTER_QUESTIONS = [
  {
    title: 'Two Sum Problem',
    domain: 'DSA',
    difficulty: 'beginner',
    type: 'coding',
    statement: `### Two Sum
Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.
You may assume that each input would have ***exactly one solution***, and you may not use the same element twice.

#### Example 1:
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`
`,
    starterCode: {
      javascript: 'function twoSum(nums, target) {\n  // Write your solution here\n}',
      python: 'def two_sum(nums, target):\n    # Write your solution here\n    pass',
      java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Solution\n    }\n}',
      cpp: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Solution\n    }\n};',
    },
    referenceKeyPoints: 'Optimal approach uses a hash map to achieve O(n) time complexity and O(n) space complexity.',
    topics: ['Arrays', 'Hash Table', 'Algorithms'],
    testCases: [
      { input: '[2,7,11,15], 9', expectedOutput: '[0,1]', isHidden: false, weight: 1 },
      { input: '[3,2,4], 6', expectedOutput: '[1,2]', isHidden: false, weight: 1 },
      { input: '[3,3], 6', expectedOutput: '[0,1]', isHidden: true, weight: 2 },
      { input: '[1,5,8,12,19], 27', expectedOutput: '[2,4]', isHidden: true, weight: 2 },
    ],
  },
  {
    title: 'Java Memory Model & Garbage Collection',
    domain: 'Java',
    difficulty: 'intermediate',
    type: 'theory',
    statement: `### Java Garbage Collection Mechanisms
Explain how JVM Generational Garbage Collection works, contrasting the Young Generation (Eden, Survivor spaces) with the Old (Tenured) Generation. Describe the conditions under which an object is promoted to the Tenured generation.`,
    starterCode: null,
    referenceKeyPoints: 'Eden space -> Survivor 0/1 copying collector -> Tenured generation promotion upon reaching age threshold (MaxTenuringThreshold). Stop-the-world pauses in Major GC vs Minor GC.',
    topics: ['JVM', 'Garbage Collection', 'Memory Management'],
    testCases: [],
  },
  {
    title: 'Object-Oriented Design Principles (SOLID)',
    domain: 'OOP',
    difficulty: 'intermediate',
    type: 'theory',
    statement: `### Liskov Substitution Principle (LSP)
Explain the Liskov Substitution Principle with a practical code violation example (e.g., Rectangle vs Square problem) and how composition or interface segregation resolves it.`,
    starterCode: null,
    referenceKeyPoints: 'Subtypes must be substitutable for their base types without altering correctness. Square extending Rectangle breaks post-conditions of setWidth/setHeight.',
    topics: ['SOLID', 'Inheritance', 'Design Patterns'],
    testCases: [],
  },
  {
    title: 'Database Transactions & ACID Isolation Levels',
    domain: 'DBMS',
    difficulty: 'advanced',
    type: 'theory',
    statement: `### Transaction Isolation Anomalies
Describe the four standard ANSI SQL isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) and the specific anomalies each prevents (Dirty Reads, Non-repeatable Reads, Phantom Reads). Explain how MySQL InnoDB handles Phantom Reads in Repeatable Read using Next-Key Locks.`,
    starterCode: null,
    referenceKeyPoints: 'Read Uncommitted (dirty read), Read Committed (non-repeatable read), Repeatable Read (phantom read via MVCC + gap locks/next-key locks), Serializable.',
    topics: ['ACID', 'Transactions', 'Locking', 'Concurrency'],
    testCases: [],
  },
  {
    title: 'Deadlock Detection and Prevention in Operating Systems',
    domain: 'Operating Systems',
    difficulty: 'intermediate',
    type: 'theory',
    statement: `### Deadlock Conditions (Coffman Conditions)
List the four Coffman conditions necessary for a deadlock to occur. Explain the Banker's Algorithm for deadlock avoidance and why it is rarely used in general-purpose operating systems.`,
    starterCode: null,
    referenceKeyPoints: '1. Mutual Exclusion, 2. Hold and Wait, 3. No Preemption, 4. Circular Wait. Banker\'s algorithm requires knowing maximum resource requests in advance, which is impractical for dynamic processes.',
    topics: ['Process Synchronization', 'Deadlocks', 'Resource Allocation'],
    testCases: [],
  },
  {
    title: 'TCP 3-Way Handshake and 4-Way Teardown',
    domain: 'Computer Networks',
    difficulty: 'intermediate',
    type: 'theory',
    statement: `### TCP Connection Lifecycle
Detail the exact packet flags (SYN, ACK, FIN) exchanged during TCP connection establishment and teardown. What is the purpose of the TIME_WAIT state, and why is its duration typically set to 2 * MSL?`,
    starterCode: null,
    referenceKeyPoints: 'Handshake: SYN -> SYN-ACK -> ACK. Teardown: FIN -> ACK -> FIN -> ACK. TIME_WAIT ensures duplicate packets expire in transit and the final ACK is reliably acknowledged.',
    topics: ['TCP/IP', 'Networking Protocols', 'Transport Layer'],
    testCases: [],
  },
  {
    title: 'Department Highest Salary Query',
    domain: 'SQL',
    difficulty: 'intermediate',
    type: 'coding',
    statement: `### SQL: Department Top Salaries
Given two tables \`Employee\` (id, name, salary, departmentId) and \`Department\` (id, name), write a SQL query to find employees who have the highest salary in each of the departments.`,
    starterCode: {
      sql: 'SELECT d.name AS Department, e.name AS Employee, e.salary AS Salary\nFROM Employee e\nJOIN Department d ON e.departmentId = d.id\nWHERE ...;',
    },
    referenceKeyPoints: 'Use DENSE_RANK() OVER (PARTITION BY departmentId ORDER BY salary DESC) = 1 or a correlated subquery on (departmentId, salary) IN (SELECT departmentId, MAX(salary) FROM Employee GROUP BY departmentId).',
    topics: ['Window Functions', 'Joins', 'Aggregation'],
    testCases: [
      { input: 'Sample schema with 5 employees in 2 departments', expectedOutput: 'IT: Joe (85000), Sales: Henry (80000)', isHidden: false, weight: 1 },
      { input: 'Edge case with duplicate top salaries in same department', expectedOutput: 'Both employees returned', isHidden: true, weight: 2 },
    ],
  },
  {
    title: 'Asynchronous Event Loop & Microtasks in JavaScript',
    domain: 'JavaScript',
    difficulty: 'intermediate',
    type: 'theory',
    statement: `### JS Execution Order
Explain the difference between Macrotasks (e.g., \`setTimeout\`, \`setInterval\`) and Microtasks (e.g., \`Promise.then\`, \`queueMicrotask\`) in V8. Predict the exact console output of mixed synchronous code, promises, and setTimeouts.`,
    starterCode: null,
    referenceKeyPoints: 'Microtask queue is exhausted completely after the current execution context and before rendering/macrotask processing. process.nextTick / Promise.then take precedence over macrotasks.',
    topics: ['Event Loop', 'Promises', 'Asynchronous Programming'],
    testCases: [],
  },
  {
    title: 'React Fiber Architecture & Reconciliation',
    domain: 'React',
    difficulty: 'advanced',
    type: 'theory',
    statement: `### React Reconciliation & Fiber Tree
How does the React Fiber reconciler differ from the legacy stack reconciler? Explain the render phase vs commit phase, work-in-progress trees, and how concurrent rendering enables prioritized, interruptible updates.`,
    starterCode: null,
    referenceKeyPoints: 'Fiber is a virtual stack frame representing work units. Render phase is asynchronous and can be paused/aborted; Commit phase is synchronous and mutates the real DOM. Double buffering with current and workInProgress trees.',
    topics: ['Fiber', 'Concurrent React', 'Performance Optimization'],
    testCases: [],
  },
  {
    title: 'Design a Distributed URL Shortener (TinyURL)',
    domain: 'System Design',
    difficulty: 'advanced',
    type: 'system_design',
    statement: `### System Design: Scalable URL Shortener
Design a global URL shortener service handling 100M new URLs per month and 10B read requests per month.
Address:
1. Short key generation (Base62 encoding vs pre-generated key generator service).
2. Data model and database choice (SQL vs NoSQL).
3. Caching strategy (Memcached/Redis, eviction policy).
4. Redirection latency optimization and analytics tracking.`,
    starterCode: null,
    referenceKeyPoints: 'Base62 with 7 characters yields 3.5 trillion URLs. Standalone Key Generation Service (KGS) avoids collisions without distributed locks. 80-20 rule for Redis caching (LRU). Write-behind cache or Kafka for analytics.',
    topics: ['Scalability', 'Key Generation', 'Caching', 'Load Balancing'],
    testCases: [],
  },
];

async function seed() {
  console.log('[SEED-QUESTIONS] Connecting to database...');
  await sequelize.authenticate();

  let admin = await User.findOne({ where: { role: 'admin' } });
  if (!admin) {
    admin = await User.findOne({ where: { role: 'interviewer' } });
  }

  const adminId = admin ? admin.id : null;
  console.log(`[SEED-QUESTIONS] Author ID set to: ${adminId}`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const qData of STARTER_QUESTIONS) {
    const existing = await Question.findOne({ where: { title: qData.title } });
    if (existing) {
      skippedCount++;
      continue;
    }

    const question = await Question.create({
      title: qData.title,
      domain: qData.domain,
      difficulty: qData.difficulty,
      type: qData.type,
      statement: qData.statement,
      starterCode: qData.starterCode,
      referenceKeyPoints: qData.referenceKeyPoints,
      status: 'published',
      createdBy: adminId,
    });

    if (qData.topics && qData.topics.length > 0) {
      for (const topic of qData.topics) {
        await QuestionTopic.create({
          questionId: question.id,
          topic,
        });
      }
    }

    if (qData.testCases && qData.testCases.length > 0) {
      for (const tc of qData.testCases) {
        await TestCase.create({
          questionId: question.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
          weight: tc.weight,
        });
      }
    }

    createdCount++;
  }

  console.log(`[SEED-QUESTIONS] Seeding finished. Created: ${createdCount}, Skipped: ${skippedCount}.`);
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SEED-QUESTIONS ERROR]', err);
      process.exit(1);
    });
}

module.exports = { seed, STARTER_QUESTIONS };
