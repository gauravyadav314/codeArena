import React from 'react';

interface SkeletonLoaderProps {
  rows?: number;
  type?: 'card' | 'table-row' | 'code' | 'badge';
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  rows = 3,
  type = 'card',
  className = '',
}) => {
  return (
    <div className={`skeleton-container skeleton-${type} ${className}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="skeleton-item animate-pulse">
          {type === 'card' && (
            <div className="skeleton-card-body">
              <div className="skeleton-line line-title" style={{ width: '60%', height: '1.25rem', marginBottom: '0.75rem', borderRadius: '4px' }} />
              <div className="skeleton-line line-desc" style={{ width: '90%', height: '0.85rem', marginBottom: '0.5rem', borderRadius: '4px' }} />
              <div className="skeleton-line line-desc" style={{ width: '40%', height: '0.85rem', borderRadius: '4px' }} />
            </div>
          )}
          {type === 'table-row' && (
            <div className="skeleton-table-row-body" style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0' }}>
              <div style={{ width: '10%', height: '1rem', borderRadius: '4px' }} />
              <div style={{ width: '40%', height: '1rem', borderRadius: '4px' }} />
              <div style={{ width: '25%', height: '1rem', borderRadius: '4px' }} />
              <div style={{ width: '25%', height: '1rem', borderRadius: '4px' }} />
            </div>
          )}
          {type === 'code' && (
            <div className="skeleton-code-line" style={{ width: `${Math.floor(Math.random() * 50) + 40}%`, height: '1rem', marginBottom: '0.4rem', borderRadius: '3px' }} />
          )}
        </div>
      ))}
    </div>
  );
};
