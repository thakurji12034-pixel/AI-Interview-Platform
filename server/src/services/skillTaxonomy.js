/**
 * Technical skills taxonomy and canonical normalization
 */
const CANONICAL_SKILLS = {
  javascript: { name: 'JavaScript', category: 'Languages' },
  js: { name: 'JavaScript', category: 'Languages' },
  typescript: { name: 'TypeScript', category: 'Languages' },
  ts: { name: 'TypeScript', category: 'Languages' },
  python: { name: 'Python', category: 'Languages' },
  py: { name: 'Python', category: 'Languages' },
  java: { name: 'Java', category: 'Languages' },
  cpp: { name: 'C++', category: 'Languages' },
  'c++': { name: 'C++', category: 'Languages' },
  csharp: { name: 'C#', category: 'Languages' },
  'c#': { name: 'C#', category: 'Languages' },
  golang: { name: 'Go', category: 'Languages' },
  go: { name: 'Go', category: 'Languages' },
  rust: { name: 'Rust', category: 'Languages' },

  react: { name: 'React', category: 'Frontend' },
  reactjs: { name: 'React', category: 'Frontend' },
  vue: { name: 'Vue.js', category: 'Frontend' },
  angular: { name: 'Angular', category: 'Frontend' },
  html: { name: 'HTML5', category: 'Frontend' },
  css: { name: 'CSS3', category: 'Frontend' },
  tailwind: { name: 'Tailwind CSS', category: 'Frontend' },

  node: { name: 'Node.js', category: 'Backend' },
  nodejs: { name: 'Node.js', category: 'Backend' },
  express: { name: 'Express.js', category: 'Backend' },
  nestjs: { name: 'NestJS', category: 'Backend' },
  spring: { name: 'Spring Boot', category: 'Backend' },
  springboot: { name: 'Spring Boot', category: 'Backend' },
  django: { name: 'Django', category: 'Backend' },
  fastapi: { name: 'FastAPI', category: 'Backend' },

  sql: { name: 'SQL', category: 'Database' },
  postgresql: { name: 'PostgreSQL', category: 'Database' },
  postgres: { name: 'PostgreSQL', category: 'Database' },
  mysql: { name: 'MySQL', category: 'Database' },
  mongodb: { name: 'MongoDB', category: 'Database' },
  mongo: { name: 'MongoDB', category: 'Database' },
  redis: { name: 'Redis', category: 'Database' },

  docker: { name: 'Docker', category: 'DevOps' },
  kubernetes: { name: 'Kubernetes', category: 'DevOps' },
  k8s: { name: 'Kubernetes', category: 'DevOps' },
  aws: { name: 'AWS', category: 'DevOps' },
  gcp: { name: 'GCP', category: 'DevOps' },
  azure: { name: 'Azure', category: 'DevOps' },
  git: { name: 'Git', category: 'DevOps' },
  ci_cd: { name: 'CI/CD', category: 'DevOps' },
};

/**
 * Normalizes raw skill text against canonical taxonomy
 */
function normalizeSkill(rawName, fallbackCategory = 'Other') {
  if (!rawName || typeof rawName !== 'string') return null;
  const key = rawName.trim().toLowerCase().replace(/[\s.-]+/g, '');
  if (CANONICAL_SKILLS[key]) {
    return CANONICAL_SKILLS[key];
  }

  // Capitalize neatly if not in taxonomy
  const formatted = rawName.trim().charAt(0).toUpperCase() + rawName.trim().slice(1);
  return {
    name: formatted,
    category: fallbackCategory,
  };
}

module.exports = {
  CANONICAL_SKILLS,
  normalizeSkill,
};
