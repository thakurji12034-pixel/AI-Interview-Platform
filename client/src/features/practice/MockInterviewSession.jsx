import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '../../api/http';
import { useToast } from '../../context/useToast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Sparkles,
  Clock,
  Send,
  Play,
  Award,
  X,
} from 'lucide-react';

export const MockInterviewSession = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const toast = useToast();

  // Setup state
  const [session, setSession] = useState(null);
  const [type, setType] = useState('coding');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [starting, setStarting] = useState(false);

  // Active session state
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (session?.status === 'in_progress' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      clearInterval(timerRef.current);
    };
  }, [session, timeLeft]);

  if (!isOpen) return null;

  const handleStartSession = async () => {
    try {
      setStarting(true);
      const createRes = await http.post('/sessions', {
        type,
        difficulty,
        mode: 'ai_mock',
        durationMinutes: Number(durationMinutes),
      });

      const newSession = createRes.data.session;

      // Start session
      const startRes = await http.post(`/sessions/${newSession.id}/start`);
      const activeSession = startRes.data.session;

      setSession(activeSession);
      const qList = activeSession.questions || [];
      setQuestions(qList);
      setCurrentIdx(0);
      setTimeLeft(Number(durationMinutes) * 60);
      startTimeRef.current = Date.now();
      toast.success('AI Mock Interview started! Answer questions within the time limit.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start mock interview session');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!answerText.trim() || submittingAnswer) return;

    const currentQuestion = questions[currentIdx];
    if (!currentQuestion) return;

    try {
      setSubmittingAnswer(true);
      const timeSpent = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

      await http.post(`/sessions/${session.id}/answers`, {
        sessionQuestionId: currentQuestion.id,
        answerText: answerText.trim(),
        codeSnippet: codeSnippet.trim() || null,
        language: type === 'coding' ? 'javascript' : null,
        timeSpentSeconds: timeSpent,
      });

      toast.success('Answer evaluated! Fetching next prompt or follow-up...');
      setAnswerText('');
      setCodeSnippet('');
      startTimeRef.current = Date.now();

      // Refresh session questions
      const refreshRes = await http.get(`/sessions/${session.id}`);
      const updatedList = refreshRes.data.session.questions || [];
      setQuestions(updatedList);

      if (currentIdx + 1 < updatedList.length) {
        setCurrentIdx(currentIdx + 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record answer');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!session || completing) return;
    try {
      setCompleting(true);
      await http.post(`/sessions/${session.id}/complete`);
      toast.success('Mock interview completed! Generating your evaluation report...');
      onClose();
      navigate(`/reports/${session.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete session');
    } finally {
      setCompleting(false);
    }
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIdx];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-8 select-none">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>AI Technical Mock Interview</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Simulated Session
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Interactive interview simulation with adaptive AI follow-up questions and rubrics.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto select-text">
          {!session ? (
            /* Setup Form */
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Interview Type / Domain
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="coding">Algorithms & Data Structures (Coding)</option>
                    <option value="system_design">System Architecture & Design</option>
                    <option value="behavioral">Behavioral & Situational</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="beginner">Beginner (Junior Level)</option>
                    <option value="intermediate">Intermediate (Mid Level)</option>
                    <option value="advanced">Advanced (Senior / Staff Level)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Duration (Minutes)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition ${
                        durationMinutes === mins
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">How Mock Practice Works:</p>
                <p>1. The platform will present sequential technical assessment questions.</p>
                <p>2. Detailed answers trigger adaptive AI follow-up prompts exploring edge cases.</p>
                <p>3. After completion, a verified multi-dimension evaluation report is produced.</p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleStartSession}
                  disabled={starting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-5"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  {starting ? 'Starting Simulation...' : 'Begin Mock Interview'}
                </Button>
              </div>
            </div>
          ) : (
            /* Active Live Mock Session */
            <div className="space-y-5">
              {/* Top Status & Timer Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <Badge variant={difficulty} className="text-[10px] uppercase">
                    {difficulty}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Question {currentIdx + 1} of {Math.max(questions.length, currentIdx + 1)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimer(timeLeft)}</span>
                </div>
              </div>

              {/* Question Card */}
              {currentQuestion ? (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Technical Question:
                    </span>
                    {currentQuestion.parentQuestionId && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                        Adaptive Follow-Up
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
                    {currentQuestion.prompt}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  All prompt questions answered! You can now finalize your mock interview.
                </div>
              )}

              {/* Answer Form */}
              {currentQuestion && (
                <form onSubmit={handleSubmitAnswer} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Your Technical Explanation & Response:
                    </label>
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Explain your approach, time/space complexity trade-offs, and design architecture in detail..."
                      rows={5}
                      required
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                    />
                  </div>

                  {type === 'coding' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Optional Code Snippet:
                      </label>
                      <textarea
                        value={codeSnippet}
                        onChange={(e) => setCodeSnippet(e.target.value)}
                        placeholder="// Write example solution or pseudocode here..."
                        rows={4}
                        className="w-full text-[11px] p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCompleteSession}
                      disabled={completing}
                      className="text-xs"
                    >
                      <Award className="w-3.5 h-3.5 mr-1.5" />
                      {completing ? 'Concluding...' : 'Finish & View Evaluation'}
                    </Button>

                    <Button
                      type="submit"
                      disabled={submittingAnswer || !answerText.trim()}
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4"
                    >
                      {submittingAnswer ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                          Evaluating Answer...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Submit & Next
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {!currentQuestion && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleCompleteSession}
                    disabled={completing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-5"
                  >
                    <Award className="w-3.5 h-3.5 mr-1.5" />
                    {completing ? 'Generating Report...' : 'Complete Interview & Generate Report'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
