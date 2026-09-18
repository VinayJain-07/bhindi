'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`sc-empty-state ${className}`}>
      {Icon && (
        <div className="sc-empty-state-icon">
          <Icon size={48} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="sc-empty-state-title">{title}</h3>
      {description && <p className="sc-empty-state-description">{description}</p>}
      {action && <div className="sc-empty-state-action">{action}</div>}
    </div>
  );
}
