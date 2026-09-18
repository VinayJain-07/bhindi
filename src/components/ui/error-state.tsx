'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, className = '' }: ErrorStateProps) {
  return (
    <div className={`sc-error-state ${className}`}>
      <div className="sc-error-state-icon">
        <AlertCircle size={32} />
      </div>
      <div className="sc-error-state-content">
        <h3 className="sc-error-state-title">{title}</h3>
        <p className="sc-error-state-message">{message}</p>
        {onRetry && (
          <button 
            onClick={onRetry} 
            className="sc-error-state-retry"
            type="button"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
