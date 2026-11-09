# IntelliPrep AI – 3-Minute Live Demonstration Script

**Platform**: IntelliPrep AI – Enterprise Technical Assessment & Interview Platform  
**Target Duration**: ~3 minutes  
**Target Audience**: Engineering Leadership, Interviewers, Assessment Administrators  

> [!NOTE]  
> **Simulation Disclaimer**: When demonstrating in demonstration or staging environments without live cloud credentials, background job workers, Redis caching, code sandboxing, and AI rubric generation operate using high-fidelity local in-memory engines. Simulated executions are explicitly flagged with a prominent amber `Simulated result` badge to guarantee transparency.

---

## Demo Credentials & Persona Matrix
| Persona | Email | Purpose |
| :--- | :--- | :--- |
| **Platform Administrator** | `admin@example.com` | User management, audit logs, security settings, invitations |
| **Technical Interviewer** | `interviewer@example.com` | Question authoring, session scheduling, live rooms, score overrides |
| **Assessment Candidate** | `candidate@example.com` | Resume upload, live coding assessment, AI mock practice, analytics |

*(Note: Passwords are encrypted with bcrypt and should be retrieved from your secure credential store or local environment variables).*

---

## Act 1: Platform Administration & Role-Based Security (0:00 - 0:30)

1. **Access the Admin Portal**:
   - Navigate to `http://localhost:5173/login`.
   - Log in using `admin@example.com`.
   - Point out the **Demonstration Mode Active** banner and system throughput metrics (*Evidence: `01-admin-dashboard.png`*).
2. **Issue an Interviewer Invitation**:
   - Click the **Invitations** navigation tab.
   - Click **Invite Team Member**, enter the recipient's email (`interviewer@example.com`), and select the role **Interviewer**.
   - Click **Generate Invitation Link** and copy the single-use token URL (*Evidence: `02-admin-invitation-created.png`*).
3. **Inspect the Immutable Audit Trail**:
   - Click the **Audit Trail** tab.
   - Point out that every administrative action, IP address, and actor role is recorded immutably in the database (*Evidence: `03-admin-audit-logs.png`*).
4. **Platform & AI Guardrail Settings**:
   - Click the **Platform Settings** tab.
   - Demonstrate configurable code execution timeouts (default 10s), memory limits (512MB), and active AI prompt versioning (*Evidence: `04-admin-platform-settings.png`*).
5. **Log Out**:
   - Click **Logout** in the top navigation header.

---

## Act 2: Interviewer Onboarding & Assessment Prep (0:30 - 1:00)

1. **Accept Invitation**:
   - Open the copied invitation URL (e.g. `/accept-invite?token=...`).
   - Fill in name and set a secure password, then click **Complete Registration** (*Evidence: `05-interviewer-registration.png`*).
2. **Question Authoring with Hidden Test Cases**:
   - Click **Question Bank** in the top navigation bar.
   - Click **New Question**.
   - Input title: `Reverse Linked List II`, specify domain `DSA` and difficulty `Intermediate`.
   - Add a public sample test case (`[1,2,3,4,5], 2, 4 -> [1,4,3,2,5]`).
   - Click **Add Case**, input hidden boundary test case (`[5], 1, 1 -> [5]`), and check the **Hidden Test Case** box.
   - Click **Publish to Bank** (*Evidence: `09-interviewer-create-question.png`*).
3. **Schedule Assessment Session**:
   - Click **Scheduled Sessions** -> **Schedule Interview**.
   - Enter Candidate Email: `candidate@example.com`.
   - Enter Title: `Full-Stack Assessment & Live Coding`.
   - Pick tomorrow's date and duration (60 minutes).
   - Click **Confirm Schedule** (*Evidence: `10-interviewer-template-schedule.png`*).

---

## Act 3: Candidate Portal & Resume Matching (1:00 - 1:30)

1. **Candidate Onboarding**:
   - In a separate private browser window, navigate to `/login` and sign up as `candidate@example.com` (*Evidence: `06-candidate-signup.png`*).
2. **Resume Upload & Technical Skill Extraction**:
   - On the Candidate Portal, click **Resume & Skills Match**.
   - Drag and drop `docs/demo/sample-resume.pdf` into the upload dropzone (*Evidence: `07-candidate-resume-upload.png`*).
   - Click **Upload & Extract Skills**. The system parses the PDF and populates verified technical competencies (React, Node.js, TypeScript, SQL, Docker).
3. **Job Description Compatibility Analyzer**:
   - Paste a sample Job Description in the analyzer textarea and click **Analyze Match Score**.
   - Point out the match percentage gauge and matched vs. missing skills breakdown (*Evidence: `08-candidate-resume-match.png`*).
   - Close the modal.

