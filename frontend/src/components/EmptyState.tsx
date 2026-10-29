import React from 'react';
import { FolderSearch, PlusCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction,
}) => {
  return (
    <div className="empty-state-card" style={{
      textAlign: 'center',
      padding: '3rem 1.5rem',
      background: 'var(--bg-secondary)',
      border: '1px dashed var(--border-color)',
      borderRadius: '8px',
      margin: '1.5rem 0'
    }}>
      <div className="empty-state-icon" style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.05)',
        color: 'var(--text-muted)',
        marginBottom: '1rem'
      }}>
        {icon || <FolderSearch size={24} />}
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.25rem' }}>
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <PlusCircle size={16} />
          {actionText}
        </button>
      )}
    </div>
  );
};
