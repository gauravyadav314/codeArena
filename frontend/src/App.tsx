import { useState, useEffect, useCallback } from 'react';
import { Navbar, type TabType } from './components/Navbar';
import { ArenaBattleView } from './components/ArenaBattleView';
import { ProblemsView } from './components/ProblemsView';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView } from './components/ProfileView';
import { TelemetryView } from './components/TelemetryView';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { HealthResponse } from './components/HealthProbeCard';
import type { User } from './types';
import { api } from './services/api';
import './App.css';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('arena');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Theme state: dark / light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('codearena_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('codearena_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Health and connectivity state
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const apiUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/$/, '');

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const elapsed = Math.round(performance.now() - startTime);
      setLatency(elapsed);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as HealthResponse;
      setHealthData(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown network error';
      setError(message);
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.getUsers();
      if (res.success && res.data.length > 0) {
        setUsers(res.data);
        setCurrentUser((prev) => {
          if (!prev) return res.data[0];
          // Keep current user updated with latest rating/streak
          const found = res.data.find((u) => u.id === prev.id);
          return found || res.data[0];
        });
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    fetchUsers();
  }, [checkHealth, fetchUsers]);

  const handleChallengeUser = async (targetUsername: string) => {
    if (!currentUser) return;
    try {
      // Create match and join target user as opponent
      const matchRes = await api.createMatch({
        player1Username: currentUser.username,
        durationSeconds: 900,
      });

      if (matchRes.success) {
        await api.joinMatch(matchRes.data.code, targetUsername);
        setActiveTab('arena');
      }
    } catch (err) {
      console.error('Challenge failed:', err);
      setActiveTab('arena');
    }
  };

  const handleChallengeProblem = async (problemId: string) => {
    if (!currentUser) return;
    try {
      await api.createMatch({
        problemId,
        player1Username: currentUser.username,
        durationSeconds: 900,
      });
      setActiveTab('arena');
    } catch (err) {
      console.error('Problem duel match creation failed:', err);
      setActiveTab('arena');
    }
  };

  const backendStatus: 'healthy' | 'checking' | 'error' = loading
    ? 'checking'
    : error
    ? 'error'
    : 'healthy';

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        users={users}
        onSelectUser={setCurrentUser}
        backendStatus={backendStatus}
        latency={latency}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="main-content">
        <ErrorBoundary>
          {activeTab === 'arena' && (
            <ArenaBattleView
              currentUser={currentUser}
              users={users}
              onRefreshUsers={fetchUsers}
            />
          )}

          {activeTab === 'problems' && (
            <ProblemsView
              onChallengeProblem={handleChallengeProblem}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardView
              currentUser={currentUser}
              onChallengeUser={handleChallengeUser}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              onProfileUpdated={fetchUsers}
            />
          )}

          {activeTab === 'telemetry' && (
            <TelemetryView
              healthData={healthData}
              loading={loading}
              error={error}
              latency={latency}
              onRefresh={checkHealth}
              apiUrl={apiUrl}
            />
          )}
        </ErrorBoundary>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>© {new Date().getFullYear()} CodeArena. Unified Competitive Coding &amp; Real-Time Arena.</p>
          <div className="footer-links">
            <span className="footer-tag">Frontend: Vite + React 19</span>
            <span className="footer-separator">•</span>
            <span className="footer-tag">Backend: Express + Node VM</span>
            <span className="footer-separator">•</span>
            <span className="footer-tag">Database: Prisma SQLite</span>
            <span className="footer-separator">•</span>
            <span className="footer-tag">Sandboxed Evaluator</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
