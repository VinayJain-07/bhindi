'use client';

import React, { forwardRef } from 'react';

export type AgentStatus = 'idle' | 'running' | 'done' | 'error';

export interface AgentStatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The current status of the agent */
  status: AgentStatus;
  /** Optional custom label, defaults to capitalized status */
  label?: string;
}

export const AgentStatusIndicator = forwardRef<HTMLDivElement, AgentStatusIndicatorProps>(
  ({ status, label, className = '', ...props }, ref) => {
    const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

    return (
      <div 
        ref={ref}
        className={`sc-agent-status sc-agent-status-${status} ${className}`}
        role="status"
        aria-live="polite"
        {...props}
      >
        <div className="sc-agent-status-dot-container">
          <div className="sc-agent-status-dot" />
          {status === 'running' && <div className="sc-agent-status-dot-pulse" />}
        </div>
        <span className="sc-agent-status-label">{displayLabel}</span>
      </div>
    );
  }
);

AgentStatusIndicator.displayName = 'AgentStatusIndicator';
