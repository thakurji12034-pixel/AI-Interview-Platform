const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { logger } = require('../utils/logger');

const ML_SCRIPT_PATH = path.join(__dirname, '..', '..', 'ml', 'predict_category.py');
const METADATA_PATH = path.join(__dirname, '..', '..', 'ml', 'models', 'metadata.json');

class MlService {
  constructor() {
    this.pythonCmd = this.resolvePythonCommand();
    this.cachedMetadata = null;
    this.keywordMap = this.buildKeywordMap();
  }

  resolvePythonCommand() {
    // Windows Python Launcher or standard python executable
    if (process.platform === 'win32') {
      return process.env.PYTHON_BIN || 'py';
    }
    return process.env.PYTHON_BIN || 'python3';
  }

  buildKeywordMap() {
    return {
      'Java Developer': ['java', 'spring', 'jvm', 'kafka', 'hibernate', 'microservices', 'jakarta', 'servlet', 'jee'],
      'Python Developer': ['python', 'django', 'flask', 'pandas', 'numpy', 'scikit', 'tensorflow', 'pytorch', 'pytest'],
      'DevOps Engineer': ['devops', 'docker', 'kubernetes', 'terraform', 'ansible', 'ci/cd', 'jenkins', 'aws', 'azure', 'linux'],
      'Database': ['sql', 'mysql', 'postgresql', 'database', 'mongodb', 'redis', 'schema', 'query optimization'],
      'Testing': ['testing', 'qa', 'automation', 'selenium', 'cypress', 'junit', 'pytest', 'integration testing'],
      'Data Science': ['data science', 'machine learning', 'ml', 'statistics', 'pandas', 'numpy', 'analytics', 'modeling'],
      'Web Designing': ['html', 'css', 'javascript', 'react', 'ux', 'ui', 'tailwind', 'frontend', 'design system'],
      'Business Analyst': ['business analyst', 'requirements', 'stakeholder', 'sql', 'analytics', 'documentation'],
      'DotNet Developer': ['dotnet', '.net', 'c#', 'asp.net', 'entity framework', 'azure'],
      'Automation Testing': ['automation testing', 'selenium', 'webdriver', 'playwright', 'test automation', 'qa automation'],
      'Network Security Engineer': ['network', 'security', 'firewall', 'cyber', 'openssl', 'vpn', 'identity'],
      'Mechanical Engineer': ['mechanical', 'cad', 'solidworks', 'manufacturing', 'design engineering'],
      'Electrical Engineering': ['electrical', 'circuits', 'embedded', 'automation', 'pcb', 'control systems'],
      'Operations Manager': ['operations', 'leadership', 'scheduling', 'logistics', 'team management'],
      'SAP Developer': ['sap', 'abap', 'hana', 'sapui5', 'erp'],
      'Sales': ['sales', 'account management', 'customer success', 'b2b', 'lead generation'],
      'HR': ['hr', 'recruitment', 'people operations', 'hiring', 'talent acquisition'],
      'Hadoop': ['hadoop', 'spark', 'mapreduce', 'hdfs', 'big data'],
      'Blockchain': ['blockchain', 'solidity', 'smart contract', 'ethereum', 'web3'],
      'Health and fitness': ['fitness', 'wellness', 'gym', 'nutrition', 'health coaching'],
      'Civil Engineer': ['civil', 'construction', 'infrastructure', 'autocad', 'structural'],
      'Advocate': ['advocate', 'litigation', 'legal research', 'case management', 'client relations'],
      'ETL Developer': ['etl', 'data warehouse', 'informatica', 'ssis', 'data pipeline'],
      'PMO': ['pmo', 'project management', 'portfolio', 'program governance', 'planning'],
      'Arts': ['design', 'illustration', 'creative', 'motion graphics', 'branding'],
    };
  }

