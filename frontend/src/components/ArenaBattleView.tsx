import React, { useState, useEffect, useRef } from 'react';
import {
  Swords,
  Play,
  Send,
  RotateCcw,
  Clock,
  Trophy,
  CheckCircle2,
  XCircle,
  UserPlus,
  Flame,
  Zap,
  Code,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Bot
} from 'lucide-react';
import type { Match, Problem, User, JudgeVerdict } from '../types';
import { api } from '../services/api';

interface ArenaBattleViewProps {
  currentUser: User | null;
  users: User[];
  onRefreshUsers: () => void;
}

export const ArenaBattleView: React.FC<ArenaBattleViewProps> = ({
  currentUser,
  users,
  onRefreshUsers,
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Match room creation state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createProblemId, setCreateProblemId] = useState<string>('');
  const [createDuration, setCreateDuration] = useState<number>(900);
  const [creating, setCreating] = useState<boolean>(false);

  // In-match editor state
  const [code, setCode] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [runningTests, setRunningTests] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [verdict, setVerdict] = useState<JudgeVerdict | null>(null);
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [matchEvents, setMatchEvents] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(900);
  const [victoryModalOpen, setVictoryModalOpen] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load matches and problems on mount
  const loadArenaData = async () => {
    setLoading(true);
    try {
      const [matchesRes, problemsRes] = await Promise.all([
        api.getMatches(),
        api.getProblems(),
      ]);
      if (matchesRes.success) setMatches(matchesRes.data);
      if (problemsRes.success) {
        setProblems(problemsRes.data);
        if (problemsRes.data.length > 0 && !createProblemId) {
          setCreateProblemId(problemsRes.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load arena data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArenaData();
  }, []);

  // When a match is selected, load its details and initialize code
  const enterMatch = async (matchCode: string) => {
    try {
      const res = await api.getMatch(matchCode);
      if (res.success) {
        setSelectedMatch(res.data);
        setCode(res.data.problem.starterCode);
        setVerdict(null);
        setSelectedTestCaseIndex(0);
        setTimeLeft(res.data.durationSeconds || 900);
        setMatchEvents([
          `Match ${res.data.code} initialized.`,
          `Problem: ${res.data.problem.title} (${res.data.problem.difficulty})`,
          res.data.player2
            ? `Challenger ${res.data.player2.username} is connected.`
            : 'Waiting for challenger to join...',
        ]);
        if (res.data.status === 'COMPLETED') {
          setVictoryModalOpen(true);
        } else {
          setVictoryModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch match:', err);
    }
  };

  // Timer effect for active match
  useEffect(() => {
    if (selectedMatch && selectedMatch.status === 'IN_PROGRESS') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedMatch]);

  // Host new match
  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setCreating(true);
    try {
      const res = await api.createMatch({
        problemId: createProblemId,
        player1Username: currentUser.username,
        durationSeconds: createDuration,
      });
      if (res.success) {
        setShowCreateModal(false);
        await loadArenaData();
        enterMatch(res.data.code);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create match');
    } finally {
      setCreating(false);
    }
  };

  // Join match as player 2
  const handleJoinMatch = async (matchCode: string) => {
    if (!currentUser) return;
    try {
      const res = await api.joinMatch(matchCode, currentUser.username);
      if (res.success) {
        await loadArenaData();
        enterMatch(matchCode);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to join match');
    }
  };

  // Quick Match: Find waiting match or create one
  const handleQuickMatch = async () => {
    if (!currentUser) return;
    const waitingMatch = matches.find((m) => m.status === 'WAITING' && m.player1?.username !== currentUser.username);
    if (waitingMatch) {
      handleJoinMatch(waitingMatch.code);
    } else {
      // Create match and join
      const problem = problems[Math.floor(Math.random() * problems.length)];
      if (!problem) return;
      try {
        const res = await api.createMatch({
          problemId: problem.id,
          player1Username: currentUser.username,
          durationSeconds: 900,
        });
        if (res.success) {
          await loadArenaData();
          enterMatch(res.data.code);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Bot challenger simulator
  const handleSimulateBotOpponent = async () => {
    if (!selectedMatch || !currentUser) return;
    // Find an alternate user to join
    const opponent = users.find((u) => u.username !== currentUser.username) || {
      username: 'sophia_code',
    };

    try {
      const joinRes = await api.joinMatch(selectedMatch.code, opponent.username);
      if (joinRes.success) {
        setSelectedMatch((prev) => {
          if (!prev) return joinRes.data;
          return {
            ...prev,
            ...joinRes.data,
            player1: joinRes.data.player1 || prev.player1,
            player2: joinRes.data.player2 || prev.player2,
            problem: joinRes.data.problem || prev.problem,
          };
        });
        setMatchEvents((prev) => [
          ...prev,
          `Opponent @${opponent.username} entered the arena! Duel commenced.`,
        ]);
        await loadArenaData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run tests locally without final submission
  const handleRunTests = async () => {
    if (!selectedMatch) return;
    setRunningTests(true);
    try {
      const res = await api.runProblemCode(selectedMatch.problem.slug, code);
      if (res.success) {
        setVerdict(res.verdict);
        setSelectedTestCaseIndex(0);
        setMatchEvents((prev) => [
          ...prev,
          `Ran tests: ${res.verdict.passedCount}/${res.verdict.totalCount} passed in ${res.verdict.runtimeMs}ms.`,
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunningTests(false);
    }
  };

  // Submit code to official judge for match evaluation
  const handleSubmitCode = async () => {
    if (!selectedMatch || !currentUser) return;
    setSubmitting(true);
    try {
      const res = await api.submitMatchCode(selectedMatch.code, {
        username: currentUser.username,
        codeContent: code,
        language: selectedLanguage,
      });

      if (res.success) {
        setVerdict(res.verdict);
        setSelectedTestCaseIndex(0);
        setSelectedMatch((prev) => {
          if (!prev) return res.match;
          return {
            ...prev,
            ...res.match,
            player1: res.match.player1 || prev.player1,
            player2: res.match.player2 || prev.player2,
            problem: res.match.problem || prev.problem,
          };
        });

        if (res.verdict.status === 'ACCEPTED') {
          setVictoryModalOpen(true);
          setMatchEvents((prev) => [
            ...prev,
            `🎉 ACCEPTED! @${currentUser.username} submitted full solution and claimed victory!`,
          ]);
          onRefreshUsers();
        } else {
          setMatchEvents((prev) => [
            ...prev,
            `Submission: ${res.verdict.status} (${res.verdict.passedCount}/${res.verdict.totalCount} tests passed)`,
          ]);
        }
        await loadArenaData();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Copy code helper
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // RENDER: LOBBY VIEW
  // ==========================================
  if (!selectedMatch) {
    return (
      <div className="arena-lobby-container">
        {/* Arena Header Banner */}
        <div className="arena-hero-banner">
          <div className="hero-banner-content">
            <div className="arena-badge-pill">
              <Zap size={14} className="text-amber" />
              <span>Real-Time Algorithmic 1v1 Battle Arena</span>
            </div>
            <h1 className="arena-title">
              Live Code Duels &amp; <span className="text-gradient">Ranked Battles</span>
            </h1>
            <p className="arena-description">
              Go head-to-head against fellow developers in timed programming matches. Write code,
              pass automated test suites, and climb the global ELO ladder.
            </p>

            <div className="arena-action-row">
              <button className="btn-primary-action" onClick={handleQuickMatch}>
                <Swords size={18} />
                <span>Instant Quick Duel</span>
              </button>
              <button
                className="btn-secondary-action"
                onClick={() => setShowCreateModal(true)}
              >
                <UserPlus size={18} />
                <span>Host Custom Room</span>
              </button>
            </div>
          </div>

          <div className="hero-stats-card">
            <div className="hero-stat-item">
              <span className="stat-label">Rating Stakes</span>
              <span className="stat-value text-emerald">±25 ELO</span>
            </div>
            <div className="hero-stat-item">
              <span className="stat-label">Active Rooms</span>
              <span className="stat-value">{matches.length}</span>
            </div>
            <div className="hero-stat-item">
              <span className="stat-label">Languages</span>
              <span className="stat-value">JS / TS / Python</span>
            </div>
          </div>
        </div>

        {/* Active Arena Matches List */}
        <div className="arena-rooms-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-heading">Available Match Arenas</h2>
              <p className="section-subheading">
                Join an active duel or watch live head-to-head coding sessions
              </p>
            </div>
            <button className="btn-refresh" onClick={loadArenaData} disabled={loading}>
              <RotateCcw size={15} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="arena-loading-state">
              <div className="loading-spinner" />
              <span>Scanning live battle nodes...</span>
            </div>
          ) : matches.length === 0 ? (
            <div className="empty-rooms-card">
              <Swords size={48} className="empty-icon" />
              <h3>No Active Match Rooms</h3>
              <p>Be the first to create an arena match room or jump into a quick duel!</p>
              <button className="btn-primary-action" onClick={handleQuickMatch}>
                <Play size={16} /> Create Quick Duel
              </button>
            </div>
          ) : (
            <div className="arena-grid">
              {matches.map((m) => {
                const isWaiting = m.status === 'WAITING';
                const isLive = m.status === 'IN_PROGRESS';
                const isCompleted = m.status === 'COMPLETED';
                const canJoin = isWaiting && currentUser && m.player1?.username !== currentUser.username;

                return (
                  <div key={m.id} className={`arena-room-card ${m.status.toLowerCase()}`}>
                    <div className="room-card-header">
                      <span className="room-code-tag">{m.code}</span>
                      <span className={`match-status-badge ${m.status.toLowerCase()}`}>
                        {isLive && <span className="pulsing-dot" />}
                        {m.status}
                      </span>
                    </div>

                    <div className="room-problem-info">
                      <div className="problem-meta">
                        <span className={`diff-pill ${m.problem.difficulty.toLowerCase()}`}>
                          {m.problem.difficulty}
                        </span>
                        <span className="category-pill">{m.problem.category}</span>
                      </div>
                      <h3 className="room-problem-title">{m.problem.title}</h3>
                    </div>

                    {/* Players Matchup */}
                    <div className="room-matchup">
                      <div className="matchup-player">
                        {m.player1?.avatarUrl ? (
                          <img src={m.player1.avatarUrl} alt={m.player1.username} className="player-avatar" />
                        ) : (
                          <div className="player-avatar-fallback">{m.player1?.username?.[0] || 'H'}</div>
                        )}
                        <div className="player-meta">
                          <span className="player-name">{m.player1?.name || m.player1?.username || 'Host Player'}</span>
                          <span className="player-rating">{m.player1?.arenaRating ?? 1200} ELO</span>
                        </div>
                      </div>

                      <div className="vs-badge">VS</div>

                      <div className="matchup-player opponent">
                        {m.player2 ? (
                          <>
                            {m.player2.avatarUrl ? (
                              <img src={m.player2.avatarUrl} alt={m.player2.username} className="player-avatar" />
                            ) : (
                              <div className="player-avatar-fallback">{m.player2.username?.[0] || 'O'}</div>
                            )}
                            <div className="player-meta">
                              <span className="player-name">{m.player2.name || m.player2.username}</span>
                              <span className="player-rating">{m.player2.arenaRating ?? 1200} ELO</span>
                            </div>
                          </>
                        ) : (
                          <div className="waiting-player-placeholder">
                            <span className="pulse-text">Waiting for challenger...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="room-footer">
                      <div className="duration-tag">
                        <Clock size={14} />
                        <span>{Math.round(m.durationSeconds / 60)} mins</span>
                      </div>

                      <div className="room-actions">
                        {canJoin ? (
                          <button
                            className="btn-join-match"
                            onClick={() => handleJoinMatch(m.code)}
                          >
                            <span>Accept Duel</span>
                            <ChevronRight size={16} />
                          </button>
                        ) : (
                          <button
                            className="btn-enter-match"
                            onClick={() => enterMatch(m.code)}
                          >
                            <span>{isCompleted ? 'View Results' : 'Enter Arena'}</span>
                            <ChevronRight size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Host Custom Match Room */}
        {showCreateModal && (
          <div className="modal-backdrop">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Host Custom 1v1 Arena</h3>
                <button className="btn-close-modal" onClick={() => setShowCreateModal(false)}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateMatch}>
                <div className="form-group">
                  <label>Select Challenge Problem</label>
                  <select
                    className="select-field"
                    value={createProblemId}
                    onChange={(e) => setCreateProblemId(e.target.value)}
                    required
                  >
                    {problems.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.difficulty} - {p.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Match Duration Limit</label>
                  <div className="duration-picker">
                    {[300, 600, 900, 1200].map((sec) => (
                      <button
                        type="button"
                        key={sec}
                        className={`btn-pill-choice ${createDuration === sec ? 'active' : ''}`}
                        onClick={() => setCreateDuration(sec)}
                      >
                        {sec / 60} Minutes
                      </button>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-create-submit" disabled={creating}>
                    {creating ? 'Spinning up Arena...' : 'Create Arena Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: ACTIVE DUEL ARENA VIEW
  // ==========================================
  const hostPlayer = selectedMatch.player1 || {
    id: selectedMatch.player1Id || 'p1',
    username: 'Host',
    name: 'Host Player',
    arenaRating: 1200,
    ratingTier: 'Novice',
    avatarUrl: null,
  };
  const opponentPlayer = selectedMatch.player2;
  const isHost = currentUser?.username === hostPlayer.username;
  const isMatchFinished = selectedMatch.status === 'COMPLETED';
  const winner = selectedMatch.winnerId
    ? selectedMatch.winnerId === hostPlayer.id
      ? hostPlayer
      : opponentPlayer
    : null;

  return (
    <div className="arena-live-workspace">
      {/* Top Match Arena Bar */}
      <div className="live-arena-navbar">
        <div className="live-nav-left">
          <button className="btn-back-lobby" onClick={() => setSelectedMatch(null)}>
            <ArrowLeft size={16} />
            <span>Lobby</span>
          </button>
          <div className="match-title-wrap">
            <span className="match-code-badge">{selectedMatch.code}</span>
            <h2 className="match-problem-heading">{selectedMatch.problem?.title || 'Arena Problem'}</h2>
            {selectedMatch.problem?.difficulty && (
              <span className={`diff-pill ${selectedMatch.problem.difficulty.toLowerCase()}`}>
                {selectedMatch.problem.difficulty}
              </span>
            )}
          </div>
        </div>

        {/* Live Countdown Timer */}
        <div className={`live-timer-chip ${timeLeft < 180 ? 'urgent' : ''}`}>
          <Clock size={16} className="timer-icon" />
          <span className="timer-clock">{formatTime(timeLeft)}</span>
        </div>

        <div className="live-nav-right">
          {!opponentPlayer && selectedMatch.status === 'WAITING' && (
            <button
              className="btn-bot-challenge"
              onClick={handleSimulateBotOpponent}
              title="Spawn simulated opponent for practice duel"
            >
              <Bot size={16} />
              <span>Invite AI Opponent</span>
            </button>
          )}

          <div className={`match-status-tag ${selectedMatch.status.toLowerCase()}`}>
            {selectedMatch.status === 'IN_PROGRESS' ? 'LIVE DUEL' : selectedMatch.status}
          </div>
        </div>
      </div>

      {/* Head-to-Head Duel Scoreboard */}
      <div className="duel-scoreboard">
        {/* Player 1 Card */}
        <div className={`scoreboard-player-card ${winner?.id === hostPlayer.id ? 'victor' : ''}`}>
          {hostPlayer.avatarUrl ? (
            <img src={hostPlayer.avatarUrl} alt={hostPlayer.username} className="sb-avatar" />
          ) : (
            <div className="sb-avatar-fallback">{hostPlayer.username?.[0] || 'H'}</div>
          )}
          <div className="sb-info">
            <div className="sb-name-row">
              <span className="sb-player-name">{hostPlayer.name || hostPlayer.username}</span>
              {isHost && <span className="sb-host-badge">YOU</span>}
            </div>
            <span className="sb-tier-label">{hostPlayer.ratingTier || 'Novice'} • {hostPlayer.arenaRating ?? 1200} ELO</span>
          </div>
          <div className="sb-score-badge">
            <span className="score-val">{selectedMatch.player1Score ?? 0}</span>
            <span className="score-lbl">PTS</span>
          </div>
        </div>

        {/* VS Badge */}
        <div className="scoreboard-vs">
          <div className="vs-swords-ring">
            <Swords size={20} className="swords-icon" />
          </div>
          <span className="vs-tag">1v1 DUEL</span>
        </div>

        {/* Player 2 Card */}
        <div className={`scoreboard-player-card opponent ${winner?.id === opponentPlayer?.id ? 'victor' : ''}`}>
          {opponentPlayer ? (
            <>
              <div className="sb-score-badge">
                <span className="score-val">{selectedMatch.player2Score ?? 0}</span>
                <span className="score-lbl">PTS</span>
              </div>
              <div className="sb-info text-right">
                <div className="sb-name-row justify-end">
                  {!isHost && currentUser?.username === opponentPlayer.username && (
                    <span className="sb-host-badge">YOU</span>
                  )}
                  <span className="sb-player-name">{opponentPlayer.name || opponentPlayer.username}</span>
                </div>
                <span className="sb-tier-label">{opponentPlayer.ratingTier || 'Novice'} • {opponentPlayer.arenaRating ?? 1200} ELO</span>
              </div>
              {opponentPlayer.avatarUrl ? (
                <img src={opponentPlayer.avatarUrl} alt={opponentPlayer.username} className="sb-avatar" />
              ) : (
                <div className="sb-avatar-fallback">{opponentPlayer.username?.[0] || 'O'}</div>
              )}
            </>
          ) : (
            <div className="waiting-opponent-banner">
              <span className="pulse-dot-cyan" />
              <span>Waiting for Opponent to Enter Arena...</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Dual Workspace: Problem Description vs Code Editor */}
      <div className="arena-split-layout">
        {/* Left Column: Problem Details & Event Feed */}
        <div className="arena-left-pane">
          <div className="problem-sheet">
            <div className="sheet-header">
              <div className="category-tag">{selectedMatch.problem.category}</div>
              <div className="sheet-metrics">
                <span>Time Limit: {selectedMatch.problem.timeLimitMs}ms</span>
                <span>•</span>
                <span>Acceptance: {selectedMatch.problem.acceptanceRate}%</span>
              </div>
            </div>

            <div className="problem-text-content">
              <h3>Problem Description</h3>
              <p className="problem-desc-paragraph">{selectedMatch.problem.description}</p>
            </div>

            {/* Live Arena Events Feed */}
            <div className="arena-events-feed">
              <h4 className="events-title">
                <Flame size={14} className="text-amber" /> Live Arena Feed
              </h4>
              <div className="events-list">
                {matchEvents.map((evt, idx) => (
                  <div key={idx} className="event-item">
                    <span className="event-bullet">•</span>
                    <span>{evt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor & Execution Arena */}
        <div className="arena-right-pane">
          <div className="code-editor-wrapper">
            {/* Editor Toolbar */}
            <div className="editor-toolbar">
              <div className="toolbar-left">
                <Code size={16} className="text-cyan" />
                <select
                  className="language-selector"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                  <option value="javascript">JavaScript (ES2024)</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python 3</option>
                </select>
              </div>

              <div className="toolbar-right">
                <button
                  className="toolbar-btn"
                  onClick={handleCopyCode}
                  title="Copy code to clipboard"
                >
                  {copiedCode ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  className="toolbar-btn"
                  onClick={() => setCode(selectedMatch.problem.starterCode)}
                  title="Reset to starter code"
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Code Textarea Area */}
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
                placeholder="Write your solution here..."
              />
            </div>

            {/* Editor Action Footer */}
            <div className="editor-footer-actions">
              <div className="action-hint">
                <Zap size={14} className="text-amber" />
                <span>Runs securely in backend VM container</span>
              </div>

              <div className="action-btn-group">
                <button
                  className="btn-run-tests"
                  onClick={handleRunTests}
                  disabled={runningTests || submitting || isMatchFinished}
                >
                  <Play size={16} />
                  <span>{runningTests ? 'Running...' : 'Run Tests'}</span>
                </button>

                <button
                  className="btn-submit-solution"
                  onClick={handleSubmitCode}
                  disabled={submitting || runningTests || isMatchFinished}
                >
                  <Send size={16} />
                  <span>{submitting ? 'Judging...' : 'Submit Solution'}</span>
                </button>
              </div>
            </div>

            {/* Test Case Verdict Drawer */}
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

                {/* Test cases tabs */}
                {verdict.results.length > 0 && (
                  <div className="test-cases-tabs">
                    <div className="tabs-header">
                      {verdict.results.map((r, idx) => (
                        <button
                          key={idx}
                          className={`tc-tab-btn ${selectedTestCaseIndex === idx ? 'active' : ''} ${
                            r.passed ? 'passed' : 'failed'
                          }`}
                          onClick={() => setSelectedTestCaseIndex(idx)}
                        >
                          {r.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>Case {r.testIndex}</span>
                        </button>
                      ))}
                    </div>

                    {verdict.results[selectedTestCaseIndex] && (
                      <div className="tc-details-box">
                        <div className="io-group">
                          <label>Input:</label>
                          <pre>{JSON.stringify(verdict.results[selectedTestCaseIndex].input, null, 2)}</pre>
                        </div>
                        <div className="io-group">
                          <label>Expected:</label>
                          <pre>{JSON.stringify(verdict.results[selectedTestCaseIndex].expected, null, 2)}</pre>
                        </div>
                        <div className="io-group">
                          <label>Output:</label>
                          <pre className={verdict.results[selectedTestCaseIndex].passed ? 'text-emerald' : 'text-rose'}>
                            {verdict.results[selectedTestCaseIndex].actual !== undefined
                              ? JSON.stringify(verdict.results[selectedTestCaseIndex].actual, null, 2)
                              : verdict.results[selectedTestCaseIndex].error || 'None'}
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

      {/* Victory Celebration Modal */}
      {victoryModalOpen && (
        <div className="modal-backdrop">
          <div className="victory-modal-card">
            <div className="victory-halo-glow" />
            <Trophy size={64} className="trophy-victory-icon" />

            <h2 className="victory-title">VICTORY CLAIMED!</h2>
            <p className="victory-subtitle">
              {winner?.username === currentUser?.username
                ? 'Outstanding performance! You conquered this arena match.'
                : `@${winner?.username || 'Winner'} solved all test cases first!`}
            </p>

            <div className="victory-stat-grid">
              <div className="v-stat-box">
                <span className="v-label">Rating Change</span>
                <span className="v-val text-emerald">+25 ELO</span>
              </div>
              <div className="v-stat-box">
                <span className="v-label">Tests Passed</span>
                <span className="v-val">
                  {verdict?.passedCount ?? selectedMatch.problem.testCases ? '100%' : 'All'}
                </span>
              </div>
              <div className="v-stat-box">
                <span className="v-label">Match Status</span>
                <span className="v-val text-cyan">COMPLETED</span>
              </div>
            </div>

            <div className="victory-actions">
              <button
                className="btn-primary-action"
                onClick={() => {
                  setVictoryModalOpen(false);
                  setSelectedMatch(null);
                  loadArenaData();
                }}
              >
                Back to Arena Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
