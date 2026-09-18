'use client';

import React, { forwardRef, useState, KeyboardEvent } from 'react';
import { Badge } from './badge';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: TabItem[];
  defaultSelectedId?: string;
  onChange?: (id: string) => void;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    { className = '', items, defaultSelectedId, onChange, ...props },
    ref
  ) => {
    const [selectedId, setSelectedId] = useState(defaultSelectedId || items[0]?.id);
    const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

    const handleSelect = (id: string) => {
      setSelectedId(id);
      if (onChange) onChange(id);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      let nextIndex = -1;
      if (e.key === 'ArrowRight') {
        nextIndex = (index + 1) % items.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (index - 1 + items.length) % items.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = items.length - 1;
      }

      if (nextIndex !== -1) {
        e.preventDefault();
        tabRefs.current[nextIndex]?.focus();
        handleSelect(items[nextIndex].id);
      }
    };

    const selectedItem = items.find((item) => item.id === selectedId);

    return (
      <div ref={ref} className={`sc-tabs ${className}`} {...props}>
        <div
          className="sc-tabs__list"
          role="tablist"
          aria-label="Tabs"
        >
          {items.map((item, index) => {
            const isSelected = item.id === selectedId;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                role="tab"
                aria-selected={isSelected}
                aria-controls={`sc-tabpanel-${item.id}`}
                id={`sc-tab-${item.id}`}
                tabIndex={isSelected ? 0 : -1}
                className={`sc-tabs__tab ${isSelected ? 'sc-tabs__tab--active' : ''}`}
                onClick={() => handleSelect(item.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              >
                {item.label}
                {item.count !== undefined && (
                  <Badge variant={isSelected ? 'accent' : 'default'} size="sm" className="sc-tabs__badge">
                    {item.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`sc-tabpanel-${selectedId}`}
          aria-labelledby={`sc-tab-${selectedId}`}
          className="sc-tabs__panel"
          tabIndex={0}
        >
          {selectedItem?.content}
        </div>
      </div>
    );
  }
);
Tabs.displayName = 'Tabs';
