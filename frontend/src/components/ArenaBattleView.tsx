import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Bot,
  Volume2,
  VolumeX,
  MessageSquare,
  Shield,
  Radio,
} from 'lucide-react';
import type { Match, Problem, User, JudgeVerdict } from '../types';
import { api } from '../services/api';
import { SUPPORTED_LANGUAGES, getStarterCode } from '../utils/starterTemplates';
import { renderMarkdown } from '../utils/markdown';
import { playSuccessSound, playErrorSound, playVictorySound, playTickSound, soundSettings } from '../utils/sound';
import { useToast } from './Toast';
import { CodeEditor } from './CodeEditor';
import { useSocket } from '../hooks/useSocket';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';

interface ArenaBattleViewProps {
  currentUser: User | null;
  users: User[];
  onRefreshUsers: () => void;
  theme?: 'dark' | 'light';
}

export const ArenaBattleView: React.FC<ArenaBattleViewProps> = ({
  currentUser,
  onRefreshUsers,
  theme = 'dark',
}) => {
  const { code: routeMatchCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

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
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>({});
  const [runningTests, setRunningTests] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [verdict, setVerdict] = useState<JudgeVerdict | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [matchEvents, setMatchEvents] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(900);
  const [victoryModalOpen, setVictoryModalOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundSettings.isEnabled());
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; senderUsername?: string; username?: string; text: string; createdAt?: string }>>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [opponentProgress, setOpponentProgress] = useState<{ passedCount: number; totalCount: number; status: string } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Real-time WebSockets Hook
  const {
    isConnected: socketConnected,
    joinMatchRoom,
    leaveMatchRoom,
    sendChatMessage: socketSendMessage,
    onMatchStarted,
    onMatchProgress,
    onMatchConcluded,
    onChatMessage,
  } = useSocket();

  // Anti-Cheat Tracking Hook
  const isMatchActive = selectedMatch?.status === 'IN_PROGRESS';
  const { antiCheatStats, recordPaste } = useAntiCheat(
    selectedMatch?.code,
    currentUser?.username,
    isMatchActive
  );

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

  // Handle URL route deep-linking: /arena/:code
  useEffect(() => {
    if (routeMatchCode) {
      enterMatch(routeMatchCode);
    }
  }, [routeMatchCode]);

  // When a match is selected, join its room and load details
  const enterMatch = async (matchCode: string) => {
    try {
      const res = await api.getMatch(matchCode);
      if (res.success) {
        setSelectedMatch(res.data);
        const initialLang = selectedLanguage || 'javascript';
        const initialStarter = getStarterCode(res.data.problem.slug, initialLang, res.data.problem.starterCode);
        setCode(initialStarter);
        setCodeByLanguage({ [initialLang]: initialStarter });
        setVerdict(null);
        setTimeLeft(res.data.durationSeconds || 900);
        setMatchEvents([
          `Match ${res.data.code} initialized.`,
          `Problem: ${res.data.problem.title} (${res.data.problem.difficulty})`,
          res.data.player2
            ? `Challenger ${res.data.player2.username} is connected.`
            : 'Waiting for challenger to join...',
        ]);

        if (res.data.status === 'COMPLETED' || res.data.status === 'DRAW') {
          setVictoryModalOpen(true);
        } else {
          setVictoryModalOpen(false);
        }

        // Connect to Socket.IO match channel
        joinMatchRoom(matchCode, currentUser?.username);

        // Fetch past messages
        api.getMatchMessages(matchCode)
          .then((msgRes) => {
            if (msgRes.success) setChatMessages(msgRes.data);
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error('Failed to fetch match:', err);
      showToast('Could not load duel room', 'error');
    }
  };

  const handleExitMatch = () => {
    if (selectedMatch) {
      leaveMatchRoom(selectedMatch.code);
    }
    setSelectedMatch(null);
    setVerdict(null);
    navigate('/arena');
    loadArenaData();
  };

  // Socket.IO event listeners for live room state
  useEffect(() => {
    if (!selectedMatch) return;

    const cleanupStarted = onMatchStarted((data) => {
      setSelectedMatch((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
      setTimeLeft(data.durationSeconds || 900);
      setMatchEvents((prev) => [...prev, '⚔️ Duel Started! Timers synchronized with server.']);
      showToast('Match started! Good luck!', 'info');
    });

    const cleanupProgress = onMatchProgress((data) => {
      if (data.userId !== currentUser?.id) {
        setOpponentProgress({
          passedCount: data.passedCount,
          totalCount: data.totalCount,
          status: data.status,
        });
        setMatchEvents((prev) => [
          ...prev,
          `⚡ Opponent submission: Passed ${data.passedCount}/${data.totalCount} test cases (${data.status})`,
        ]);
      }
    });

    const cleanupConcluded = onMatchConcluded((data) => {
      setSelectedMatch((prev) => (prev ? { ...prev, status: data.outcome === 'DRAW' ? 'DRAW' : 'COMPLETED', winnerId: data.winnerId } : null));
      if (data.outcome === 'PLAYER_WIN') {
        const iWon = data.winnerId === currentUser?.id;
        if (iWon) {
          playVictorySound();
          showToast('VICTORY! You won the battle!', 'success');
        } else {
          playErrorSound();
          showToast('DEFEAT! Your opponent solved the problem first.', 'error');
        }
      } else {
        showToast('Match ended as a DRAW.', 'info');
      }
      setVictoryModalOpen(true);
      onRefreshUsers();
    });

    const cleanupChat = onChatMessage((msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    return () => {
      cleanupStarted();
      cleanupProgress();
      cleanupConcluded();
      cleanupChat();
    };
  }, [selectedMatch?.code, currentUser?.id, onMatchStarted, onMatchProgress, onMatchConcluded, onChatMessage, showToast, onRefreshUsers]);

  // Synchronized countdown timer with tick sound and auto-draw on expiration
  useEffect(() => {
    if (selectedMatch && selectedMatch.status === 'IN_PROGRESS') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 10 && prev > 1) {
            playTickSound();
          }
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
  }, [selectedMatch?.status]);

  const handleLanguageChange = (newLang: string) => {
    setCodeByLanguage((prev) => ({ ...prev, [selectedLanguage]: code }));
    setSelectedLanguage(newLang);

    if (codeByLanguage[newLang]) {
      setCode(codeByLanguage[newLang]);
    } else if (selectedMatch) {
      const newStarter = getStarterCode(selectedMatch.problem.slug, newLang, selectedMatch.problem.starterCode);
      setCode(newStarter);
      setCodeByLanguage((prev) => ({ ...prev, [newLang]: newStarter }));
    }
  };

  const handleResetCode = () => {
    if (selectedMatch) {
      const starter = getStarterCode(selectedMatch.problem.slug, selectedLanguage, selectedMatch.problem.starterCode);
      setCode(starter);
      setCodeByLanguage((prev) => ({ ...prev, [selectedLanguage]: starter }));
      showToast('Code reset to default starter template', 'info');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    showToast('Code copied to clipboard', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRunTests = async () => {
    if (!selectedMatch || runningTests || submitting) return;
    setRunningTests(true);
    setVerdict(null);

    try {
      const res = await api.runProblemCode(selectedMatch.problem.slug, code, selectedLanguage);
      if (res.success) {
        setVerdict(res.data);
        if (res.data.status === 'ACCEPTED') {
          playSuccessSound();
          showToast('Sample test cases passed!', 'success');
        } else {
          playErrorSound();
          showToast(`Test failed: ${res.data.status}`, 'error');
        }
      }
    } catch (err) {
      console.error('Run failed:', err);
      playErrorSound();
      showToast('Execution error. Please check your syntax.', 'error');
    } finally {
      setRunningTests(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!selectedMatch || submitting || runningTests || !currentUser) return;
    setSubmitting(true);

    try {
      const res = await api.submitMatchCode(selectedMatch.code, {
        username: currentUser.username,
        code,
        language: selectedLanguage,
      });

      if (res.success) {
        showToast('Solution submitted to judge queue!', 'info');
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      playErrorSound();
      showToast(err.message || 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMatch = async () => {
    if (!currentUser || !createProblemId) return;
    setCreating(true);

    try {
      const res = await api.createMatch({
        problemId: createProblemId,
        player1Username: currentUser.username,
        durationSeconds: createDuration,
      });

      if (res.success) {
        setShowCreateModal(false);
        showToast(`Duel created! Room Code: ${res.data.code}`, 'success');
        navigate(`/arena/${res.data.code}`);
        enterMatch(res.data.code);
      }
    } catch (err: any) {
      console.error('Match creation error:', err);
      showToast(err.message || 'Failed to create match', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinMatch = async (matchToJoin: Match) => {
    if (!currentUser) {
      showToast('Please select or register a profile first', 'info');
      return;
    }

    try {
      const res = await api.joinMatch(matchToJoin.code, currentUser.username);
      if (res.success) {
        showToast(`Joined match ${matchToJoin.code}! Duel begins.`, 'success');
        navigate(`/arena/${matchToJoin.code}`);
        enterMatch(matchToJoin.code);
      }
    } catch (err: any) {
      console.error('Join error:', err);
      showToast(err.message || 'Failed to join match', 'error');
    }
  };

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !selectedMatch || !currentUser) return;

    const text = chatInput.trim();
    setChatInput('');

    // Emit via WebSocket
    socketSendMessage(selectedMatch.code, currentUser.username, text);

    // Persist via REST
    api.sendMatchMessage(selectedMatch.code, {
      senderUsername: currentUser.username,
      text,
    }).catch(() => {});
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isMatchFinished = selectedMatch?.status === 'COMPLETED' || selectedMatch?.status === 'DRAW';

  // ==========================================
  // VIEW 1: ACTIVE MATCH ARENA
  // ==========================================
  if (selectedMatch) {
    const isPlayer1 = currentUser?.id === selectedMatch.player1.id;

    return (
      <div className="arena-battle-view">
        {/* Arena Navigation & Status Bar */}
        <div className="arena-top-bar">
          <div className="arena-top-left">
            <button className="btn-back" onClick={handleExitMatch}>
              <ArrowLeft size={16} />
              <span>Leave Arena</span>
            </button>
            <div className="match-code-tag">
              <Swords size={14} className="text-amber" />
              <span>{selectedMatch.code}</span>
              <button
                className="btn-copy-code"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Duel URL copied to clipboard!', 'success');
                }}
                title="Share duel link with an opponent"
              >
                <Copy size={12} />
              </button>
            </div>
            {socketConnected && (
              <span className="live-socket-indicator" title="Connected to Real-time WebSockets">
                <Radio size={14} className="text-emerald animate-pulse" />
                <span>Live Sync</span>
              </span>
            )}
          </div>

          <div className="arena-top-center">
            {/* Server-Authoritative Timer */}
            <div className={`countdown-clock ${timeLeft <= 60 ? 'warning animate-pulse' : ''}`}>
              <Clock size={16} />
              <span className="timer-digits">{formatTimer(timeLeft)}</span>
            </div>

            {/* Anti-Cheat Real-time Status Badge */}
            <div
              className={`anticheat-badge ${antiCheatStats.tabBlurCount > 0 ? 'badge-flagged' : 'badge-clean'}`}
              title="Monitors tab switches, window blurs, and paste speed"
            >
              <Shield size={13} />
              <span>
                Anti-Cheat: {antiCheatStats.tabBlurCount === 0 ? 'Clean' : `${antiCheatStats.tabBlurCount} blur(s)`}
              </span>
            </div>
          </div>

          <div className="arena-top-right">
            <button
              className="sound-toggle-btn"
              onClick={() => {
                const toggled = soundSettings.toggle();
                setSoundEnabled(toggled);
                showToast(toggled ? 'Sound effects enabled' : 'Sound effects muted', 'info');
              }}
              title="Toggle game sound effects"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-muted" />}
            </button>
          </div>
        </div>

        {/* 1v1 Scoreboard Bar */}
        <div className="scoreboard-strip">
          {/* Player 1 Card */}
          <div className={`player-card-compact ${isPlayer1 ? 'active-player' : ''}`}>
            <div className="player-avatar-small">
              {selectedMatch.player1.avatarUrl ? (
                <img src={selectedMatch.player1.avatarUrl} alt={selectedMatch.player1.username} />
              ) : (
                <div className="avatar-placeholder">{selectedMatch.player1.username.charAt(0).toUpperCase()}</div>
              )}
            </div>
            <div className="player-info-compact">
              <span className="player-name">{selectedMatch.player1.username}</span>
              <span className="player-rating">{selectedMatch.player1.arenaRating} ELO ({selectedMatch.player1.ratingTier})</span>
            </div>
          </div>

          <div className="scoreboard-vs">
            <Swords size={20} className="text-amber" />
          </div>

          {/* Player 2 Card */}
          <div className={`player-card-compact ${!isPlayer1 && selectedMatch.player2 ? 'active-player' : ''}`}>
            {selectedMatch.player2 ? (
              <>
                <div className="player-avatar-small">
                  {selectedMatch.player2.avatarUrl ? (
                    <img src={selectedMatch.player2.avatarUrl} alt={selectedMatch.player2.username} />
                  ) : (
                    <div className="avatar-placeholder">{selectedMatch.player2.username.charAt(0).toUpperCase()}</div>
                  )}
                </div>
                <div className="player-info-compact">
                  <span className="player-name">{selectedMatch.player2.username}</span>
                  <span className="player-rating">{selectedMatch.player2.arenaRating} ELO ({selectedMatch.player2.ratingTier})</span>
                </div>
              </>
            ) : (
              <div className="waiting-player-placeholder">
                <Bot size={16} className="animate-spin" />
                <span>Waiting for opponent...</span>
              </div>
            )}
          </div>
        </div>

        {/* Opponent Progress Alert Strip */}
        {opponentProgress && (
          <div className="opponent-progress-alert">
            <Zap size={14} className="text-amber" />
            <span>
              Opponent Progress: Passed {opponentProgress.passedCount}/{opponentProgress.totalCount} test cases ({opponentProgress.status})
            </span>
          </div>
        )}

        {/* Main Duel Grid: Split Problem Statement vs Monaco Editor */}
        <div className="duel-grid-container">
          {/* Left Column: Problem Statement & Chat Feed */}
          <div className="duel-left-col">
            <div className="problem-panel-card">
              <div className="problem-meta-strip">
                <h3>{selectedMatch.problem.title}</h3>
                <span className={`badge-difficulty diff-${selectedMatch.problem.difficulty.toLowerCase()}`}>
                  {selectedMatch.problem.difficulty}
                </span>
                <span className="badge-category">{selectedMatch.problem.category}</span>
              </div>

              <div
                className="problem-desc-scroll markdown-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedMatch.problem.description) }}
              />
            </div>

            {/* In-Match Live Chat & Quick Taunts */}
            <div className="duel-chat-card">
              <div className="chat-header">
                <MessageSquare size={14} />
                <span>Match Feed & Taunts</span>
              </div>
              <div className="chat-messages-scroll">
                {matchEvents.map((evt, i) => (
                  <div key={`evt-${i}`} className="chat-event-item">
                    <span>{evt}</span>
                  </div>
                ))}
                {chatMessages.map((msg, i) => (
                  <div key={`msg-${i}`} className="chat-user-message">
                    <strong className="chat-author">{msg.senderUsername || msg.username}:</strong>
                    <span className="chat-text">{msg.text}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendChatMessage} className="chat-input-row">
                <input
                  type="text"
                  placeholder="Send a taunt or greeting..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  maxLength={140}
                />
                <button type="submit" disabled={!chatInput.trim()}>
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Monaco Code Editor & Test Case Panel */}
          <div className="duel-right-col">
            <div className="editor-panel-card">
              <div className="editor-toolbar">
                <div className="toolbar-left">
                  <label>Language:</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    disabled={isMatchFinished}
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="toolbar-right">
                  <button className="toolbar-btn" onClick={handleCopyCode} title="Copy code">
                    {copiedCode ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button className="toolbar-btn" onClick={handleResetCode} disabled={isMatchFinished}>
                    <RotateCcw size={14} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Professional Monaco Code Editor */}
              <div className="monaco-container" style={{ minHeight: '440px', height: '440px', position: 'relative' }}>
                <CodeEditor
                  code={code}
                  onChange={setCode}
                  language={selectedLanguage}
                  theme={theme}
                  readOnly={isMatchFinished}
                  onRunTests={handleRunTests}
                  onSubmitCode={handleSubmitCode}
                  onPasteDetected={recordPaste}
                />
              </div>

              {/* Editor Action Buttons */}
              <div className="editor-footer-actions">
                <div className="action-hint">
                  <Zap size={14} className="text-amber" />
                  <span>Ctrl+Enter to run sample tests • Ctrl+Shift+Enter to submit solution</span>
                </div>

                <div className="action-btn-group">
                  <button
                    className="btn-run-tests"
                    onClick={handleRunTests}
                    disabled={runningTests || submitting || isMatchFinished}
                  >
                    <Play size={16} />
                    <span>{runningTests ? 'Evaluating...' : 'Run Tests'}</span>
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
                      <span>Passed: {verdict.passedCount} / {verdict.totalCount}</span>
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

        {/* Victory / Defeat Modal */}
        {victoryModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-card victory-modal animate-scale-up">
              <div className="victory-icon-circle">
                <Trophy size={48} className="text-amber" />
              </div>
              <h2>
                {selectedMatch.status === 'DRAW'
                  ? 'Match Drawn!'
                  : selectedMatch.winnerId === currentUser?.id
                  ? 'VICTORY!'
                  : 'DEFEAT!'}
              </h2>
              <p className="modal-subtitle">
                {selectedMatch.status === 'DRAW'
                  ? 'Time expired or players accepted a draw. ELO ratings synchronized.'
                  : selectedMatch.winnerId === currentUser?.id
                  ? 'Congratulations! You solved the problem first and gained ELO points.'
                  : 'Opponent solved the problem first. Keep training to climb back up!'}
              </p>

              <div className="modal-actions-row">
                <button className="btn-primary" onClick={handleExitMatch}>
                  Back to Arena Lobby
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ARENA LOBBY & MATCH LIST
  // ==========================================
  return (
    <div className="arena-lobby-container">
      {/* Lobby Header Hero */}
      <div className="arena-hero-banner">
        <div className="hero-content">
          <div className="hero-badge">
            <Flame size={16} />
            <span>LIVE 1V1 COMPETITIVE PROGRAMMING</span>
          </div>
          <h1>CodeArena Duel Grounds</h1>
          <p>
            Challenge real-time opponents in head-to-head algorithmic speed duels. Winner takes ELO, climbs tiers, and dominates the leaderboard.
          </p>
          <div className="hero-cta-group">
            <button className="btn-create-duel" onClick={() => setShowCreateModal(true)}>
              <Swords size={18} />
              <span>Create Duel Room</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Matches Grid */}
      <div className="matches-section">
        <div className="section-header">
          <h2>Active & Recent Arena Duels</h2>
          <button className="btn-refresh" onClick={loadArenaData} disabled={loading}>
            <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem' }}>
            <SkeletonLoader type="card" rows={3} />
          </div>
        ) : matches.length === 0 ? (
          <EmptyState
            title="No active duels found"
            description="Create a new duel room to challenge friends or queue up against other competitors!"
            actionText="Create Duel Room"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="matches-grid">
            {matches.map((m) => {
              const isWaiting = m.status === 'WAITING';
              const isInProgress = m.status === 'IN_PROGRESS';
              const canJoin = isWaiting && currentUser && m.player1.id !== currentUser.id;

              return (
                <div key={m.id} className={`match-card match-status-${m.status.toLowerCase()}`}>
                  <div className="match-card-header">
                    <div className="room-code-badge">
                      <Swords size={14} />
                      <span>{m.code}</span>
                    </div>
                    <span className={`status-pill pill-${m.status.toLowerCase()}`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="match-problem-info">
                    <h4>{m.problem.title}</h4>
                    <div className="problem-chips">
                      <span className={`badge-difficulty diff-${m.problem.difficulty.toLowerCase()}`}>
                        {m.problem.difficulty}
                      </span>
                      <span className="badge-category">{m.problem.category}</span>
                    </div>
                  </div>

                  <div className="match-combatants-row">
                    <div className="combatant">
                      <span className="combatant-name">{m.player1.username}</span>
                      <span className="combatant-rating">{m.player1.arenaRating} ELO</span>
                    </div>
                    <span className="combatants-vs">VS</span>
                    <div className="combatant">
                      {m.player2 ? (
                        <>
                          <span className="combatant-name">{m.player2.username}</span>
                          <span className="combatant-rating">{m.player2.arenaRating} ELO</span>
                        </>
                      ) : (
                        <span className="combatant-waiting">Waiting...</span>
                      )}
                    </div>
                  </div>

                  <div className="match-card-footer">
                    {canJoin ? (
                      <button className="btn-join-match" onClick={() => handleJoinMatch(m)}>
                        <UserPlus size={14} />
                        <span>Join Duel</span>
                      </button>
                    ) : (
                      <button
                        className="btn-spectate-match"
                        onClick={() => {
                          navigate(`/arena/${m.code}`);
                          enterMatch(m.code);
                        }}
                      >
                        <span>{isInProgress ? 'Enter Battle' : 'View Summary'}</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Duel Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Create a 1v1 Arena Duel</h3>
            <p className="modal-desc">
              Select an algorithmic challenge and set match duration. Share the room code with your opponent.
            </p>

            <div className="form-group">
              <label>Select Problem</label>
              <select
                value={createProblemId}
                onChange={(e) => setCreateProblemId(e.target.value)}
              >
                {problems.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.difficulty} - {p.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Match Duration</label>
              <select
                value={createDuration}
                onChange={(e) => setCreateDuration(parseInt(e.target.value, 10))}
              >
                <option value={300}>5 Minutes (Blitz)</option>
                <option value={600}>10 Minutes (Standard)</option>
                <option value={900}>15 Minutes (Competitive)</option>
                <option value={1800}>30 Minutes (Deep Think)</option>
              </select>
            </div>

            <div className="modal-actions-row">
              <button
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateMatch}
                disabled={creating || !createProblemId}
              >
                {creating ? 'Creating Room...' : 'Launch Duel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