---

## Act 4: Live Collaborative Assessment (1:30 - 2:10)

1. **Entering the Collaborative Room**:
   - On the Candidate Dashboard, observe the scheduled assessment card.
   - Click **Join Coding Room** (*Evidence: `11-candidate-dashboard-interview.png`*).
   - Have the Interviewer also enter the room from the Interviewer Workspace (*Evidence: `12-coding-room-collaboration.png`*).
2. **Real-Time Presence & Monaco Collaboration**:
   - As Candidate, type an iterative solution in the editor.
   - Notice the instant cursor movement, typing indicators, and real-time synchronization between both windows (*Evidence: `13-coding-room-presence-cursors.png`*).
3. **State Recovery Across Browser Reload**:
   - Reload the Candidate browser tab (`Ctrl+R`).
   - Observe that Monaco editor immediately restores the complete document buffer from server memory without data loss (*Evidence: `14-coding-room-refresh-recovery.png`*).
4. **Code Execution & Hidden Test Shielding**:
   - Click **Run Code** in the room toolbar.
   - Click **Run Code** in the execution drawer footer.
   - Observe the test execution results with the amber **Simulated result** badge (*Evidence: `15-coding-room-code-execution.png`*).
   - Notice that public test inputs and outputs are inspectable, while hidden tests display **Secret Data Redacted** (*Evidence: `16-coding-room-hidden-test-protection.png`*).
5. **Session Conclusion**:
   - The Interviewer returns to the dashboard and clicks **Finish** to close the session (*Evidence: `17-interview-completed.png`*).

---

## Act 5: AI Evaluation & Human Review Override (2:10 - 2:35)

1. **Synthesize Multi-Dimensional Report**:
   - As Interviewer, click **Report** on the completed interview card.
   - Click **Generate AI Evaluation Report**.
   - Point out the **Overall Composite Score** (e.g. 88/100) and multi-dimensional rubrics (Code Quality, Problem Solving, Correctness) (*Evidence: `18-candidate-report-view.png`*).
   - Point out the mandatory **Visible AI Advisory Disclaimer** at the bottom of the evaluation report.
2. **Interviewer Human Override**:
   - Scroll to the **Human Reviewer Override** section.
   - Enter adjusted score: `92`.
   - Enter justification notes: *"Excellent algorithmic clarity, optimal time complexity, and clean code documentation."*
   - Click **Save Human Override** and demonstrate the updated **Human Overridden** badge (*Evidence: `19-interviewer-report-override.png`*).

---

## Act 6: Autonomous Practice, Analytics & Accessibility (2:35 - 2:50)

1. **Adaptive AI Mock Practice**:
   - As Candidate, click **AI Practice Mock** on the portal (*Evidence: `20-ai-mock-practice-config.png`*).
   - Click **Begin Mock Interview** to start an autonomous session with timed questions and follow-ups (*Evidence: `21-ai-mock-practice-session.png`*).
   - Submit response and close the session.
2. **Visual Analytics & Accessible Data Table**:
   - Observe the Candidate **Score Progression Over Time** chart and **Skill Profile** radar (*Evidence: `22-analytics-charts.png`*).
   - Click **Table View** to switch to the tabular representation built with accessibility in mind (keyboard navigation, labels, contrast), not formally audited (*Evidence: `23-analytics-data-table.png`*).
3. **Accessibility & Responsive Views**:
   - Click the theme toggle icon in the top navigation bar to switch between Light and Dark mode (*Evidence: `24-theme-toggle.png`*).
   - Demonstrate mobile responsiveness at 390x844 on both the Candidate Portal (*Evidence: `25-mobile-dashboard.png`*) and Coding Room (*Evidence: `26-mobile-room.png`*).

---

## Act 7: Security Guardrails & Privilege Isolation (2:50 - 3:00)

1. **Privilege Escalation Defense**:
   - While logged in as Candidate, attempt to directly navigate to `http://localhost:5173/admin`.
   - Demonstrate that Candidate is forbidden and redirected back to the candidate portal (*Evidence: `29-security-candidate-forbidden-admin.png`*).
2. **Session Revocation & Back-Button Protection**:
   - Click **Logout**.
   - Attempt to navigate to `http://localhost:5173/`.
   - Observe the immediate redirect to `/login` (*Evidence: `30-security-unauthenticated-redirect.png`*).
   - Click the browser **Back** button.
   - Verify that the browser cannot re-enter protected routes or display cached user data (*Evidence: `31-security-back-after-logout.png`*).

