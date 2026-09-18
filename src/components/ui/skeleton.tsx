'use client';

import React, { forwardRef } from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'card' | 'circle' | 'custom';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    { className = '', variant = 'text', width, height, style, ...props },
    ref
  ) => {
    const classNames = [
      'sc-skeleton',
      `sc-skeleton--${variant}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const combinedStyle = {
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
      ...style,
    };

    return (
      <div
        ref={ref}
        className={classNames}
        style={combinedStyle}
        aria-hidden="true"
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';
