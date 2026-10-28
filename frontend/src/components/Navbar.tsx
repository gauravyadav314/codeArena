import React from 'react';
import { Swords, Code2, Trophy, UserCircle, Activity, ChevronDown, Check, Sun, Moon, Menu, X } from 'lucide-react';
import type { User } from '../types';

export type TabType = 'arena' | 'problems' | 'leaderboard' | 'profile' | 'telemetry';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  currentUser: User | null;
  users: User[];
  onSelectUser: (user: User) => void;
  backendStatus: 'healthy' | 'checking' | 'error';
  latency: number | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  matchCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  users,
  onSelectUser,
  backendStatus,
  latency,
  theme,
  onToggleTheme,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <div className="logo-group" onClick={() => onTabChange('arena')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon-wrap">
            <Swords className="logo-icon" size={22} />
          </div>
          <div className="logo-text">
            <span className="brand-name">Code<span className="brand-name-highlight">Arena</span></span>
            <span className="brand-badge">PRO DUELS</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className={`nav-tabs ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <button
            className={`nav-tab-btn ${activeTab === 'arena' ? 'active' : ''}`}
            onClick={() => {
              onTabChange('arena');
              setMobileMenuOpen(false);
            }}
          >
            <Swords size={16} />
            <span>1v1 Arena</span>
            <span className="nav-live-dot" />
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'problems' ? 'active' : ''}`}
            onClick={() => {
              onTabChange('problems');
              setMobileMenuOpen(false);
            }}
          >
            <Code2 size={16} />
            <span>Problems</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => {
              onTabChange('leaderboard');
              setMobileMenuOpen(false);
            }}
          >
            <Trophy size={16} />
            <span>Leaderboard</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              onTabChange('profile');
              setMobileMenuOpen(false);
            }}
          >
            <UserCircle size={16} />
            <span>Rating Profile</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
            onClick={() => {
              onTabChange('telemetry');
              setMobileMenuOpen(false);
            }}
          >
            <Activity size={16} />
            <span>Telemetry</span>
          </button>
        </nav>

        {/* User Persona & API Status */}
        <div className="nav-meta">
          {/* Active User Switcher */}
          {currentUser && (
            <div className="user-switcher-container" ref={dropdownRef}>
              <button
                className="user-profile-badge"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                title="Switch Active Persona for Arena Testing"
              >
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.username} className="user-avatar-mini" />
                ) : (
                  <div className="user-avatar-fallback">{currentUser.username[0]?.toUpperCase()}</div>
                )}
                <div className="user-badge-info">
                  <span className="user-badge-name">{currentUser.name || currentUser.username}</span>
                  <span className="user-badge-rating">
                    <span className="rating-num">{currentUser.arenaRating}</span>
                    <span className="rating-tier-tag">{currentUser.ratingTier}</span>
                  </span>
                </div>
                <ChevronDown size={14} className={`dropdown-arrow ${userDropdownOpen ? 'rotated' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="user-dropdown-menu">
                  <div className="dropdown-header">Switch Player Persona</div>
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className={`dropdown-item ${u.username === currentUser.username ? 'active' : ''}`}
                      onClick={() => {
                        onSelectUser(u);
                        setUserDropdownOpen(false);
                      }}
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.username} className="dropdown-item-avatar" />
                      ) : (
                        <div className="dropdown-item-avatar-fallback">{u.username[0]?.toUpperCase()}</div>
                      )}
                      <div className="dropdown-item-details">
                        <span className="dropdown-item-title">{u.name || u.username}</span>
                        <span className="dropdown-item-subtitle">@{u.username} • {u.arenaRating} rating</span>
                      </div>
                      {u.username === currentUser.username && (
                        <Check size={16} className="dropdown-check" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dark / Light Mode Toggle Button */}
          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme mode"
          >
            {theme === 'dark' ? (
              <Sun size={17} className="theme-icon sun" />
            ) : (
              <Moon size={17} className="theme-icon moon" />
            )}
            <span className="theme-toggle-text">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {/* Backend Status indicator */}
          <div className={`status-pill ${backendStatus}`} id="navbar-status-indicator" title={latency ? `Latency: ${latency}ms` : undefined}>
            <span className="status-dot"></span>
            <span className="status-text">
              {backendStatus === 'healthy'
                ? latency ? `${latency}ms` : 'API Online'
                : backendStatus === 'checking'
                ? 'Connecting...'
                : 'Offline'}
            </span>
          </div>
          {/* Mobile Menu Hamburger */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};
