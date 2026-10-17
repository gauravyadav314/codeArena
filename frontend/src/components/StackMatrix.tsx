import React from 'react';
import { Database, Code2, Globe, Cpu, Check, ArrowRight } from 'lucide-react';

export const StackMatrix: React.FC = () => {
  const stackItems = [
    {
      title: 'Frontend Client',
      badge: 'React 18 + Vite + TS',
      icon: <Globe className="stack-icon text-cyan" size={20} />,
      desc: 'Blazing fast Vite bundler, strict TypeScript type checking, and isolated environment variables.',
      port: 'Port 5173',
      verified: true,
    },
    {
      title: 'Backend API Service',
      badge: 'Node.js + Express + TS',
      icon: <Cpu className="stack-icon text-indigo" size={20} />,
      desc: 'CommonJS TypeScript build, centralized error handling, 404 router, and graceful shutdown handlers.',
      port: 'Port 5001',
      verified: true,
    },
    {
      title: 'ORM & Data Layer',
      badge: 'Prisma + PostgreSQL',
      icon: <Database className="stack-icon text-emerald" size={20} />,
      desc: 'Prisma CLI 5.22 initialized with PostgreSQL datasource provider and validated schema.',
      port: 'Schema Validated',
      verified: true,
    },
    {
      title: 'Future Arena Engine',
      badge: 'Next Milestones',
      icon: <Code2 className="stack-icon text-amber" size={20} />,
      desc: 'Scoped for subsequent milestones: Platform scraping, live Socket.IO rooms, and code runner judge.',
      port: 'Planned',
      verified: false,
    },
  ];

  return (
    <div className="card matrix-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Architecture Foundation Matrix</h2>
          <p className="card-subtitle">
            Core stack elements initialized and verified for milestone v0.1.0
          </p>
        </div>
      </div>

      <div className="stack-grid">
        {stackItems.map((item, idx) => (
          <div key={idx} className={`stack-box ${item.verified ? 'verified' : 'planned'}`}>
            <div className="stack-box-top">
              <div className="stack-icon-wrapper">{item.icon}</div>
              <span className={`status-tag ${item.verified ? 'tag-green' : 'tag-amber'}`}>
                {item.verified ? (
                  <>
                    <Check size={12} /> Ready
                  </>
                ) : (
                  'Next Up'
                )}
              </span>
            </div>

            <h3 className="stack-item-title">{item.title}</h3>
            <span className="stack-item-badge">{item.badge}</span>
            <p className="stack-item-desc">{item.desc}</p>

            <div className="stack-box-footer">
              <span className="port-indicator">{item.port}</span>
              {item.verified && <span className="verified-dot" title="Configuration verified" />}
            </div>
          </div>
        ))}
      </div>

      <div className="next-steps-banner">
        <div className="banner-content">
          <span className="banner-badge">Scope Notice</span>
          <p>
            Authentication, database entities, external coding-platform API sync, and Socket.IO
            connections are intentionally deferred until subsequent milestones per project requirements.
          </p>
        </div>
        <div className="banner-action">
          <span className="banner-link">
            Milestone 1 Complete <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
};
