'use client';

import React, { forwardRef, KeyboardEvent } from 'react';

export interface FilterItem {
  id: string;
  label: string;
  count?: number;
}

export interface FilterBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Array of filter items */
  filters: FilterItem[];
  /** Currently active filter ID */
  activeFilterId: string;
  /** Callback when a filter is selected */
  onFilterChange: (id: string) => void;
}

export const FilterBar = forwardRef<HTMLDivElement, FilterBarProps>(
  ({ filters, activeFilterId, onFilterChange, className = '', ...props }, ref) => {
    
    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onFilterChange(id);
      }
    };

    return (
      <div 
        ref={ref}
        className={`sc-filter-bar ${className}`}
        role="tablist"
        aria-orientation="horizontal"
        {...props}
      >
        <div className="sc-filter-scroll-container">
          {filters.map((filter) => {
            const isActive = filter.id === activeFilterId;
            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`sc-filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => onFilterChange(filter.id)}
                onKeyDown={(e) => handleKeyDown(e, filter.id)}
              >
                <span className="sc-filter-chip-label">{filter.label}</span>
                {filter.count !== undefined && (
                  <span className="sc-filter-chip-count">{filter.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

FilterBar.displayName = 'FilterBar';
