import React, { useState, useEffect } from 'react';
import {
  Code2,
  Search,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Swords,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import type { Problem, JudgeVerdict } from '../types';
import { api } from '../services/api';
import { SUPPORTED_LANGUAGES, getStarterCode } from '../utils/starterTemplates';

interface ProblemsViewProps {
  onChallengeProblem?: (problemId: string) => void;
}

export const ProblemsView: React.FC<ProblemsViewProps> = ({
  onChallengeProblem,
}) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Problem Studio (Solving mode)
  const [activeProblem, setActiveProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<boolean>(false);
  const [verdict, setVerdict] = useState<JudgeVerdict | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedCaseIdx, setSelectedCaseIdx] = useState<number>(0);

  const categories = [
    'All',
    'Arrays & Hashing',
    'Stack',
    'Sliding Window',
    'Two Pointers',
    'Dynamic Programming',
    'Trees',
  ];

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const res = await api.getProblems({
        difficulty: selectedDifficulty,
        category: selectedCategory,
        search: search.trim(),
      });
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
  }, [selectedDifficulty, selectedCategory, search]);

  const openStudio = async (problem: Problem) => {
    try {
      const full = await api.getProblem(problem.slug);
      if (full.success) {
        setActiveProblem(full.data);
        const starter = getStarterCode(full.data.slug, selectedLanguage, full.data.starterCode);
        setCode(starter);
        setCodeByLanguage({ [selectedLanguage]: starter });
        setVerdict(null);
        setSelectedCaseIdx(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setCodeByLanguage((prev) => ({ ...prev, [selectedLanguage]: code }));
    setSelectedLanguage(newLang);

    if (codeByLanguage[newLang]) {
      setCode(codeByLanguage[newLang]);
    } else if (activeProblem) {
      const newStarter = getStarterCode(activeProblem.slug, newLang, activeProblem.starterCode);
      setCode(newStarter);
      setCodeByLanguage((prev) => ({ ...prev, [newLang]: newStarter }));
    }
  };

  const handleResetCode = () => {
    if (activeProblem) {
      const starter = getStarterCode(activeProblem.slug, selectedLanguage, activeProblem.starterCode);
      setCode(starter);
      setCodeByLanguage((prev) => ({ ...prev, [selectedLanguage]: starter }));
    }
  };

  const handleRunCode = async () => {
    if (!activeProblem) return;
    setRunning(true);
    try {
      const res = await api.runProblemCode(activeProblem.slug, code, selectedLanguage);
      if (res.success) {
        setVerdict(res.verdict);
        setSelectedCaseIdx(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If inside Problem Studio
  if (activeProblem) {
    return (
      <div className="problem-studio-wrapper">
        <div className="studio-top-bar">
          <button className="btn-back-lobby" onClick={() => setActiveProblem(null)}>
            <ArrowLeft size={16} />
            <span>Problem Catalog</span>
          </button>
          <div className="studio-title-group">
            <h2>{activeProblem.title}</h2>
            <span className={`diff-pill ${activeProblem.difficulty.toLowerCase()}`}>
              {activeProblem.difficulty}
            </span>
            <span className="category-pill">{activeProblem.category}</span>
          </div>

          <div className="studio-actions-right">
            {onChallengeProblem && (
              <button
                className="btn-challenge-friend"
                onClick={() => onChallengeProblem(activeProblem.id)}
              >
                <Swords size={16} />
                <span>Host 1v1 Battle on this Problem</span>
              </button>
            )}
          </div>
        </div>

        <div className="studio-main-grid">
          {/* Problem Specs */}
          <div className="studio-problem-desc">
            <div className="spec-meta-row">
              <span>Time Limit: {activeProblem.timeLimitMs}ms</span>
              <span>•</span>
              <span>Memory Limit: {activeProblem.memoryLimitMb}MB</span>
              <span>•</span>
              <span>Acceptance Rate: {activeProblem.acceptanceRate}%</span>
            </div>

            <div className="desc-body">
              <h3>Problem Statement</h3>
              <p>{activeProblem.description}</p>
            </div>
          </div>

          {/* Code Workspace */}
          <div className="studio-editor-pane">
            <div className="editor-toolbar">
              <div className="toolbar-left">
                <Code2 size={16} className="text-cyan" />
                <select
                  className="language-selector"
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
                <button
                  className="toolbar-btn"
                  onClick={handleResetCode}
                >
                  <RotateCcw size={14} />
                  <span>Reset Code</span>
                </button>
              </div>
            </div>

            <div className="code-canvas-container">
              <div className="code-line-numbers">
                {code.split('\n').map((_, i) => (
                  <span key={i} className="line-num">{i + 1}</span>
                ))}
              </div>
              <textarea
                className="code-textarea"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                rows={18}
              />
            </div>

            <div className="editor-footer-actions">
              <div className="action-hint">
                <Zap size={14} className="text-amber" />
                <span>Sandboxed in Node.js VM engine</span>
              </div>
              <button
                className="btn-run-tests"
                onClick={handleRunCode}
                disabled={running}
              >
                <Play size={16} />
                <span>{running ? 'Evaluating Code...' : 'Run Test Cases'}</span>
              </button>
            </div>

            {/* Verdict Output */}
            {verdict && (
              <div className={`verdict-panel ${verdict.status.toLowerCase()}`}>
                <div className="verdict-header">
                  <div className="verdict-status-title">
                    {verdict.status === 'ACCEPTED' ? (
                      <CheckCircle2 size={20} className="text-emerald" />
                    ) : (
                      <XCircle size={20} className="text-rose" />
                    )}
                    <span className="verdict-name">{verdict.status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="verdict-stats">
                    <span className="stat-passed">
                      {verdict.passedCount} / {verdict.totalCount} Passed
                    </span>
                    <span className="stat-runtime">
                      <Clock size={14} /> {verdict.runtimeMs}ms
                    </span>
                  </div>
                </div>

                <div className="verdict-msg">{verdict.message}</div>

                {verdict.results.length > 0 && (
                  <div className="test-cases-tabs">
                    <div className="tabs-header">
                      {verdict.results.map((r, idx) => (
                        <button
                          key={idx}
                          className={`tc-tab-btn ${selectedCaseIdx === idx ? 'active' : ''} ${
                            r.passed ? 'passed' : 'failed'
                          }`}
                          onClick={() => setSelectedCaseIdx(idx)}
                        >
                          {r.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>Case {r.testIndex}</span>
                        </button>
                      ))}
                    </div>

                    {verdict.results[selectedCaseIdx] && (
                      <div className="tc-details-box">
                        <div className="io-group">
                          <label>Input:</label>
                          <pre>{JSON.stringify(verdict.results[selectedCaseIdx].input, null, 2)}</pre>
                        </div>
                        <div className="io-group">
                          <label>Expected:</label>
                          <pre>{JSON.stringify(verdict.results[selectedCaseIdx].expected, null, 2)}</pre>
                        </div>
                        <div className="io-group">
                          <label>Actual Output:</label>
                          <pre className={verdict.results[selectedCaseIdx].passed ? 'text-emerald' : 'text-rose'}>
                            {verdict.results[selectedCaseIdx].actual !== undefined
                              ? JSON.stringify(verdict.results[selectedCaseIdx].actual, null, 2)
                              : verdict.results[selectedCaseIdx].error}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Catalog View
  return (
    <div className="problems-catalog-container">
      {/* Search and Filters Header */}
      <div className="catalog-header-card">
        <div className="catalog-title-group">
          <div className="pill-badge">
            <Sparkles size={14} className="text-cyan" />
            <span>Problem Bank</span>
          </div>
          <h1>Algorithmic Challenges &amp; Practice</h1>
          <p>
            Master foundational and advanced data structures. Test your solutions in real time or
            challenge rivals in 1v1 duels.
          </p>
        </div>

        <div className="filter-controls-row">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search problems by name or concept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="difficulty-pills">
            {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                className={`filter-diff-btn ${selectedDifficulty === diff ? 'active' : ''} ${diff.toLowerCase()}`}
                onClick={() => setSelectedDifficulty(diff)}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="category-scroll-row">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`cat-pill-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Grid / Table */}
      {loading ? (
        <div className="catalog-loading">
          <div className="loading-spinner" />
          <span>Fetching problem repository...</span>
        </div>
      ) : problems.length === 0 ? (
        <div className="empty-catalog-state">
          <Code2 size={40} className="text-dim" />
          <h3>No matching problems found</h3>
          <p>Try refining your search term or selecting a different category.</p>
        </div>
      ) : (
        <div className="problems-list-grid">
          {problems.map((problem) => (
            <div key={problem.id} className="problem-item-card">
              <div className="problem-top-row">
                <span className={`diff-pill ${problem.difficulty.toLowerCase()}`}>
                  {problem.difficulty}
                </span>
                <span className="category-pill">{problem.category}</span>
                <span className="acceptance-rate">
                  {problem.acceptanceRate}% Acceptance
                </span>
              </div>

              <h3 className="problem-title">{problem.title}</h3>
              <p className="problem-snippet">
                {problem.description.slice(0, 140)}...
              </p>

              <div className="problem-card-footer">
                <span className="problem-submissions-count">
                  {problem._count?.submissions ?? 0} Submissions
                </span>
                <div className="problem-btn-group">
                  {onChallengeProblem && (
                    <button
                      className="btn-mini-challenge"
                      onClick={() => onChallengeProblem(problem.id)}
                      title="Create 1v1 arena match with this problem"
                    >
                      <Swords size={14} />
                      <span>1v1 Duel</span>
                    </button>
                  )}
                  <button
                    className="btn-solve-card"
                    onClick={() => openStudio(problem)}
                  >
                    <Play size={14} />
                    <span>Solve Studio</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
