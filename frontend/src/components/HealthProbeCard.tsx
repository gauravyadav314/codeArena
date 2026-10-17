import React, { useState } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, Clock, Server, Layers } from 'lucide-react';

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

interface HealthProbeCardProps {
  healthData: HealthResponse | null;
  loading: boolean;
  error: string | null;
  latency: number | null;
  onRefresh: () => void;
  apiUrl: string;
}

export const HealthProbeCard: React.FC<HealthProbeCardProps> = ({
  healthData,
  loading,
  error,
  latency,
  onRefresh,
  apiUrl,
}) => {
  const [showRaw, setShowRaw] = useState(false);

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const remainingSecs = Math.floor(seconds % 60);
    return `${mins}m ${remainingSecs}s`;
  };

  return (
    <div className="card health-card" id="health-probe-container">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon-wrap">
            <Activity className="card-icon text-cyan" size={20} />
          </div>
          <div>
            <h2 className="card-title">Backend Health Verification</h2>
            <p className="card-subtitle">
              Target:{' '}
              <span className="mono-badge" id="api-target-url">
                {apiUrl}/api/health
              </span>
            </p>
          </div>
        </div>

        <button
          id="refresh-health-btn"
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh health check"
        >
          <RefreshCw size={15} className={loading ? 'spin-animation' : ''} />
          <span>{loading ? 'Probing...' : 'Check Health'}</span>
        </button>
      </div>

      <div className="card-body">
        {error ? (
          <div className="alert alert-error" id="health-error-state">
            <AlertTriangle size={20} className="alert-icon" />
            <div className="alert-content">
              <strong>Backend Inactive or Unreachable</strong>
              <p>{error}</p>
              <p className="alert-hint">
                Start the backend server on port 5001 with <code>cd backend &amp;&amp; npm run dev</code>.
              </p>
            </div>
          </div>
        ) : healthData ? (
          <div className="health-grid" id="health-details-grid">
            <div className="metric-box">
              <div className="metric-label">
                <CheckCircle2 size={15} className="text-emerald" />
                <span>Status</span>
              </div>
              <div className="metric-value text-emerald" id="health-status-value">
                {healthData.status.toUpperCase()}
              </div>
              <span className="metric-sub">HTTP 200 OK</span>
            </div>

            <div className="metric-box">
              <div className="metric-label">
                <Clock size={15} className="text-cyan" />
                <span>Uptime</span>
              </div>
              <div className="metric-value mono" id="health-uptime-value">
                {formatUptime(healthData.uptime)}
              </div>
              <span className="metric-sub">Process runtime</span>
            </div>

            <div className="metric-box">
              <div className="metric-label">
                <Server size={15} className="text-indigo" />
                <span>Environment</span>
              </div>
              <div className="metric-value mono" id="health-env-value">
                {healthData.environment}
              </div>
              <span className="metric-sub">NODE_ENV</span>
            </div>

            <div className="metric-box">
              <div className="metric-label">
                <Layers size={15} className="text-amber" />
                <span>Latency</span>
              </div>
              <div className="metric-value mono" id="health-latency-value">
                {latency !== null ? `${latency} ms` : '—'}
              </div>
              <span className="metric-sub">Round-trip response</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>Click "Check Health" to test the connection to the backend server.</p>
          </div>
        )}

        {healthData && (
          <div className="raw-toggle-wrap">
            <button
              id="toggle-raw-json-btn"
              className="btn-text"
              onClick={() => setShowRaw(!showRaw)}
            >
              {showRaw ? 'Hide Raw Response ▲' : 'View JSON Payload ▼'}
            </button>

            {showRaw && (
              <pre className="code-block" id="raw-json-block">
                {JSON.stringify(healthData, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
