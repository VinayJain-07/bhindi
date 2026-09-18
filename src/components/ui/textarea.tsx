'use client';

import React, { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, className = '', maxLength, value, onChange, ...props }, ref) => {
    const id = useId();
    const textareaId = props.id || id;
    
    return (
      <div className={`sc-textarea-wrapper ${className}`}>
        {label && (
          <label htmlFor={textareaId} className="sc-textarea-label">
            {label}
          </label>
        )}
        <div className="sc-textarea-container">
          <textarea
            {...props}
            id={textareaId}
            ref={ref}
            maxLength={maxLength}
            value={value}
            onChange={onChange}
            className={`sc-textarea ${error ? 'sc-textarea--error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
            }
          />
        </div>
        
        <div className="sc-textarea-footer">
          {error ? (
            <span id={`${textareaId}-error`} className="sc-textarea-message sc-textarea-message--error">
              <AlertCircle size={14} />
              {error}
            </span>
          ) : helperText ? (
            <span id={`${textareaId}-helper`} className="sc-textarea-message">
              {helperText}
            </span>
          ) : <span />}
          
          {maxLength && (
            <span className="sc-textarea-count">
              {String(value || '').length} / {maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
