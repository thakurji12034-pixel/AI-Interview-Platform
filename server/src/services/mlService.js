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
  }

  resolvePythonCommand() {
    // Windows Python Launcher or standard python executable
    if (process.platform === 'win32') {
      return process.env.PYTHON_BIN || 'py';
    }
    return process.env.PYTHON_BIN || 'python3';
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

      const pyProcess = spawn(this.pythonCmd, [ML_SCRIPT_PATH], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      pyProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      pyProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      pyProcess.on('error', (err) => {
        logger.warn({ err: err.message }, '[MlService] Failed to spawn Python predictor process');
        resolve({
          success: false,
          error: 'ML_SERVICE_UNAVAILABLE',
          message: 'Machine learning prediction service is temporarily unavailable',
        });
      });

      pyProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        if (code !== 0 && !stdoutData.trim()) {
          logger.warn(
            { code, stderr: stderrData, duration },
            '[MlService] Python process exited with error'
          );
          return resolve({
            success: false,
            error: 'INFERENCE_ERROR',
            message: 'ML classifier exited with an error',
          });
        }

        try {
          const parsed = JSON.parse(stdoutData.trim());
          logger.info(
            { category: parsed.predictedCategory, confidence: parsed.confidence, duration },
            '[MlService] Resume category prediction complete'
          );
          resolve(parsed);
        } catch (parseErr) {
          logger.error(
            { parseErr: parseErr.message, stdout: stdoutData, stderr: stderrData },
            '[MlService] Failed to parse ML predictor output'
          );
          resolve({
            success: false,
            error: 'INVALID_OUTPUT',
            message: 'Unable to parse classification response',
          });
        }
      });

      // Write resume text to stdin and close stream
      try {
        pyProcess.stdin.write(resumeText, 'utf8');
        pyProcess.stdin.end();
      } catch (writeErr) {
        logger.error({ err: writeErr.message }, '[MlService] Failed to write to predictor stdin');
        resolve({
          success: false,
          error: 'STDIN_WRITE_ERROR',
          message: 'Failed to pipe resume text to classifier',
        });
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

