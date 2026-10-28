import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Swords,
  RefreshCw,
  Code2,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
} from 'lucide-react';
import type { User, Submission } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface ProfileViewProps {
  currentUser: User | null;
  onProfileUpdated: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onProfileUpdated,
}) => {
  const { showToast } = useToast();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Form states for sync
  const [lcUsername, setLcUsername] = useState<string>('');
  const [lcRating, setLcRating] = useState<number>(2240);
  const [lcSolved, setLcSolved] = useState<number>(742);
  const [cfHandle, setCfHandle] = useState<string>('');
  const [cfRating, setCfRating] = useState<number>(1980);
  const [ccHandle, setCcHandle] = useState<string>('');
  const [ccRating, setCcRating] = useState<number>(2120);

  const fetchFullProfile = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await api.getUser(currentUser.username);
      if (res.success) {
        setProfileUser(res.data);
        const p = res.data.profile;
        if (p) {
          setLcUsername(p.leetcodeUsername || '');
          setLcRating(p.leetcodeRating || 1800);
          setLcSolved(p.leetcodeSolved || 250);
          setCfHandle(p.codeforcesHandle || '');
          setCfRating(p.codeforcesRating || 1600);
          setCcHandle(p.codechefHandle || '');
          setCcRating(p.codechefRating || 1700);
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFullProfile();
  }, [currentUser]);

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUser) return;
    setSyncing(true);
    try {
      const res = await api.syncProfile({
        username: profileUser.username,
        leetcodeUsername: lcUsername,
        leetcodeRating: Number(lcRating),
        leetcodeSolved: Number(lcSolved),
        codeforcesHandle: cfHandle,
        codeforcesRating: Number(cfRating),
        codechefHandle: ccHandle,
        codechefRating: Number(ccRating),
      });

      if (res.success) {
        setShowSyncModal(false);
        await fetchFullProfile();
        onProfileUpdated();
        showToast('Ratings and profiles synchronized!', 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !profileUser) {
    return (
      <div className="profile-loading-state">
        <div className="loading-spinner" />
        <span>Synthesizing competitive programming metrics...</span>
      </div>
    );
  }

  const u = profileUser || currentUser;
  if (!u) {
    return <div className="empty-state">No user profile selected.</div>;
  }

  const p = u.profile;
  const totalMatches = u.wins + u.losses + u.draws;
  const winRate = totalMatches > 0 ? Math.round((u.wins / totalMatches) * 100) : 0;

  return (
    <div className="profile-page-container">
      {/* Top Banner & Header Card */}
      <div className="profile-hero-card">
        <div className="profile-avatar-wrap">
          {u.avatarUrl ? (
            <img src={u.avatarUrl} alt={u.username} className="profile-avatar-large" />
          ) : (
            <div className="profile-avatar-fallback">{u.username[0]?.toUpperCase()}</div>
          )}
          <div className="avatar-rank-halo" />
        </div>

        <div className="profile-primary-details">
          <div className="profile-name-row">
            <h1 className="profile-name">{u.name || u.username}</h1>
            <span className={`tier-badge ${u.ratingTier.toLowerCase().replace(/\s+/g, '-')}`}>
              {u.ratingTier}
            </span>
          </div>
          <span className="profile-handle">@{u.username} • Joined 2026</span>
          <p className="profile-bio">
            {u.bio || 'Full-Stack Developer & Algorithmic Duelist on CodeArena.'}
          </p>

          <div className="profile-metrics-row">
            <div className="metric-badge">
              <Trophy size={16} className="text-amber" />
              <span>{u.arenaRating} Arena ELO</span>
            </div>
            <div className="metric-badge">
              <Swords size={16} className="text-rose" />
              <span>{u.wins}W - {u.losses}L ({winRate}% Win Rate)</span>
            </div>
            <div className="metric-badge">
              <Flame size={16} className="text-amber" />
              <span>{u.streak} Win Streak</span>
            </div>
          </div>
        </div>

        <div className="profile-hero-action">
          <button className="btn-sync-platforms" onClick={() => setShowSyncModal(true)}>
            <RefreshCw size={16} />
            <span>Sync Platform Ratings</span>
          </button>
        </div>
      </div>

      {/* Multi-Platform Aggregated Matrix */}
      <div className="profile-platform-matrix">
        {/* LeetCode Card */}
        <div className="platform-card leetcode-card">
          <div className="card-top">
            <div className="platform-brand">
              <span className="brand-dot lc-dot" />
              <span className="brand-title">LeetCode</span>
            </div>
            <span className="handle-tag">@{p?.leetcodeUsername || 'not_connected'}</span>
          </div>

          <div className="card-rating-section">
            <span className="platform-rating-val">{p?.leetcodeRating || 0}</span>
            <span className="platform-rating-lbl">Contest Rating</span>
          </div>

          <div className="solved-progress-section">
            <div className="solved-total-row">
              <span>Solved Problems</span>
              <span className="solved-num">{p?.leetcodeSolved || 0}</span>
            </div>

            <div className="breakdown-bars">
              <div className="bar-item">
                <div className="bar-labels">
                  <span className="easy-lbl">Easy</span>
                  <span>{p?.leetcodeEasy || 280}</span>
                </div>
                <div className="progress-bg">
                  <div className="progress-fill easy" style={{ width: '65%' }} />
                </div>
              </div>

              <div className="bar-item">
                <div className="bar-labels">
                  <span className="med-lbl">Medium</span>
                  <span>{p?.leetcodeMedium || 372}</span>
                </div>
                <div className="progress-bg">
                  <div className="progress-fill medium" style={{ width: '75%' }} />
                </div>
              </div>

              <div className="bar-item">
                <div className="bar-labels">
                  <span className="hard-lbl">Hard</span>
                  <span>{p?.leetcodeHard || 90}</span>
                </div>
                <div className="progress-bg">
                  <div className="progress-fill hard" style={{ width: '40%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Codeforces Card */}
        <div className="platform-card codeforces-card">
          <div className="card-top">
            <div className="platform-brand">
              <span className="brand-dot cf-dot" />
              <span className="brand-title">Codeforces</span>
            </div>
            <span className="handle-tag">@{p?.codeforcesHandle || 'not_connected'}</span>
          </div>

          <div className="card-rating-section">
            <span className="platform-rating-val text-cyan">{p?.codeforcesRating || 0}</span>
            <span className="platform-rating-lbl">Division Rating</span>
          </div>

          <div className="cf-stats-box">
            <div className="cf-stat-row">
              <span className="cf-stat-name">Official Rank</span>
              <span className="cf-stat-val">{p?.codeforcesRank || 'Candidate Master'}</span>
            </div>
            <div className="cf-stat-row">
              <span className="cf-stat-name">Peak Rating</span>
              <span className="cf-stat-val">{p?.codeforcesMaxRating || p?.codeforcesRating || 0}</span>
            </div>
            <div className="cf-stat-row">
              <span className="cf-stat-name">Verification</span>
              <span className="cf-stat-val text-emerald">Verified API</span>
            </div>
          </div>
        </div>

        {/* CodeChef Card */}
        <div className="platform-card codechef-card">
          <div className="card-top">
            <div className="platform-brand">
              <span className="brand-dot cc-dot" />
              <span className="brand-title">CodeChef</span>
            </div>
            <span className="handle-tag">@{p?.codechefHandle || 'not_connected'}</span>
          </div>

          <div className="card-rating-section">
            <span className="platform-rating-val text-amber">{p?.codechefRating || 0}</span>
            <span className="platform-rating-lbl">Contest Rating</span>
          </div>

          <div className="cf-stats-box">
            <div className="cf-stat-row">
              <span className="cf-stat-name">Stars Tier</span>
              <span className="cf-stat-val text-amber font-bold">{p?.codechefStars || '5★'}</span>
            </div>
            <div className="cf-stat-row">
              <span className="cf-stat-name">League Status</span>
              <span className="cf-stat-val">Division 1 Active</span>
            </div>
            <div className="cf-stat-row">
              <span className="cf-stat-name">Status</span>
              <span className="cf-stat-val text-emerald">Synced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Composite Rating Explainer Box */}
      <div className="composite-explainer-card">
        <div className="explainer-left">
          <div className="explainer-icon-circle">
            <Shield size={24} className="text-cyan" />
          </div>
          <div>
            <h3>Unified Cross-Platform Composite Score: {p?.compositeScore || u.arenaRating}</h3>
            <p>
              Calculated using weighted platform normalization formula:
              <code> Score = (LeetCode × 0.45) + (Codeforces × 0.35) + (CodeChef × 0.20)</code>
            </p>
          </div>
        </div>

        <div className="tier-progress-preview">
          <div className="tier-label-row">
            <span>Current Tier: <strong>{u.ratingTier}</strong></span>
            <span>Next: <strong>Legendary (2400)</strong></span>
          </div>
          <div className="progress-bg">
            <div
              className="progress-fill composite"
              style={{ width: `${Math.min(100, Math.round(((u.arenaRating - 1200) / 1200) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recent Submissions History */}
      <div className="submissions-history-section">
        <div className="section-header-row">
          <div>
            <h2>Recent Solved Arena Submissions</h2>
            <p>Your latest evaluated algorithmic solutions across all matches and practice sessions</p>
          </div>
        </div>

        {u.submissions && u.submissions.length > 0 ? (
          <div className="submissions-table-wrap">
            <table className="submissions-table">
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>Tests Passed</th>
                  <th>Runtime</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {u.submissions.map((sub: Submission) => (
                  <tr key={sub.id}>
                    <td className="sub-problem-title">
                      {sub.problem?.title || 'Competitive Problem'}
                    </td>
                    <td>
                      <span className="lang-chip">{sub.language}</span>
                    </td>
                    <td>
                      <span className={`sub-status-pill ${sub.status.toLowerCase()}`}>
                        {sub.status === 'ACCEPTED' ? (
                          <CheckCircle2 size={13} className="text-emerald" />
                        ) : (
                          <XCircle size={13} className="text-rose" />
                        )}
                        <span>{sub.status}</span>
                      </span>
                    </td>
                    <td>
                      {sub.passedCount} / {sub.totalCount}
                    </td>
                    <td>
                      <span className="runtime-tag">
                        <Clock size={12} /> {sub.runtimeMs}ms
                      </span>
                    </td>
                    <td className="sub-time">
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-submissions-card">
            <Code2 size={36} className="text-dim" />
            <p>No recent submissions yet. Jump into an arena match to start competing!</p>
          </div>
        )}
      </div>

      {/* Modal: Sync Platforms */}
      {showSyncModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Sync Multi-Platform Handles &amp; Ratings</h3>
              <button className="btn-close-modal" onClick={() => setShowSyncModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSyncSubmit}>
              <div className="form-section-header">LeetCode Profile</div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    className="input-field"
                    value={lcUsername}
                    onChange={(e) => setLcUsername(e.target.value)}
                    placeholder="e.g. gaurav_algo"
                  />
                </div>
                <div className="form-group">
                  <label>Contest Rating</label>
                  <input
                    type="number"
                    className="input-field"
                    value={lcRating}
                    onChange={(e) => setLcRating(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-section-header">Codeforces Profile</div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Handle</label>
                  <input
                    type="text"
                    className="input-field"
                    value={cfHandle}
                    onChange={(e) => setCfHandle(e.target.value)}
                    placeholder="e.g. gaurav_cf"
                  />
                </div>
                <div className="form-group">
                  <label>Rating</label>
                  <input
                    type="number"
                    className="input-field"
                    value={cfRating}
                    onChange={(e) => setCfRating(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-section-header">CodeChef Profile</div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Handle</label>
                  <input
                    type="text"
                    className="input-field"
                    value={ccHandle}
                    onChange={(e) => setCcHandle(e.target.value)}
                    placeholder="e.g. gaurav_cc"
                  />
                </div>
                <div className="form-group">
                  <label>Rating</label>
                  <input
                    type="number"
                    className="input-field"
                    value={ccRating}
                    onChange={(e) => setCcRating(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowSyncModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-create-submit" disabled={syncing}>
                  {syncing ? 'Recalculating Ratings...' : 'Save & Recalculate Composite ELO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
