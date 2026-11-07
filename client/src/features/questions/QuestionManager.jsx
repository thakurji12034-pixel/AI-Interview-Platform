import { useState, useEffect, useCallback } from 'react';
import http from '../../api/http';
import { useToast } from '../../context/useToast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Plus,
  Search,
  Trash2,
  Layers,
  Clock,
  X,
} from 'lucide-react';

const DOMAINS = [
  'DSA',
  'Java',
  'OOP',
  'DBMS',
  'Operating Systems',
  'Computer Networks',
  'SQL',
  'JavaScript',
  'React',
  'System Design',
];

export const QuestionManager = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'templates'

  // Questions state
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Question Form
  const [qForm, setQForm] = useState({
    title: '',
    domain: 'DSA',
    difficulty: 'intermediate',
    type: 'coding',
    statement: '',
    testCases: [{ input: '', expectedOutput: '', isHidden: false }],
  });

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [tForm, setTForm] = useState({
    title: '',
    domain: 'DSA',
    description: '',
    durationMinutes: 60,
  });

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedDomain !== 'all') params.domain = selectedDomain;
      if (selectedDifficulty !== 'all') params.difficulty = selectedDifficulty;

      const res = await http.get('/questions', { params });
      setQuestions(res.data.questions || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load question bank');
    } finally {
      setLoading(false);
    }
  }, [search, selectedDomain, selectedDifficulty, toast]);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const res = await http.get('/templates');
      setTemplates(res.data.templates || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load interview templates');
    } finally {
      setLoadingTemplates(false);
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    if (activeTab === 'questions') {
      const loadQ = async () => {
        try {
          const params = {};
          if (search.trim()) params.search = search.trim();
          if (selectedDomain !== 'all') params.domain = selectedDomain;
          if (selectedDifficulty !== 'all') params.difficulty = selectedDifficulty;

          const res = await http.get('/questions', { params });
          if (active) setQuestions(res.data.questions || []);
        } catch (err) {
          if (active) toast.error(err.response?.data?.message || 'Failed to load question bank');
        } finally {
          if (active) setLoading(false);
        }
      };
      loadQ();
    } else {
      const loadTpl = async () => {
        try {
          const res = await http.get('/templates');
          if (active) setTemplates(res.data.templates || []);
        } catch (err) {
          if (active) toast.error(err.response?.data?.message || 'Failed to load interview templates');
        } finally {
          if (active) setLoadingTemplates(false);
        }
      };
      loadTpl();
    }
    return () => {
      active = false;
    };
  }, [activeTab, search, selectedDomain, selectedDifficulty, toast]);

  const handleAddTestCase = () => {
    setQForm((prev) => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '', isHidden: false }],
    }));
  };

  const handleRemoveTestCase = (index) => {
    setQForm((prev) => ({
      ...prev,
      testCases: prev.testCases.filter((_, idx) => idx !== index),
    }));
  };

  const handleTestCaseChange = (index, field, value) => {
    setQForm((prev) => {
      const next = [...prev.testCases];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, testCases: next };
    });
  };

  const handleCreateQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!qForm.title.trim() || !qForm.statement.trim() || savingQuestion) return;

    try {
      setSavingQuestion(true);
      await http.post('/questions', {
        title: qForm.title.trim(),
        domain: qForm.domain,
        difficulty: qForm.difficulty,
        type: qForm.type,
        statement: qForm.statement.trim(),
        testCases: qForm.testCases.filter((tc) => tc.input.trim() && tc.expectedOutput.trim()),
      });

      toast.success('Question created and published to bank');
      setIsCreateOpen(false);
      setQForm({
        title: '',
        domain: 'DSA',
        difficulty: 'intermediate',
        type: 'coding',
        statement: '',
        testCases: [{ input: '', expectedOutput: '', isHidden: false }],
      });
      fetchQuestions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create question');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await http.delete(`/questions/${id}`);
      toast.success('Question deleted');
      fetchQuestions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete question');
    }
  };

  const handleCreateTemplateSubmit = async (e) => {
    e.preventDefault();
    if (!tForm.title.trim() || savingTemplate) return;

    try {
      setSavingTemplate(true);
      await http.post('/templates', {
        title: tForm.title.trim(),
        domain: tForm.domain,
        description: tForm.description.trim() || null,
        durationMinutes: parseInt(tForm.durationMinutes, 10),
      });

      toast.success('Interview template created');
      setIsTemplateModalOpen(false);
      setTForm({ title: '', domain: 'DSA', description: '', durationMinutes: 60 });
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await http.delete(`/templates/${id}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete template');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Question Bank & Templates</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Author and curate assessment problems, test cases, and standardized interview templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                activeTab === 'questions'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Questions
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                activeTab === 'templates'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Templates
            </button>
          </div>

          {activeTab === 'questions' ? (
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Question
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsTemplateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Template
            </Button>
          )}
        </div>
      </div>

      {/* Questions View */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search question bank..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="all">All Domains</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="all">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* List */}
          {loading ? (
            <SkeletonLoader count={4} className="h-24 w-full" />
          ) : questions.length === 0 ? (
            <EmptyState
              title="No questions found"
              description="Adjust search filters or create a new question."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm line-clamp-1">{q.title}</h3>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={q.difficulty} className="text-[10px] uppercase">
                        {q.difficulty}
                      </Badge>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {q.domain}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                        {q.type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{q.statement}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 mt-3 flex justify-between">
                    <span>
                      {q.sampleTestCases?.length || 0} sample tests
                    </span>
                    <span className="font-mono">#{q.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Templates View */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {loadingTemplates ? (
            <SkeletonLoader count={3} className="h-24 w-full" />
          ) : templates.length === 0 ? (
            <EmptyState
              title="No interview templates found"
              description="Standardized templates allow rapid scheduling of consistent technical interview sessions."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-semibold text-sm">{tpl.title}</h3>
                      </div>
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {tpl.domain && (
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {tpl.domain}
                      </span>
                    )}

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {tpl.description || 'Standard technical evaluation blueprint.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tpl.durationMinutes} minutes target duration</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Question Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold">Author New Assessment Question</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateQuestionSubmit}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-semibold mb-1">Question Title</label>
                <input
                  type="text"
                  required
                  value={qForm.title}
                  onChange={(e) => setQForm({ ...qForm, title: e.target.value })}
                  placeholder="e.g. Reverse Linked List II"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Domain</label>
                  <select
                    value={qForm.domain}
                    onChange={(e) => setQForm({ ...qForm, domain: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Difficulty</label>
                  <select
                    value={qForm.difficulty}
                    onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Question Type</label>
                  <select
                    value={qForm.type}
                    onChange={(e) => setQForm({ ...qForm, type: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="coding">Coding Sandbox</option>
                    <option value="theory">Conceptual / Theory</option>
                    <option value="system_design">System Architecture</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Problem Statement & Constraints
                </label>
                <textarea
                  required
                  rows={4}
                  value={qForm.statement}
                  onChange={(e) => setQForm({ ...qForm, statement: e.target.value })}
                  placeholder="Describe problem details, input/output requirements, and time/space constraints..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Test Cases Builder */}
              {qForm.type === 'coding' && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Execution Test Cases
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTestCase}
                      className="text-xs h-7"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Case
                    </Button>
                  </div>

                  {qForm.testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Case #{idx + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={(e) =>
                                handleTestCaseChange(idx, 'isHidden', e.target.checked)
                              }
                              className="rounded text-indigo-600"
                            />
                            <span>Hidden Secret Test</span>
                          </label>
                          {qForm.testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTestCase(idx)}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Input:</span>
                          <input
                            type="text"
                            value={tc.input}
                            onChange={(e) =>
                              handleTestCaseChange(idx, 'input', e.target.value)
                            }
                            placeholder="e.g. [1, 2, 3, 4, 5]"
                            className="w-full font-mono text-[11px] p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">
                            Expected Output:
                          </span>
                          <input
                            type="text"
                            value={tc.expectedOutput}
                            onChange={(e) =>
                              handleTestCaseChange(idx, 'expectedOutput', e.target.value)
                            }
                            placeholder="e.g. [5, 4, 3, 2, 1]"
                            className="w-full font-mono text-[11px] p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingQuestion}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {savingQuestion ? 'Publishing...' : 'Publish to Bank'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold">Create Interview Template</h2>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={tForm.title}
                  onChange={(e) => setTForm({ ...tForm, title: e.target.value })}
                  placeholder="e.g. Full-Stack Senior Assessment"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Domain</label>
                <select
                  value={tForm.domain}
                  onChange={(e) => setTForm({ ...tForm, domain: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Standard Duration (Minutes)</label>
                <input
                  type="number"
                  min="15"
                  max="180"
                  value={tForm.durationMinutes}
                  onChange={(e) => setTForm({ ...tForm, durationMinutes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Template Description</label>
                <textarea
                  rows={3}
                  value={tForm.description}
                  onChange={(e) => setTForm({ ...tForm, description: e.target.value })}
                  placeholder="Target competencies and assessment rubric notes..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTemplateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingTemplate}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {savingTemplate ? 'Saving...' : 'Create Template'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
