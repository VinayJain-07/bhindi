'use client';

import React, { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  size?: 'sm' | 'md';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, size = 'md', className = '', maxLength, value, onChange, ...props }, ref) => {
    const id = useId();
    const inputId = props.id || id;
    
    return (
      <div className={`sc-input-wrapper ${className}`}>
        {label && (
          <label htmlFor={inputId} className="sc-input-label">
            {label}
          </label>
        )}
        <div className="sc-input-container">
          <input
            {...props}
            id={inputId}
            ref={ref}
            maxLength={maxLength}
            value={value}
            onChange={onChange}
            className={`sc-input sc-input--${size} ${error ? 'sc-input--error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
          />
        </div>
        
        <div className="sc-input-footer">
          {error ? (
            <span id={`${inputId}-error`} className="sc-input-message sc-input-message--error">
              <AlertCircle size={14} />
              {error}
            </span>
          ) : helperText ? (
            <span id={`${inputId}-helper`} className="sc-input-message">
              {helperText}
            </span>
          ) : <span />}
          
          {maxLength && (
            <span className="sc-input-count">
              {String(value || '').length} / {maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
