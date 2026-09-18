'use client';

import React, { forwardRef } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface Stage {
  label: string;
  description?: string;
}

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Percentage completed (0-100) for determinate mode */
  value?: number;
  /** Optional label for determinate mode */
  label?: string;
  /** Array of stages for stage-based mode */
  stages?: Stage[];
  /** Current active stage index (0-based) */
  activeStage?: number;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value, label, stages, activeStage, className = '', ...props }, ref) => {
    // Stage-based mode
    if (stages && stages.length > 0) {
      const currentStage = activeStage ?? 0;
      
      return (
        <div ref={ref} className={`sc-progress sc-progress-stage-mode ${className}`} {...props}>
          <div className="sc-progress-stages-container">
            {stages.map((stage, index) => {
              const isCompleted = index < currentStage;
              const isActive = index === currentStage;
              const isPending = index > currentStage;
              
              return (
                <div 
                  key={index} 
                  className={`sc-progress-stage ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isPending ? 'pending' : ''}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <div className="sc-progress-stage-icon">
                    {isCompleted && <CheckCircle2 className="sc-icon-completed" />}
                    {isActive && <Loader2 className="sc-icon-active" />}
                    {isPending && <Circle className="sc-icon-pending" />}
                  </div>
                  <div className="sc-progress-stage-content">
                    <span className="sc-progress-stage-label">{stage.label}</span>
                    {stage.description && (
                      <span className="sc-progress-stage-desc">{stage.description}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Determinate mode
    const clampedValue = Math.min(100, Math.max(0, value || 0));
    
    return (
      <div 
        ref={ref} 
        className={`sc-progress sc-progress-determinate ${className}`}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        {...props}
      >
        <div className="sc-progress-header">
          {label && <span className="sc-progress-label">{label}</span>}
          <span className="sc-progress-value">{clampedValue}%</span>
        </div>
        <div className="sc-progress-track">
          <div 
            className="sc-progress-fill" 
            style={{ width: `${clampedValue}%` }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