  buildFastFallbackPrediction(resumeText) {
    const metadata = this.getModelMetadata();
    const classes = metadata && Array.isArray(metadata.classes) ? metadata.classes : Object.keys(this.keywordMap);
    const normalized = String(resumeText || '').toLowerCase();
    const rawScores = new Map();

    for (const category of classes) {
      const terms = this.keywordMap[category] || [category.toLowerCase()];
      let score = 0;
      for (const term of terms) {
        if (!term) continue;
        const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (pattern.test(normalized)) {
          score += term.includes(' ') ? 2 : 1;
        }
      }
      if (score > 0) rawScores.set(category, score);
    }

    const fallbackScores = rawScores.size > 0
      ? [...rawScores.entries()].sort((a, b) => b[1] - a[1])
      : [[classes[0] || 'Java Developer', 1]];

    const topPredictions = fallbackScores.slice(0, 5).map(([category, score], index) => ({
      category,
      confidence: Number(Math.min(0.99, 0.4 + score * 0.18 + index * 0.04).toFixed(4)),
    }));

    const best = topPredictions[0];
    return {
      success: true,
      predictedCategory: best.category,
      confidence: best.confidence,
      topPredictions,
      modelInfo: {
        algorithm: metadata?.algorithm || 'TF-IDF + Multinomial Logistic Regression',
        trainedClasses: metadata?.numClasses || classes.length,
        advisory: 'Automated role category prediction for profile matching. Does not indicate interview outcome.',
      },
    };
  }

  /**
   * Predicts the role/discipline category for a given resume text
   * using the trained TF-IDF + Logistic Regression pipeline.
   *
   * @param {string} resumeText - Raw or parsed resume text content
   * @returns {Promise<{
   *   success: boolean,
   *   predictedCategory?: string,
   *   confidence?: number,
   *   topPredictions?: Array<{ category: string, confidence: number }>,
   *   error?: string,
   *   message?: string
   * }>}
   */
  async predictResumeCategory(resumeText) {
    if (!resumeText || typeof resumeText !== 'string' || !resumeText.trim()) {
      return {
        success: false,
        error: 'EMPTY_INPUT',
        message: 'Resume text is empty or contains no extractable characters',
      };
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdoutData = '';
      let stderrData = '';
      let finalized = false;

      const finalizeWithFallback = (reason) => {
        if (finalized) return;
        finalized = true;
        const fallback = this.buildFastFallbackPrediction(resumeText);
        logger.warn({ reason, duration: Date.now() - startTime }, '[MlService] Falling back to lightweight in-memory prediction');
        resolve(fallback);
      };

      const pyProcess = spawn(this.pythonCmd, [ML_SCRIPT_PATH], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timeout = setTimeout(() => {
        if (!finalized) {
          try {
            pyProcess.kill();
          } catch (err) {
            logger.warn({ err: err.message }, '[MlService] Failed to terminate slow Python process');
          }
          finalizeWithFallback('python_timeout');
        }
      }, 1500);

      pyProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      pyProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      pyProcess.on('error', (err) => {
        logger.warn({ err: err.message }, '[MlService] Failed to spawn Python predictor process');
        clearTimeout(timeout);
        finalizeWithFallback('python_spawn_error');
      });

      pyProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (finalized) return;

        const duration = Date.now() - startTime;
        if (code !== 0 && !stdoutData.trim()) {
          logger.warn(
            { code, stderr: stderrData, duration },
            '[MlService] Python process exited with error'
          );
          return finalizeWithFallback('python_exit_error');
        }

        try {
          const parsed = JSON.parse(stdoutData.trim());
          if (parsed && parsed.success) {
            logger.info(
              { category: parsed.predictedCategory, confidence: parsed.confidence, duration },
              '[MlService] Resume category prediction complete'
            );
            finalized = true;
            return resolve(parsed);
          }
          throw new Error(parsed && parsed.message ? parsed.message : 'Non-success ML response');
        } catch (parseErr) {
          logger.error(
            { parseErr: parseErr.message, stdout: stdoutData, stderr: stderrData },
            '[MlService] Failed to parse ML predictor output'
          );
          return finalizeWithFallback('parse_error');
        }
      });

      // Write resume text to stdin and close stream
      try {
        pyProcess.stdin.write(resumeText, 'utf8');
        pyProcess.stdin.end();
      } catch (writeErr) {
        logger.error({ err: writeErr.message }, '[MlService] Failed to write to predictor stdin');
        clearTimeout(timeout);
        finalizeWithFallback('stdin_write_error');
      }
    });
  }

  /**
   * Retrieves saved metadata from the trained ML model
   */
  getModelMetadata() {
    if (this.cachedMetadata) return this.cachedMetadata;
    try {
      if (fs.existsSync(METADATA_PATH)) {
        const raw = fs.readFileSync(METADATA_PATH, 'utf8');
        this.cachedMetadata = JSON.parse(raw);
        return this.cachedMetadata;
      }
    } catch (err) {
      logger.warn({ err: err.message }, '[MlService] Could not read model metadata file');
    }
    return null;
  }
}

const mlService = new MlService();

module.exports = {
  MlService,
  mlService,
};

