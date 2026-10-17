import React from 'react';
import { HealthProbeCard, type HealthResponse } from './HealthProbeCard';
import { StackMatrix } from './StackMatrix';
import { Activity, ShieldCheck, Cpu, Database } from 'lucide-react';

interface TelemetryViewProps {
  healthData: HealthResponse | null;
  loading: boolean;
  error: string | null;
  latency: number | null;
  onRefresh: () => void;
  apiUrl: string;
}

export const TelemetryView: React.FC<TelemetryViewProps> = ({
  healthData,
  loading,
  error,
  latency,
  onRefresh,
  apiUrl,
}) => {
  return (
    <div className="telemetry-view-container">
      {/* Telemetry Header */}
      <div className="telemetry-hero-header">
        <div className="pill-badge">
          <Activity size={14} className="text-cyan" />
          <span>Core Telemetry &amp; System Health</span>
        </div>
        <h1>System Architecture &amp; Live Probes</h1>
        <p>
          Continuous real-time diagnostics monitoring API uptime, Node.js microservices latency,
          Prisma ORM connection pool, and SQLite database health.
        </p>

        <div className="telemetry-stat-pills">
          <div className="summary-pill">
            <ShieldCheck size={16} className="text-emerald" />
            <span className="summary-val">{error ? 'Degraded' : 'Operational'}</span>
            <span className="summary-lbl">Cluster Status</span>
          </div>
          <div className="summary-pill">
            <Cpu size={16} className="text-cyan" />
            <span className="summary-val">{latency ? `${latency}ms` : '--'}</span>
            <span className="summary-lbl">Round-Trip Latency</span>
          </div>
          <div className="summary-pill">
            <Database size={16} className="text-amber" />
            <span className="summary-val">Prisma 5.22</span>
            <span className="summary-lbl">SQLite Engine</span>
          </div>
        </div>
      </div>

      {/* Health Probe & System Status Section */}
      <section className="status-section">
        <HealthProbeCard
          healthData={healthData}
          loading={loading}
          error={error}
          latency={latency}
          onRefresh={onRefresh}
          apiUrl={apiUrl}
        />
      </section>

      {/* Architectural Verification Section */}
      <section className="matrix-section">
        <StackMatrix />
      </section>
    </div>
  );
};
