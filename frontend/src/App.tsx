import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, type TabType } from './components/Navbar';
import { ArenaBattleView } from './components/ArenaBattleView';
import { ProblemsView } from './components/ProblemsView';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView } from './components/ProfileView';
import { TelemetryView } from './components/TelemetryView';
import { NotFoundView } from './components/NotFoundView';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { HealthResponse } from './components/HealthProbeCard';
import type { User } from './types';
import { api } from './services/api';
import './App.css';

export function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path
  const getTabFromPath = (pathname: string): TabType => {
    if (pathname.startsWith('/problems')) return 'problems';
    if (pathname.startsWith('/leaderboard')) return 'leaderboard';
    if (pathname.startsWith('/profile')) return 'profile';
    if (pathname.startsWith('/telemetry')) return 'telemetry';
    return 'arena';
  };

  const [activeTab, setActiveTab] = useState<TabType>(() => getTabFromPath(location.pathname));
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  // Handle tab switching via React Router
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'arena') navigate('/arena');
    else if (tab === 'problems') navigate('/problems');
    else if (tab === 'leaderboard') navigate('/leaderboard');
    else if (tab === 'profile') navigate('/profile');
    else if (tab === 'telemetry') navigate('/telemetry');
  };

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
      const matchRes = await api.createMatch({
        player1Username: currentUser.username,
        durationSeconds: 900,
      });

      if (matchRes.success) {
        await api.joinMatch(matchRes.data.code, targetUsername);
        navigate(`/arena/${matchRes.data.code}`);
      }
    } catch (err) {
      console.error('Challenge failed:', err);
      navigate('/arena');
    }
  };

  const handleChallengeProblem = async (problemId: string) => {
    if (!currentUser) return;
    try {
      const matchRes = await api.createMatch({
        problemId,
        player1Username: currentUser.username,
        durationSeconds: 900,
      });
      if (matchRes.success) {
        navigate(`/arena/${matchRes.data.code}`);
      }
    } catch (err) {
      console.error('Problem duel match creation failed:', err);
      navigate('/arena');
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
        onTabChange={handleTabChange}
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
          <Routes>
            <Route path="/" element={<Navigate to="/arena" replace />} />
            
            <Route
              path="/arena"
              element={
                <ArenaBattleView
                  currentUser={currentUser}
                  users={users}
                  onRefreshUsers={fetchUsers}
                  theme={theme}
                />
              }
            />
            <Route
              path="/arena/:code"
              element={
                <ArenaBattleView
                  currentUser={currentUser}
                  users={users}
                  onRefreshUsers={fetchUsers}
                  theme={theme}
                />
              }
            />

            <Route
              path="/problems"
              element={
                <ProblemsView
                  onChallengeProblem={handleChallengeProblem}
                  currentUser={currentUser}
                  theme={theme}
                />
              }
            />
            <Route
              path="/problems/:slug"
              element={
                <ProblemsView
                  onChallengeProblem={handleChallengeProblem}
                  currentUser={currentUser}
                  theme={theme}
                />
              }
            />

            <Route
              path="/leaderboard"
              element={
                <LeaderboardView
                  currentUser={currentUser}
                  onChallengeUser={handleChallengeUser}
                />
              }
            />

            <Route
              path="/profile"
              element={
                <ProfileView
                  currentUser={currentUser}
                  onProfileUpdated={fetchUsers}
                />
              }
            />
            <Route
              path="/profile/:username"
              element={
                <ProfileView
                  currentUser={currentUser}
                  onProfileUpdated={fetchUsers}
                />
              }
            />

            <Route
              path="/telemetry"
              element={
                <TelemetryView
                  healthData={healthData}
                  loading={loading}
                  error={error}
                  latency={latency}
                  onRefresh={checkHealth}
                  apiUrl={apiUrl}
                />
              }
            />

            <Route path="*" element={<NotFoundView />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Global Status Bar */}
      <footer className="footer-status-bar">
        <div className="footer-status-left">
          <span className="dot-pulse" />
          <span>System Status: <strong>{backendStatus.toUpperCase()}</strong></span>
          {latency !== null && <span className="footer-pipe">•</span>}
          {latency !== null && <span>API Latency: <strong>{latency}ms</strong></span>}
        </div>
        <div className="footer-status-right">
          <span>CodeArena Engine v2.0 • Real-Time 1v1 Algorithmic Battleground</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
