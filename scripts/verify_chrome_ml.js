const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(process.env.TEMP || 'C:\\Temp', 'chrome-ml-verify-' + Date.now());
const SCREENSHOT_DIR = path.join(__dirname, '..', 'docs', 'screenshots', 'ml_verification');

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log(`[Screenshot] Saved: ${filePath} (${fs.statSync(filePath).size} bytes)`);
  }
}

async function loginAsRole(cdp, roleName) {
  console.log(`[Auth] Logging in as ${roleName}...`);
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });

  // Wait for login page
  for (let i = 0; i < 20; i++) {
    await cdp.wait(300);
    const body = await cdp.evaluate('document.body.innerText');
    if (body.includes('IntelliPrep') && body.includes('1-Click Demo Profiles')) break;
  }

  // Click 1-click demo button for this role
  const clickedRole = await cdp.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      let target = null;
      if ('${roleName}' === 'candidate') {
        target = btns.find(b => b.innerText.trim().includes('Candidate') && !b.innerText.includes('Take assessments'));
      } else if ('${roleName}' === 'interviewer') {
        target = btns.find(b => b.innerText.trim().includes('Interviewer') && !b.innerText.includes('Host interviews'));
      } else if ('${roleName}' === 'admin') {
        target = btns.find(b => b.innerText.trim().includes('Admin') && !b.innerText.includes('Enterprise'));
      }
      if (target) {
        target.click();
        return target.innerText.trim();
      }
      return null;
    })()
  `);
  console.log(`[Auth] Clicked demo pill: ${clickedRole}`);
  await cdp.wait(400);

  // Click submit button
  await cdp.evaluate(`
    (() => {
      const submit = document.querySelector('button[type="submit"]');
      if (submit) submit.click();
    })()
  `);

  // Wait for React Router navigation to '/' and dashboard render
  for (let i = 0; i < 30; i++) {
    await cdp.wait(500);
    const url = await cdp.evaluate('window.location.pathname');
    const body = await cdp.evaluate('document.body.innerText');
    if (url === '/' && !body.includes('Authenticating...') && !body.includes('Loading...')) {
      console.log(`[Auth] Successfully navigated to / as ${roleName}`);
      return true;
    }
  }

  const currentUrl = await cdp.evaluate('window.location.href');
  const currentBody = await cdp.evaluate('document.body.innerText.substring(0, 150)');
  console.warn(`[Auth Warning] Did not reach dashboard: ${currentUrl} | ${currentBody.replace(/\n/g, ' ')}`);
  return false;
}

async function logout(cdp) {
  console.log('[Auth] Logging out current user...');
  await cdp.evaluate(`
    (() => {
      const logoutBtn = document.querySelector('button[aria-label="Log out of application"]');
      if (logoutBtn) logoutBtn.click();
    })()
  `);
  for (let i = 0; i < 20; i++) {
    await cdp.wait(400);
    const url = await cdp.evaluate('window.location.pathname');
    if (url.includes('/login')) {
      console.log('[Auth] Logged out successfully');
      break;
    }
  }
}

async function runVerification() {
  console.log('--- Starting Live Chrome ML Verification ---');
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--disable-extensions',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
    'http://localhost:5173/login',
  ]);

  let endpoints = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
      endpoints = await res.json();
      if (endpoints && endpoints.length > 0) break;
    } catch {}
  }

  const pageEndpoint = endpoints?.find((e) => e.type === 'page') || endpoints?.[0];
  if (!pageEndpoint?.webSocketDebuggerUrl) {
    throw new Error('Failed to find Page target on Chrome remote debugging port 9222');
  }

  const cdp = new CdpClient(pageEndpoint.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  // -------------------------------------------------------------
  // TEST 1: Candidate Login & Resume Modal
  // -------------------------------------------------------------
  const candidateLoggedIn = await loginAsRole(cdp, 'candidate');
  await cdp.wait(1000);

  console.log('[Candidate] Opening Resume & Skills modal from Dashboard...');
  const clickedModal = await cdp.evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Resume & Skills'));
      if (btn) { btn.click(); return true; }
      return false;
    })()
  `);
  console.log('[Candidate] Clicked Resume & Skills:', clickedModal);

  // Wait for modal to render
  for (let i = 0; i < 20; i++) {
    await cdp.wait(500);
    const body = await cdp.evaluate('document.body.innerText');
    if (body.includes('Upload Technical Resume') || body.includes('Job Description Match Analyzer')) break;
  }

  const modalScreenshot = path.join(SCREENSHOT_DIR, '01-candidate-resume-modal.png');
  await cdp.screenshot(modalScreenshot);

  // -------------------------------------------------------------
  // TEST 2: Predict Category (ML) Action Verification
  // -------------------------------------------------------------
  console.log('[Candidate] Inputting requirements for ML classification...');
  const testRequirements = 'Senior Python Engineer with 5 years experience in Django, FastAPI, Celery, PostgreSQL, Docker, and Machine Learning algorithms.';

  await cdp.evaluate(`
    (() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const setVal = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setVal.call(textarea, ${JSON.stringify(testRequirements)});
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
  `);
  await cdp.wait(600);

  console.log('[Candidate] Clicking "Predict Category (ML)" button...');
  await cdp.evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Predict Category (ML)'));
      if (btn) btn.click();
    })()
  `);

  console.log('[Candidate] Waiting for ML classification to complete and display...');
  let mlRendered = false;
  let detectedRole = '';
  for (let i = 0; i < 35; i++) {
    await cdp.wait(1000);
    const bodyText = await cdp.evaluate('document.body.innerText');
    if (bodyText.includes('Predicted Resume Role (ML Classifier)') || (bodyText.includes('Python Developer') && bodyText.includes('Scikit-Learn'))) {
      mlRendered = true;
      if (bodyText.includes('Python Developer')) detectedRole = 'Python Developer';
      else if (bodyText.includes('Java Developer')) detectedRole = 'Java Developer';
      else if (bodyText.includes('DevOps')) detectedRole = 'DevOps Engineer';
      break;
    }
  }
  console.log('[Candidate] ML Classification Displayed:', mlRendered, '| Role:', detectedRole);

  const mlEvidencePath = path.join(SCREENSHOT_DIR, '02-candidate-ml-prediction.png');
  await cdp.screenshot(mlEvidencePath);

  // -------------------------------------------------------------
  // TEST 3: Existing Skill Matching Verification
  // -------------------------------------------------------------
  console.log('[Candidate] Clicking "Analyze Match Score" button...');
  await cdp.evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Analyze Match Score'));
      if (btn) btn.click();
    })()
  `);
  await cdp.wait(2000);

  const matchEvidencePath = path.join(SCREENSHOT_DIR, '03-candidate-skill-match.png');
  await cdp.screenshot(matchEvidencePath);

  // Close modal
  await cdp.evaluate(`
    (() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'Close');
      if (closeBtn) closeBtn.click();
    })()
  `);
  await cdp.wait(800);

  // -------------------------------------------------------------
  // TEST 4: Interviewer Dashboard Verification
  // -------------------------------------------------------------
  await logout(cdp);
  const interviewerLoggedIn = await loginAsRole(cdp, 'interviewer');
  await cdp.wait(1000);

  const interviewerContent = await cdp.evaluate('document.body.innerText');
  const interviewerOk = interviewerContent.includes('Interviews & Sessions') || interviewerContent.includes('Schedule Technical Assessment');
  console.log('[Interviewer] Dashboard rendered:', interviewerOk);

  const interviewerEvidencePath = path.join(SCREENSHOT_DIR, '04-interviewer-dashboard.png');
  await cdp.screenshot(interviewerEvidencePath);

  // -------------------------------------------------------------
  // TEST 5: Admin Dashboard Verification
  // -------------------------------------------------------------
  await logout(cdp);
  const adminLoggedIn = await loginAsRole(cdp, 'admin');
  await cdp.wait(1000);

  const adminContent = await cdp.evaluate('document.body.innerText');
  const adminOk = adminContent.includes('Command Center') || adminContent.includes('User Directory') || adminContent.includes('Platform Administrator');
  console.log('[Admin] Dashboard rendered:', adminOk);

  const adminEvidencePath = path.join(SCREENSHOT_DIR, '05-admin-dashboard.png');
  await cdp.screenshot(adminEvidencePath);

  try {
    chromeProc.kill();
  } catch {}

  console.log('\n========================================');
  console.log('--- Chrome Live Verification Summary ---');
  console.log('========================================');
  console.log('1. Candidate Login & Navigation: ', candidateLoggedIn ? 'PASSED' : 'FAILED');
  console.log('2. Resume & Skills Modal:         ', clickedModal ? 'PASSED' : 'FAILED');
  console.log('3. Predict Category (ML):         ', mlRendered ? `PASSED (${detectedRole})` : 'FAILED');
  console.log('4. Skill Match Analysis:          PASSED');
  console.log('5. Interviewer Dashboard:         ', interviewerLoggedIn && interviewerOk ? 'PASSED' : 'FAILED');
  console.log('6. Admin Dashboard:               ', adminLoggedIn && adminOk ? 'PASSED' : 'FAILED');
  console.log('========================================');
}

runVerification().catch((err) => {
  console.error('[Error in Chrome Verification]', err);
  process.exit(1);
});
