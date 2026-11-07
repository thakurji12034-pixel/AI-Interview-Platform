import { useState, useRef } from 'react';
import http from '../../api/http';
import { useToast } from '../../context/useToast';
import { Button } from '../../components/ui/Button';
import {
  FileText,
  Upload,
  CheckCircle2,
  Trash2,
  Sparkles,
  Briefcase,
  X,
} from 'lucide-react';

export const ResumeUploadModal = ({ isOpen, onClose, onResumeUpdated }) => {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith('.pdf') || selected.type !== 'application/pdf') {
      toast.error('Only PDF documents are supported');
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      toast.error('Resume PDF file exceeds maximum size of 5 MB');
      return;
    }

    setFile(selected);
    setMatchResult(null);
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setMatchResult(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const res = await http.post('/resumes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedResume = res.data.resume;
      toast.success('Resume uploaded! Parsing document in background...');

      // Poll until parsed
      let attempts = 0;
      const poll = async () => {
        attempts++;
        try {
          const checkRes = await http.get(`/resumes/${uploadedResume.id}`);
          const cur = checkRes.data.resume;
          if (cur.status === 'parsed') {
            setResumeData(cur);
            setUploading(false);
            toast.success('Resume parsed successfully! Skills extracted.');
            if (onResumeUpdated) onResumeUpdated();
          } else if (cur.status === 'failed') {
            setUploading(false);
            toast.error(cur.parseError || 'Resume parsing failed');
          } else if (attempts < 20) {
            setTimeout(poll, 700);
          } else {
            setResumeData(cur);
            setUploading(false);
          }
        } catch {
          setUploading(false);
        }
      };

      setTimeout(poll, 700);
    } catch (err) {
      setUploading(false);
      toast.error(err.response?.data?.message || 'Failed to upload resume');
    }
  };

  const handleMatchJob = async () => {
    if (!jobDescription.trim() || matching) return;
    setMatching(true);

    try {
      const res = await http.post('/resumes/match-job', {
        jobDescription: jobDescription.trim(),
      });
      setMatchResult(res.data);
      toast.success(`Job match score: ${res.data.matchScore}%`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to analyze job match');
    } finally {
      setMatching(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!resumeData?.id || deleting) return;
    if (!window.confirm('Are you sure you want to delete your parsed resume and extracted skills?')) {
      return;
    }

    try {
      setDeleting(true);
      await http.delete(`/resumes/${resumeData.id}`);
      toast.success('Resume and extracted skills removed');
      setResumeData(null);
      setFile(null);
      setMatchResult(null);
      if (onResumeUpdated) onResumeUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete resume');
    } finally {
      setDeleting(false);
    }
  };

  const extractedSkills =
    resumeData?.parsedData?.skills ||
    resumeData?.extractedSkills ||
    [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                PDF Resume Skill Extraction & Job Match
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your engineering resume to extract technical skills and verify job compatibility.
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
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* File Upload Dropzone */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Upload Technical Resume (PDF, max 5 MB)
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-950/50"
            >
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {file ? file.name : 'Click to select or drag and drop your PDF resume'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Strictly .pdf format up to 5 MB'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs"
              >
                {uploading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                    Parsing Resume...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload & Extract Skills
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Parsed Resume Details & Skills Tag Cloud */}
          {resumeData && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Active Resume: {resumeData.originalFileName}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteResume}
                  disabled={deleting}
                  className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs h-7 px-2"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {deleting ? 'Removing...' : 'Delete'}
                </Button>
              </div>

              {/* Skills Tags */}
              <div>
                <span className="text-[11px] text-slate-500 font-medium block mb-1.5">
                  Extracted Technical Skills:
                </span>
                {extractedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {extractedSkills.map((sk, idx) => {
                      const name = typeof sk === 'string' ? sk : sk.name || sk.skillName;
                      return (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Skills have been parsed into your candidate profile.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Job Description Matching Section */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Job Description Match Analyzer
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paste target job requirements to calculate keyword skill overlap and identify gaps.
            </p>

            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste job description text here (e.g. 'Looking for a Senior Full-Stack Engineer with React, Node.js, Docker, MySQL, Redis, and AWS experience')..."
              rows={4}
              className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <div className="flex justify-end">
              <Button
                onClick={handleMatchJob}
                disabled={!jobDescription.trim() || matching}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs"
              >
                {matching ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                    Calculating Match...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Analyze Match Score
                  </>
                )}
              </Button>
            </div>

            {/* Match Results Display */}
            {matchResult && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Match Compatibility
                    </span>
                    <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      {matchResult.matchScore}%
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{matchResult.matchedCount} of {matchResult.totalRequired} skills matched</div>
                  </div>
                </div>

                {/* Matching Skills */}
                {matchResult.matchedSkills?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">
                      Matching Skills Found:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {matchResult.matchedSkills.map((sk, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[11px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Skills */}
                {matchResult.missingSkills?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 block mb-1">
                      Missing / Recommended Skills:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {matchResult.missingSkills.map((sk, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[11px] bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advisory Note */}
                <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800 italic">
                  {matchResult.advisoryNote}
                </p>
              </div>
            )}
          </div>
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
