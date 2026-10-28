import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Swords,
  Medal,
  Award,
  Search,
  RotateCcw,
} from 'lucide-react';
import type { User } from '../types';
import { api } from '../services/api';

interface LeaderboardViewProps {
  currentUser: User | null;
  onChallengeUser: (targetUsername: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  currentUser,
  onChallengeUser,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'winrate' | 'streak' | 'wins'>('rating');

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const filteredUsers = users
    .filter((u) => {
      const term = search.toLowerCase();
      const matchesSearch =
        u.username.toLowerCase().includes(term) ||
        (u.name && u.name.toLowerCase().includes(term)) ||
        u.ratingTier.toLowerCase().includes(term);

      const matchesTier = selectedTier === 'All' || u.ratingTier.toLowerCase() === selectedTier.toLowerCase();
      return matchesSearch && matchesTier;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.arenaRating - a.arenaRating;
      if (sortBy === 'streak') return b.streak - a.streak;
      if (sortBy === 'wins') return b.wins - a.wins;
      if (sortBy === 'winrate') {
        const totalA = a.wins + a.losses + a.draws;
        const totalB = b.wins + b.losses + b.draws;
        const rateA = totalA > 0 ? a.wins / totalA : 0;
        const rateB = totalB > 0 ? b.wins / totalB : 0;
        return rateB - rateA;
      }
      return 0;
    });

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="rank-podium rank-gold" title="Rank 1 - Grandmaster Champion">
          <Medal size={20} />
          <span>#1</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="rank-podium rank-silver" title="Rank 2 - Elite Runner-up">
          <Medal size={20} />
          <span>#2</span>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="rank-podium rank-bronze" title="Rank 3 - Bronze Contender">
          <Medal size={20} />
          <span>#3</span>
        </div>
      );
    }
    return <span className="rank-default">#{rank}</span>;
  };

  return (
    <div className="leaderboard-container">
      {/* Leaderboard Header */}
      <div className="lb-hero-header">
        <div className="lb-hero-content">
          <div className="pill-badge">
            <Trophy size={14} className="text-amber" />
            <span>Official ELO Rankings</span>
          </div>
          <h1>Global Arena Leaderboard</h1>
          <p>
            Rankings calibrated from 1v1 battle victories, synchronized cross-platform ratings
            across LeetCode, Codeforces, and CodeChef, and win-streak multipliers.
          </p>
        </div>

        <div className="lb-stats-summary">
          <div className="summary-pill">
            <span className="summary-val">{users.length}</span>
            <span className="summary-lbl">Ranked Coders</span>
          </div>
          <div className="summary-pill">
            <span className="summary-val text-amber">
              {users[0]?.arenaRating ?? 2185}
            </span>
            <span className="summary-lbl">Peak ELO</span>
          </div>
          <div className="summary-pill">
            <span className="summary-val text-rose">
              {users.length > 0 ? Math.max(...users.map((u) => u.streak)) : 0}
            </span>
            <span className="summary-lbl">Top Streak</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="lb-controls-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search competitor by handle, name, or tier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="lb-filter-group">
          <select
            className="lb-select-control"
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            title="Filter by Rating Tier"
          >
            <option value="All">All Tiers</option>
            <option value="Grandmaster">Grandmaster</option>
            <option value="Master">Master</option>
            <option value="Expert">Expert</option>
            <option value="Specialist">Specialist</option>
            <option value="Apprentice">Apprentice</option>
            <option value="Novice">Novice</option>
          </select>

          <select
            className="lb-select-control"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            title="Sort Leaderboard"
          >
            <option value="rating">Sort by Rating</option>
            <option value="winrate">Sort by Win Rate</option>
            <option value="streak">Sort by Streak</option>
            <option value="wins">Sort by Wins</option>
          </select>
        </div>

        <button className="btn-refresh" onClick={fetchLeaderboard} disabled={loading}>
          <RotateCcw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Leaderboard Table */}
      {loading ? (
        <div className="lb-loading">
          <div className="loading-spinner" />
          <span>Calculating global standings...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="empty-lb-state">
          <Award size={48} className="text-dim" />
          <h3>No competitors found</h3>
          <p>Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="table-responsive-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="th-rank">Rank</th>
                <th className="th-user">Competitor</th>
                <th className="th-rating">Arena Rating</th>
                <th className="th-platforms">Platform Ratings</th>
                <th className="th-record">W - L - D</th>
                <th className="th-winrate">Win Rate</th>
                <th className="th-streak">Streak</th>
                <th className="th-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => {
                const rank = index + 1;
                const totalMatches = user.wins + user.losses + user.draws;
                const winRate =
                  totalMatches > 0
                    ? Math.round((user.wins / totalMatches) * 100)
                    : 0;
                const isCurrentUser = user.username === currentUser?.username;

                return (
                  <tr
                    key={user.id}
                    className={`lb-row ${rank <= 3 ? `top-rank-${rank}` : ''} ${
                      isCurrentUser ? 'current-user-row' : ''
                    }`}
                  >
                    <td className="td-rank">{getRankBadge(rank)}</td>

                    <td className="td-user">
                      <div className="user-cell-wrap">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.username}
                            className="lb-user-avatar"
                          />
                        ) : (
                          <div className="lb-user-avatar-fallback">
                            {user.username[0].toUpperCase()}
                          </div>
                        )}
                        <div className="lb-user-details">
                          <div className="lb-user-name-row">
                            <span className="lb-user-name">
                              {user.name || user.username}
                            </span>
                            {isCurrentUser && (
                              <span className="current-user-tag">YOU</span>
                            )}
                          </div>
                          <span className="lb-user-handle">@{user.username}</span>
                        </div>
                      </div>
                    </td>

                    <td className="td-rating">
                      <div className="rating-cell">
                        <span className="rating-number">{user.arenaRating}</span>
                        <span className={`tier-badge ${user.ratingTier.toLowerCase().replace(/\s+/g, '-')}`}>
                          {user.ratingTier}
                        </span>
                      </div>
                    </td>

                    <td className="td-platforms">
                      <div className="platforms-row">
                        {user.profile?.leetcodeRating ? (
                          <span className="platform-chip leetcode" title="LeetCode Rating">
                            LC {user.profile.leetcodeRating}
                          </span>
                        ) : null}
                        {user.profile?.codeforcesRating ? (
                          <span className="platform-chip codeforces" title="Codeforces Rating">
                            CF {user.profile.codeforcesRating}
                          </span>
                        ) : null}
                        {user.profile?.codechefRating ? (
                          <span className="platform-chip codechef" title="CodeChef Rating">
                            CC {user.profile.codechefRating}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="td-record">
                      <div className="record-cell">
                        <span className="rec-win">{user.wins}W</span>
                        <span className="rec-sep">-</span>
                        <span className="rec-loss">{user.losses}L</span>
                        {user.draws > 0 && (
                          <>
                            <span className="rec-sep">-</span>
                            <span className="rec-draw">{user.draws}D</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="td-winrate">
                      <div className="winrate-cell">
                        <div className="winrate-bar-bg">
                          <div
                            className="winrate-bar-fill"
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                        <span className="winrate-text">{winRate}%</span>
                      </div>
                    </td>

                    <td className="td-streak">
                      {user.streak > 0 ? (
                        <div className="streak-badge">
                          <Flame size={14} className="streak-flame" />
                          <span>{user.streak}</span>
                        </div>
                      ) : (
                        <span className="text-dim">-</span>
                      )}
                    </td>

                    <td className="td-action">
                      {!isCurrentUser && (
                        <button
                          className="btn-challenge-row"
                          onClick={() => onChallengeUser(user.username)}
                          title={`Challenge @${user.username} to 1v1 Arena Duel`}
                        >
                          <Swords size={14} />
                          <span>Challenge</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
