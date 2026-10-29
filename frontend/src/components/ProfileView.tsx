import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Trophy,
  Flame,
  Swords,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Award,
} from 'lucide-react';
import type { User, Submission } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';

interface ProfileViewProps {
  currentUser: User | null;
  onProfileUpdated: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onProfileUpdated,
}) => {
  const { username: routeUsername } = useParams<{ username?: string }>();
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

  const targetUsername = routeUsername || currentUser?.username;

  const fetchFullProfile = async () => {
    if (!targetUsername) return;
    setLoading(true);
    try {
      const res = await api.getUser(targetUsername);
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
  }, [targetUsername]);

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUser) return;
    setSyncing(true);

    try {
      const res = await api.syncProfile({
        username: profileUser.username,
        leetcodeUsername: lcUsername || undefined,
        codeforcesHandle: cfHandle || undefined,
        codechefHandle: ccHandle || undefined,
        leetcodeRating: lcRating,
        leetcodeSolved: lcSolved,
        codeforcesRating: cfRating,
        codechefRating: ccRating,
      });

      if (res.success) {
        setProfileUser(res.data);
        setShowSyncModal(false);
        showToast('Ratings synchronized from LeetCode, Codeforces & CodeChef!', 'success');
        onProfileUpdated();
      }
    } catch (err: any) {
      console.error('Sync failed:', err);
      showToast(err.message || 'Failed to sync platform handles', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !profileUser) {
    return (
      <div className="profile-container" style={{ padding: '2rem' }}>
        <SkeletonLoader type="card" rows={3} />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="profile-container">
        <EmptyState
          title="No profile selected"
          description="Select an account from the header dropdown or register a new handle to view statistics."
        />
      </div>
    );
  }

  const profile = profileUser.profile;
  const totalMatches = profileUser.wins + profileUser.losses + profileUser.draws;
  const winRate = totalMatches > 0 ? Math.round((profileUser.wins / totalMatches) * 100) : 0;
  const isOwner = currentUser?.id === profileUser.id;

  return (
    <div className="profile-container">
      {/* Profile Header Hero */}
      <div className="profile-hero-card">
        <div className="profile-hero-left">
          <div className="profile-avatar-large">
            {profileUser.avatarUrl ? (
              <img src={profileUser.avatarUrl} alt={profileUser.username} />
            ) : (
              <div className="avatar-placeholder-large">
                {profileUser.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="profile-hero-info">
            <div className="profile-title-row">
              <h2>{profileUser.name || profileUser.username}</h2>
              <span className={`tier-badge tier-${profileUser.ratingTier.toLowerCase()}`}>
                {profileUser.ratingTier}
              </span>
            </div>
            <p className="profile-handle">@{profileUser.username}</p>
            {profileUser.bio && <p className="profile-bio">{profileUser.bio}</p>}
          </div>
        </div>

        <div className="profile-hero-actions">
          {isOwner && (
            <button className="btn-sync-profile" onClick={() => setShowSyncModal(true)}>
              <RefreshCw size={15} />
              <span>Sync Platform Handles</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="profile-stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">CodeArena ELO</span>
            <Trophy size={18} className="text-amber" />
          </div>
          <div className="stat-value">{profileUser.arenaRating}</div>
          <div className="stat-subtext">Tier: {profileUser.ratingTier}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Win Rate</span>
            <Swords size={18} className="text-emerald" />
          </div>
          <div className="stat-value">{winRate}%</div>
          <div className="stat-subtext">
            {profileUser.wins}W • {profileUser.losses}L • {profileUser.draws}D
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Win Streak</span>
            <Flame size={18} className="text-amber" />
          </div>
          <div className="stat-value">{profileUser.streak}</div>
          <div className="stat-subtext">Consecutive 1v1 victories</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Composite CP Score</span>
            <Award size={18} className="text-indigo" />
          </div>
          <div className="stat-value">{profile?.compositeScore || profileUser.arenaRating}</div>
          <div className="stat-subtext">Aggregated across platforms</div>
        </div>
      </div>

      {/* External Platform Cards */}
      <h3 className="section-title">Connected Competitive Platforms</h3>
      <div className="platform-cards-grid">
        {/* LeetCode */}
        <div className="platform-card platform-leetcode">
          <div className="platform-header">
            <div className="platform-brand">
              <span className="platform-logo-box lc">LC</span>
              <div>
                <h4>LeetCode</h4>
                <span className="platform-handle">
                  {profile?.leetcodeUsername ? `@${profile.leetcodeUsername}` : 'Not linked'}
                </span>
              </div>
            </div>
            <span className="platform-rating-pill">{profile?.leetcodeRating || 0} ELO</span>
          </div>
          <div className="platform-body">
            <div className="platform-stat-row">
              <span>Problems Solved</span>
              <strong>{profile?.leetcodeSolved || 0}</strong>
            </div>
            <div className="platform-stat-row">
              <span>Contest Rating</span>
              <strong>{profile?.leetcodeRating || 0}</strong>
            </div>
          </div>
        </div>

        {/* Codeforces */}
        <div className="platform-card platform-codeforces">
          <div className="platform-header">
            <div className="platform-brand">
              <span className="platform-logo-box cf">CF</span>
              <div>
                <h4>Codeforces</h4>
                <span className="platform-handle">
                  {profile?.codeforcesHandle ? `@${profile.codeforcesHandle}` : 'Not linked'}
                </span>
              </div>
            </div>
            <span className="platform-rating-pill">{profile?.codeforcesRating || 0} ELO</span>
          </div>
          <div className="platform-body">
            <div className="platform-stat-row">
              <span>Contest Rank</span>
              <strong>{profile?.codeforcesRank || 'Unranked'}</strong>
            </div>
            <div className="platform-stat-row">
              <span>Max Rating</span>
              <strong>{profile?.codeforcesMaxRating || profile?.codeforcesRating || 0}</strong>
            </div>
          </div>
        </div>

        {/* CodeChef */}
        <div className="platform-card platform-codechef">
          <div className="platform-header">
            <div className="platform-brand">
              <span className="platform-logo-box cc">CC</span>
              <div>
                <h4>CodeChef</h4>
                <span className="platform-handle">
                  {profile?.codechefHandle ? `@${profile.codechefHandle}` : 'Not linked'}
                </span>
              </div>
            </div>
            <span className="platform-rating-pill">{profile?.codechefRating || 0} ELO</span>
          </div>
          <div className="platform-body">
            <div className="platform-stat-row">
              <span>Stars Badge</span>
              <strong>{profile?.codechefStars || '3★'}</strong>
            </div>
            <div className="platform-stat-row">
              <span>Global Rating</span>
              <strong>{profile?.codechefRating || 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Submissions History */}
      <h3 className="section-title" style={{ marginTop: '2.5rem' }}>Recent Duel Submissions</h3>
      <div className="submissions-table-card">
        {(!profileUser.submissions || profileUser.submissions.length === 0) ? (
          <EmptyState title="No submissions recorded" description="Compete in 1v1 arena duels or solve problems in the studio to build your history." />
        ) : (
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Problem</th>
                <th>Language</th>
                <th>Passed</th>
                <th>Runtime</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {profileUser.submissions.map((sub: Submission) => (
                <tr key={sub.id}>
                  <td>
                    <span className={`status-tag status-${sub.status.toLowerCase()}`}>
                      {sub.status === 'ACCEPTED' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      <span>{sub.status}</span>
                    </span>
                  </td>
                  <td>{sub.problem?.title || 'Problem Duel'}</td>
                  <td><span className="lang-pill">{sub.language}</span></td>
                  <td>{sub.passedCount} / {sub.totalCount}</td>
                  <td>{sub.runtimeMs}ms</td>
                  <td>{new Date(sub.submittedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Synchronize External Profiles</h3>
            <p className="modal-desc">
              Connect your LeetCode, Codeforces, and CodeChef handles to recompute your aggregated composite rating and global tier.
            </p>

            <form onSubmit={handleSyncSubmit}>
              <div className="form-group">
                <label>LeetCode Username</label>
                <input
                  type="text"
                  placeholder="e.g. tourist"
                  value={lcUsername}
                  onChange={(e) => setLcUsername(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Codeforces Handle</label>
                <input
                  type="text"
                  placeholder="e.g. tourist"
                  value={cfHandle}
                  onChange={(e) => setCfHandle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>CodeChef Handle</label>
                <input
                  type="text"
                  placeholder="e.g. tourist"
                  value={ccHandle}
                  onChange={(e) => setCcHandle(e.target.value)}
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowSyncModal(false)}
                  disabled={syncing}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={syncing}>
                  {syncing ? 'Fetching Stats...' : 'Save & Recalculate ELO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
