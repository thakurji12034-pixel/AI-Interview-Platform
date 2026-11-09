import { useState, useEffect } from 'react';
import http from '../../api/http';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Clock,
  FileCode,
  Terminal,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const RunCodePanel = ({ getCode, code, language, isObserver, onClose }) => {
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'problem' | 'custom'
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [customStdin, setCustomStdin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pollError, setPollError] = useState('');
  const [submission, setSubmission] = useState(null);
  const [expandedTest, setExpandedTest] = useState(null);

  // Fetch available questions
  useEffect(() => {
    let active = true;
    const fetchQuestions = async () => {
      try {
        const res = await http.get('/questions');
        if (active && res.data.questions?.length > 0) {
          const qList = res.data.questions;
          setQuestions(qList);
          // Prefer coding questions
          const firstCoding = qList.find((q) => q.type === 'coding') || qList[0];
          setSelectedQuestion(firstCoding);
        }
      } catch {
        // Fallback silently if question list unavailable
      }
    };
    fetchQuestions();
    return () => {
      active = false;
    };
  }, []);

  const handleRunCode = async () => {
    if (!selectedQuestion || submitting || isObserver) return;
    setSubmitting(true);
    setPollError('');
    setActiveTab('tests');

    try {
      const userCode = typeof getCode === 'function' ? getCode() : (code || '');
      const activeCode =
        userCode.trim() ||
        `// Starter solution for ${selectedQuestion.title}\nfunction solve() {\n  return [0, 1];\n}`;
      const payload = {
        questionId: selectedQuestion.id,
        language,
        code: activeCode,
      };

      const res = await http.post('/submissions', payload);
      const submissionId = res.data.submission?.id;
      if (!submissionId) {
        throw new Error('Failed to create execution submission');
      }

      // Poll until submission completes
      let attempts = 0;
      const maxAttempts = 30; // 15 seconds max

      const poll = async () => {
        attempts++;
        try {
          const pollRes = await http.get(`/submissions/${submissionId}`);
          const sub = pollRes.data.submission;
          if (sub.status === 'completed' || sub.status === 'failed') {
            setSubmission(sub);
            setSubmitting(false);
          } else if (attempts < maxAttempts) {
            setTimeout(poll, 500);
          } else {
            setSubmission(sub);
            setSubmitting(false);
            setPollError('Execution timed out while waiting for worker response.');
          }
        } catch (err) {
          setSubmitting(false);
          setPollError(err.response?.data?.message || 'Failed to poll submission status');
        }
      };

      setTimeout(poll, 500);
    } catch (err) {
      setSubmitting(false);
      setPollError(err.response?.data?.message || 'Failed to trigger code execution');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
          </span>
        );
      case 'wrong_answer':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <XCircle className="w-3.5 h-3.5" /> Wrong Answer
          </span>
        );
      case 'compilation_error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertOctagon className="w-3.5 h-3.5" /> Compilation Error
          </span>
        );
      case 'time_limit_exceeded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <Clock className="w-3.5 h-3.5" /> Time Limit Exceeded
          </span>
        );
      case 'runtime_error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertOctagon className="w-3.5 h-3.5" /> Runtime Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            {status || 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-96 lg:w-[460px] text-slate-900 dark:text-slate-100 transition-all select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold truncate">
              {selectedQuestion ? selectedQuestion.title : 'Assessment Question'}
            </h2>
            {selectedQuestion?.difficulty && (
              <Badge variant={selectedQuestion.difficulty} className="text-[10px] uppercase">
                {selectedQuestion.difficulty}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {selectedQuestion?.domain || 'Algorithms & Data Structures'}
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-1 rounded-md"
        >
          Close
        </button>
      </div>

      {/* Question Selector if multiple */}
      {questions.length > 1 && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium shrink-0">Switch Problem:</span>
          <select
            value={selectedQuestion?.id || ''}
            onChange={(e) => {
              const q = questions.find((item) => item.id === Number(e.target.value));
              if (q) setSelectedQuestion(q);
            }}
            className="w-full text-xs py-1 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title} ({q.difficulty})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-medium bg-slate-50/50 dark:bg-slate-950/50">
        <button
          onClick={() => setActiveTab('problem')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'problem'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Problem
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'tests'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          Test Results
          {submission && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800">
              {submission.passedTests}/{submission.totalTests}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'custom'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Custom Input
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 select-text">
        {/* Problem Description Tab */}
        {activeTab === 'problem' && (
          <div className="space-y-4 text-xs">
            {selectedQuestion ? (
              <>
                <div className="prose dark:prose-invert prose-xs max-w-none whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300">
                  {selectedQuestion.statement}
                </div>

                {selectedQuestion.sampleTestCases && selectedQuestion.sampleTestCases.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      Sample Test Cases:
                    </h3>
                    {selectedQuestion.sampleTestCases.map((tc, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-[11px]"
                      >
                        <div className="text-slate-500">Input:</div>
                        <div className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800 mt-0.5">
                          {tc.input}
                        </div>
                        <div className="text-slate-500 mt-1.5">Expected Output:</div>
                        <div className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800 mt-0.5">
                          {tc.expectedOutput}
                        </div>
                        {tc.explanation && (
                          <div className="text-slate-500 font-sans text-[11px] mt-1 italic">
                            {tc.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10 text-slate-400">No question selected.</div>
            )}
          </div>
        )}

        {/* Test Results Tab */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            {submitting ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Submitting and executing code...
                </p>
                <p className="text-[11px] text-slate-400">
                  Evaluating against sample and hidden test cases.
                </p>
              </div>
            ) : pollError ? (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                <p className="font-semibold">Execution Error</p>
                <p className="mt-1">{pollError}</p>
              </div>
            ) : !submission ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Play className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="font-medium text-slate-600 dark:text-slate-300">Ready to execute</p>
                <p className="text-[11px] mt-1 text-slate-400">
                  Click &ldquo;Run Code&rdquo; below to test your solution against test cases.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status Summary Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">Execution Status:</span>
                    {getStatusBadge(submission.resultStatus)}
                  </div>

                  {/* Simulated Result Indicator */}
                  {(submission.isSimulated || submission.provider === 'mock') && (
                    <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Simulated result (Executed via in-memory mock engine)</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Tests Passed
                      </span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {submission.passedTests} / {submission.totalTests}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Runtime
                      </span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {submission.executionTimeMs != null ? `${submission.executionTimeMs} ms` : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Memory
                      </span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {submission.memoryKb != null ? `${submission.memoryKb} KB` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Compilation / Runtime Errors */}
                {submission.compileOutput && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 font-mono text-[11px] text-rose-700 dark:text-rose-300 whitespace-pre-wrap">
                    <div className="font-semibold font-sans mb-1">Compiler Output:</div>
                    {submission.compileOutput}
                  </div>
                )}
                {submission.stderr && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 font-mono text-[11px] text-rose-700 dark:text-rose-300 whitespace-pre-wrap">
                    <div className="font-semibold font-sans mb-1">Standard Error:</div>
                    {submission.stderr}
                  </div>
                )}

                {/* Test Cases Table */}
                {Array.isArray(submission.testResults) && submission.testResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Test Case Breakdown:
                    </h4>
                    {submission.testResults.map((tc, idx) => {
                      const isExpanded = expandedTest === idx;
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
                        >
                          <div
                            onClick={() => !tc.isHidden && setExpandedTest(isExpanded ? null : idx)}
                            className={`p-2.5 flex items-center justify-between text-xs cursor-pointer ${
                              tc.passed
                                ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                                : 'bg-rose-500/5 hover:bg-rose-500/10'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {tc.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              )}
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {tc.isHidden
                                  ? `Hidden Test Case #${idx + 1}`
                                  : `Sample Test Case #${idx + 1}`}
                              </span>
                              {tc.isHidden && (
                                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  Secret Data Redacted
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {tc.executionTimeMs != null && (
                                <span className="text-[10px] text-slate-400">
                                  {tc.executionTimeMs} ms
                                </span>
                              )}
                              {!tc.isHidden && (
                                <button
                                  type="button"
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded Sample Test Details */}
                          {!tc.isHidden && isExpanded && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-2 font-mono text-[11px]">
                              <div>
                                <span className="text-slate-400">Input:</span>
                                <pre className="mt-0.5 p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 overflow-x-auto">
                                  {tc.input}
                                </pre>
                              </div>
                              <div>
                                <span className="text-slate-400">Expected:</span>
                                <pre className="mt-0.5 p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 overflow-x-auto text-emerald-600 dark:text-emerald-400">
                                  {tc.expectedOutput}
                                </pre>
                              </div>
                              <div>
                                <span className="text-slate-400">Actual Output:</span>
                                <pre
                                  className={`mt-0.5 p-1.5 bg-white dark:bg-slate-900 rounded border overflow-x-auto ${
                                    tc.passed
                                      ? 'border-emerald-200 text-emerald-600 dark:text-emerald-400'
                                      : 'border-rose-200 text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {tc.actualOutput || '(no output)'}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Custom Input Tab */}
        {activeTab === 'custom' && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Standard Input (stdin):</label>
              <textarea
                value={customStdin}
                onChange={(e) => setCustomStdin(e.target.value)}
                placeholder="Enter custom inputs here..."
                rows={5}
                className="w-full font-mono text-[11px] p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 transition"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              When you click &ldquo;Run Code&rdquo;, your solution will execute with this input.
            </p>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
        <div className="text-[11px] text-slate-500">
          Target Language: <span className="font-mono font-semibold uppercase">{language}</span>
        </div>

        <Button
          onClick={handleRunCode}
          disabled={submitting || isObserver || !selectedQuestion}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          size="sm"
        >
          <Play className="w-3.5 h-3.5" />
          {submitting ? 'Running...' : 'Run Code'}
        </Button>
      </div>
    </div>
  );
};
