import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Code2,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Send,
  Zap,
  ChevronRight,
  ArrowLeft,
  Search,
  Filter,
} from 'lucide-react';
import type { Problem, User, JudgeVerdict } from '../types';
import { api } from '../services/api';
import { SUPPORTED_LANGUAGES, getStarterCode } from '../utils/starterTemplates';
import { renderMarkdown } from '../utils/markdown';
import { useToast } from './Toast';
import { CodeEditor } from './CodeEditor';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';

interface ProblemsViewProps {
  onChallengeProblem?: (problemId: string) => void;
  currentUser?: User | null;
  theme?: 'dark' | 'light';
}

export const ProblemsView: React.FC<ProblemsViewProps> = ({
  onChallengeProblem,
  currentUser,
  theme = 'dark',
}) => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'default' | 'acceptance_desc' | 'acceptance_asc' | 'title_asc'>('default');

  // Problem Studio (Solving mode)
  const [activeProblem, setActiveProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [verdict, setVerdict] = useState<JudgeVerdict | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<'statement' | 'submissions'>('statement');

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const res = await api.getProblems();
      if (res.success) {
        setProblems(res.data);
      }
    } catch (err) {
      console.error('Failed to load problems:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  // Handle URL deep linking via route parameter /problems/:slug
  useEffect(() => {
    if (slug && problems.length > 0) {
      const found = problems.find((p) => p.slug === slug);
      if (found) {
        handleOpenProblem(found);
      }
    }
  }, [slug, problems]);

  const handleOpenProblem = (problem: Problem) => {
    setActiveProblem(problem);
    const initialLang = 'javascript';
    setSelectedLanguage(initialLang);
    const starter = getStarterCode(problem.title, initialLang);
    setCode(starter);
    setCodeByLanguage({ [initialLang]: starter });
    setVerdict(null);
    setSelectedTab('statement');
  };

  const handleBackToList = () => {
    setActiveProblem(null);
    setVerdict(null);
    navigate('/problems');
  };

  const handleLanguageChange = (lang: string) => {
    if (!activeProblem) return;
    setCodeByLanguage((prev) => ({
      ...prev,
      [selectedLanguage]: code,
    }));

    setSelectedLanguage(lang);
    if (codeByLanguage[lang]) {
      setCode(codeByLanguage[lang]);
    } else {
      const starter = getStarterCode(activeProblem.title, lang);
      setCode(starter);
      setCodeByLanguage((prev) => ({
        ...prev,
        [lang]: starter,
      }));
    }
  };

  const handleResetCode = () => {
    if (!activeProblem) return;
    const starter = getStarterCode(activeProblem.title, selectedLanguage);
    setCode(starter);
    setCodeByLanguage((prev) => ({
      ...prev,
      [selectedLanguage]: starter,
    }));
    showToast('Code reset to default starter template', 'info');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    showToast('Code copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCode = async () => {
    if (!activeProblem || running || submitting) return;
    setRunning(true);
    setVerdict(null);

    try {
      const res = await api.runProblemCode(activeProblem.slug, code, selectedLanguage);
      if (res.success) {
        setVerdict(res.data);
        if (res.data.status === 'ACCEPTED') {
          showToast('Sample test cases passed!', 'success');
        } else {
          showToast(`Result: ${res.data.status}`, 'error');
        }
      }
    } catch (err) {
      console.error('Execution error:', err);
      showToast('Execution error. Please check your syntax.', 'error');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!activeProblem || submitting || running) return;
    setSubmitting(true);

    try {
      const res = await api.submitProblemCode(activeProblem.slug, {
        code,
        language: selectedLanguage,
        username: currentUser?.username || 'anonymous',
      });

      if (res.success) {
        setVerdict(res.data.verdict);
        if (res.data.verdict.status === 'ACCEPTED') {
          showToast('Accepted! All test cases passed.', 'success');
        } else {
          showToast(`Verdict: ${res.data.verdict.status}`, 'error');
        }
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      showToast(err.message || 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter & sort problems
  const filteredProblems = problems
    .filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchesDiff = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty;
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesDiff && matchesCat;
    })
    .sort((a, b) => {
      if (sortBy === 'acceptance_desc') return b.acceptanceRate - a.acceptanceRate;
      if (sortBy === 'acceptance_asc') return a.acceptanceRate - b.acceptanceRate;
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
      return 0;
    });

  const categories = ['All', ...Array.from(new Set(problems.map((p) => p.category)))];

  // ==========================================
  // VIEW 1: PROBLEM STUDIO (SOLVER)
  // ==========================================
  if (activeProblem) {
    return (
      <div className="problem-studio-view">
        {/* Studio Top Navbar */}
        <div className="studio-header">
          <div className="studio-header-left">
            <button className="btn-back" onClick={handleBackToList}>
              <ArrowLeft size={16} />
              <span>Catalog</span>
            </button>
            <div className="studio-problem-meta">
              <h2>{activeProblem.title}</h2>
              <span className={`badge-difficulty diff-${activeProblem.difficulty.toLowerCase()}`}>
                {activeProblem.difficulty}
              </span>
              <span className="badge-category">{activeProblem.category}</span>
            </div>
          </div>

          <div className="studio-header-right">
            {onChallengeProblem && (
              <button
                className="btn-challenge"
                onClick={() => onChallengeProblem(activeProblem.id)}
              >
                <Zap size={14} />
                <span>Duel on Problem</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Split: Problem Statement & Code Studio */}
        <div className="studio-split-container">
          {/* Left Column: Problem Details */}
          <div className="studio-left-panel">
            <div className="studio-panel-tabs">
              <button
                className={`panel-tab ${selectedTab === 'statement' ? 'active' : ''}`}
                onClick={() => setSelectedTab('statement')}
              >
                Description
              </button>
              <button
                className={`panel-tab ${selectedTab === 'submissions' ? 'active' : ''}`}
                onClick={() => setSelectedTab('submissions')}
              >
                Submissions
              </button>
            </div>

            <div className="studio-panel-content">
              {selectedTab === 'statement' ? (
                <div className="problem-statement-body">
                  <div
                    className="markdown-content"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(activeProblem.description) }}
                  />

                  <div className="problem-constraints-box">
                    <h4>Constraints & Limits</h4>
                    <ul>
                      <li>Time Limit: {activeProblem.timeLimitMs}ms</li>
                      <li>Memory Limit: {activeProblem.memoryLimitMb}MB</li>
                      <li>Acceptance Rate: {activeProblem.acceptanceRate}%</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="problem-submissions-tab">
                  <p className="tab-subtitle">Past attempts for this problem</p>
                  <EmptyState title="No prior submissions" description="Run your code or submit a solution to see submission history." />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Code Editor & Execution Panel */}
          <div className="studio-right-panel">
            <div className="studio-editor-toolbar">
              <div className="toolbar-left">
                <label className="editor-lang-label">Language:</label>
                <select
                  className="lang-select"
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="toolbar-right">
                <button className="toolbar-btn" onClick={handleCopy}>
                  {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button className="toolbar-btn" onClick={handleResetCode}>
                  <RotateCcw size={14} />
                  <span>Reset Code</span>
                </button>
              </div>
            </div>

            {/* Monaco Code Editor */}
            <div className="code-canvas-container" style={{ minHeight: '440px', height: '440px', padding: 0 }}>
              <CodeEditor
                code={code}
                onChange={setCode}
                language={selectedLanguage}
                theme={theme}
                onRunTests={handleRunCode}
                onSubmitCode={handleSubmitSolution}
              />
            </div>

            <div className="editor-footer-actions">
              <div className="action-hint">
                <Zap size={14} className="text-amber" />
                <span>Runs securely in backend VM container (Ctrl+Enter to run, Ctrl+Shift+Enter to submit)</span>
              </div>
              <div className="action-btn-group">
                <button
                  className="btn-run-tests"
                  onClick={handleRunCode}
                  disabled={running || submitting}
                >
                  <Play size={16} />
                  <span>{running ? 'Evaluating...' : 'Run Test Cases'}</span>
                </button>
                <button
                  className="btn-submit-solution"
                  onClick={handleSubmitSolution}
                  disabled={submitting || running}
                >
                  <Send size={16} />
                  <span>{submitting ? 'Submitting...' : 'Submit Solution'}</span>
                </button>
              </div>
            </div>

            {/* Execution Verdict & Output Drawer */}
            {verdict && (
              <div className={`verdict-output-tray verdict-${verdict.status.toLowerCase()}`}>
                <div className="verdict-tray-header">
                  <div className="verdict-title-group">
                    {verdict.status === 'ACCEPTED' ? (
                      <CheckCircle2 size={18} className="text-emerald" />
                    ) : (
                      <XCircle size={18} className="text-rose" />
                    )}
                    <span className="verdict-status-title">{verdict.status}</span>
                  </div>
                  <div className="verdict-meta-stats">
                    <span>
                      Passed: {verdict.passedCount} / {verdict.totalCount}
                    </span>
                    <span>Runtime: {verdict.runtimeMs}ms</span>
                  </div>
                </div>

                <div className="verdict-tray-body">
                  {verdict.results?.map((res, i) => (
                    <div key={i} className={`testcase-row ${res.passed ? 'passed' : 'failed'}`}>
                      <div className="tc-header">
                        <span className="tc-tag">Case {i + 1}</span>
                        <span className={`tc-status ${res.passed ? 'text-emerald' : 'text-rose'}`}>
                          {res.passed ? 'PASSED' : 'FAILED'}
                        </span>
                        <span className="tc-runtime">{res.runtimeMs}ms</span>
                      </div>
                      <div className="tc-details">
                        <div className="tc-block">
                          <span className="tc-label">Input:</span>
                          <pre>{JSON.stringify(res.input)}</pre>
                        </div>
                        <div className="tc-block">
                          <span className="tc-label">Expected:</span>
                          <pre>{JSON.stringify(res.expected)}</pre>
                        </div>
                        {!res.passed && res.actual !== undefined && (
                          <div className="tc-block">
                            <span className="tc-label text-rose">Your Output:</span>
                            <pre>{JSON.stringify(res.actual)}</pre>
                          </div>
                        )}
                        {res.error && (
                          <div className="tc-block tc-error-msg">
                            <span className="tc-label text-rose">Error:</span>
                            <pre>{res.error}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: PROBLEM CATALOG
  // ==========================================
  return (
    <div className="problems-catalog-container">
      {/* Header Banner */}
      <div className="catalog-header-banner">
        <div className="banner-title-block">
          <div className="banner-icon-wrap">
            <Code2 size={24} />
          </div>
          <div>
            <h1>Problem Studio</h1>
            <p>Master algorithmic patterns across Arrays, Trees, Dynamic Programming, and Graph theory.</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="catalog-filter-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search problems by name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filters-group">
            <div className="filter-select-wrap">
              <Filter size={14} />
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="filter-select-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrap">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="default">Default Order</option>
                <option value="acceptance_desc">Highest Acceptance</option>
                <option value="acceptance_asc">Lowest Acceptance</option>
                <option value="title_asc">Title (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="catalog-table-card">
        {loading ? (
          <div style={{ padding: '2rem' }}>
            <SkeletonLoader type="table-row" rows={6} />
          </div>
        ) : filteredProblems.length === 0 ? (
          <EmptyState
            title="No problems matched your query"
            description="Try clearing your search terms or selecting 'All' from the difficulty and category filters."
            actionText="Clear Filters"
            onAction={() => {
              setSearch('');
              setSelectedDifficulty('All');
              setSelectedCategory('All');
            }}
          />
        ) : (
          <table className="problems-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Problem Title</th>
                <th style={{ width: '20%' }}>Category</th>
                <th style={{ width: '15%' }}>Difficulty</th>
                <th style={{ width: '15%' }}>Acceptance</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProblems.map((problem) => (
                <tr
                  key={problem.id}
                  className="problem-row"
                  onClick={() => {
                    navigate(`/problems/${problem.slug}`);
                    handleOpenProblem(problem);
                  }}
                >
                  <td className="title-cell">
                    <span className="problem-title">{problem.title}</span>
                  </td>
                  <td>
                    <span className="category-pill">{problem.category}</span>
                  </td>
                  <td>
                    <span className={`badge-difficulty diff-${problem.difficulty.toLowerCase()}`}>
                      {problem.difficulty}
                    </span>
                  </td>
                  <td>
                    <div className="acceptance-bar-wrap">
                      <span className="acceptance-rate">{problem.acceptanceRate}%</span>
                      <div className="acceptance-bar-track">
                        <div
                          className="acceptance-bar-fill"
                          style={{ width: `${problem.acceptanceRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-solve-pill"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/problems/${problem.slug}`);
                        handleOpenProblem(problem);
                      }}
                    >
                      <span>Solve</span>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
