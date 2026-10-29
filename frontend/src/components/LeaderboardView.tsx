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
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';

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
    if (rank === 1) return <span className="rank-badge gold"><Trophy size={16} /> 1</span>;
    if (rank === 2) return <span className="rank-badge silver"><Medal size={16} /> 2</span>;
    if (rank === 3) return <span className="rank-badge bronze"><Award size={16} /> 3</span>;
    return <span className="rank-number">#{rank}</span>;
  };

  const calculateWinRate = (u: User) => {
    const total = u.wins + u.losses + u.draws;
    if (total === 0) return 0;
    return Math.round((u.wins / total) * 100);
  };

  const tiers = ['All', 'Grandmaster', 'Master', 'Expert', 'Specialist', 'Apprentice', 'Novice'];

  return (
    <div className="leaderboard-container">
      {/* Header Banner */}
      <div className="leaderboard-header-banner">
        <div className="banner-title-block">
          <div className="banner-icon-wrap gold-glow">
            <Trophy size={26} />
          </div>
          <div>
            <h1>Global Arena Leaderboard</h1>
            <p>Compete, win duels, climb tiers from Novice to Grandmaster, and claim the championship.</p>
          </div>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="leaderboard-filter-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search competitors by handle or tier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filters-group">
            <div className="filter-select-wrap">
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
              >
                {tiers.map((t) => (
                  <option key={t} value={t}>
                    {t === 'All' ? 'All Tiers' : t}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrap">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="rating">Sort: Highest ELO Rating</option>
                <option value="winrate">Sort: Highest Win Rate</option>
                <option value="streak">Sort: Longest Win Streak</option>
                <option value="wins">Sort: Most Duels Won</option>
              </select>
            </div>

            <button className="btn-refresh-icon" onClick={fetchLeaderboard} title="Refresh rankings">
              <RotateCcw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Table Card */}
      <div className="leaderboard-card">
        {loading ? (
          <div style={{ padding: '2rem' }}>
            <SkeletonLoader type="table-row" rows={8} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No competitors found"
            description="No players matched your search or tier filter. Try clearing filters to see all competitors."
            actionText="Reset Filters"
            onAction={() => {
              setSearch('');
              setSelectedTier('All');
            }}
          />
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th style={{ width: '8%' }}>Rank</th>
                <th style={{ width: '32%' }}>Competitor</th>
                <th style={{ width: '15%' }}>Rating Tier</th>
                <th style={{ width: '15%' }}>Arena ELO</th>
                <th style={{ width: '15%' }}>Win Rate</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Duel Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => {
                const rank = index + 1;
                const isCurrent = currentUser?.id === user.id;
                const winRate = calculateWinRate(user);

                return (
                  <tr key={user.id} className={`leaderboard-row ${isCurrent ? 'current-user-row' : ''}`}>
                    <td className="rank-cell">{getRankBadge(rank)}</td>
                    <td className="user-cell">
                      <div className="user-avatar-small">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.username} />
                        ) : (
                          <div className="avatar-placeholder">{user.username.charAt(0).toUpperCase()}</div>
                        )}
                      </div>
                      <div className="user-info">
                        <span className="username">
                          {user.username} {isCurrent && <span className="you-pill">YOU</span>}
                        </span>
                        {user.name && <span className="user-realname">{user.name}</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`tier-badge tier-${user.ratingTier.toLowerCase()}`}>
                        {user.ratingTier}
                      </span>
                    </td>
                    <td>
                      <div className="rating-cell">
                        <span className="rating-value">{user.arenaRating}</span>
                        {user.streak > 1 && (
                          <span className="streak-flame" title={`${user.streak} win streak!`}>
                            <Flame size={12} /> {user.streak}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="winrate-cell">
                        <span className="winrate-percent">{winRate}%</span>
                        <div className="winrate-record">
                          <span className="text-emerald">{user.wins}W</span> •{' '}
                          <span className="text-rose">{user.losses}L</span> •{' '}
                          <span className="text-muted">{user.draws}D</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!isCurrent && (
                        <button
                          className="btn-challenge-pill"
                          onClick={() => onChallengeUser(user.username)}
                          title={`Challenge ${user.username} to a live 1v1 duel`}
                        >
                          <Swords size={13} />
                          <span>Challenge</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
