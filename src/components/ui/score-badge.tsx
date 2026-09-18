'use client';

import React, { forwardRef } from 'react';

export interface ScoreBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Numeric score from 0 to 100 */
  score: number;
  /** Visual variant */
  variant?: 'pill' | 'circular';
  /** Whether to show the tier label text */
  showLabel?: boolean;
}

export const ScoreBadge = forwardRef<HTMLDivElement, ScoreBadgeProps>(
  ({ score, variant = 'pill', showLabel = false, className = '', ...props }, ref) => {
    const clampedScore = Math.min(100, Math.max(0, score));
    
    let tier = 'low';
    let tierLabel = 'LOW';
    
    if (clampedScore >= 90) {
      tier = 'exceptional';
      tierLabel = 'EXCEPTIONAL';
    } else if (clampedScore >= 70) {
      tier = 'high';
      tierLabel = 'HIGH';
    } else if (clampedScore >= 50) {
      tier = 'medium';
      tierLabel = 'MEDIUM';
    }

    if (variant === 'circular') {
      const radius = 18;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (clampedScore / 100) * circumference;

      return (
        <div 
          ref={ref}
          className={`sc-score sc-score-circular sc-score-${tier} ${className}`}
          aria-label={`Score: ${clampedScore}`}
          {...props}
        >
          <div className="sc-score-svg-wrapper">
            <svg className="sc-score-svg" viewBox="0 0 44 44">
              <circle
                className="sc-score-ring-bg"
                cx="22" cy="22" r={radius}
                strokeWidth="4" fill="none"
              />
              <circle
                className="sc-score-ring-fg"
                cx="22" cy="22" r={radius}
                strokeWidth="4" fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
              />
            </svg>
            <div className="sc-score-value-overlay">
              <span className="sc-score-value">{clampedScore}</span>
            </div>
          </div>
          {showLabel && <span className="sc-score-label">{tierLabel}</span>}
        </div>
      );
    }

    return (
      <div 
        ref={ref}
        className={`sc-score sc-score-pill sc-score-${tier} ${className}`}
        aria-label={`Score: ${clampedScore}`}
        {...props}
      >
        <span className="sc-score-value">{clampedScore}</span>
        {showLabel && <span className="sc-score-label">{tierLabel}</span>}
      </div>
    );
  }
);

ScoreBadge.displayName = 'ScoreBadge';
