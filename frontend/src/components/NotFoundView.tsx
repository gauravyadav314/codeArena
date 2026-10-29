import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, ArrowLeft, AlertTriangle } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="not-found-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <AlertTriangle size={32} />
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        404 - Arena Route Not Found
      </h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '1.5rem' }}>
        The arena battle, problem, or profile URL you followed does not exist or has concluded.
      </p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => navigate('/arena')}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
        >
          <Swords size={18} />
          <span>Return to Arena</span>
        </button>
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
        >
          <ArrowLeft size={18} />
          <span>Go Back</span>
        </button>
      </div>
    </div>
  );
};
