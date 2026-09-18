'use client';

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      iconLeft,
      iconRight,
      children,
      ...props
    },
    ref
  ) => {
    const classNames = [
      'sc-btn',
      `sc-btn--${variant}`,
      `sc-btn--${size}`,
      loading ? 'sc-btn--loading' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classNames}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="sc-btn__spinner" />}
        {!loading && iconLeft && <span className="sc-btn__icon">{iconLeft}</span>}
        <span className="sc-btn__content">{children}</span>
        {!loading && iconRight && <span className="sc-btn__icon">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
