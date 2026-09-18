'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

export interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  textToCopy: string;
}

export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    { className = '', textToCopy, title = 'Copy to clipboard', ...props },
    ref
  ) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
      let timeout: NodeJS.Timeout;
      if (copied) {
        timeout = setTimeout(() => {
          setCopied(false);
        }, 2000);
      }
      return () => clearTimeout(timeout);
    }, [copied]);

    const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
      } catch (err) {
        console.error('Failed to copy text', err);
      }
    };

    const classNames = [
      'sc-copy-btn',
      copied ? 'sc-copy-btn--copied' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type="button"
        className={classNames}
        onClick={handleCopy}
        title={title}
        aria-label={copied ? 'Copied' : title}
        {...props}
      >
        {copied ? (
          <>
            <Check className="sc-copy-btn__icon sc-copy-btn__icon--check" />
            <span className="sc-copy-btn__text">Copied</span>
          </>
        ) : (
          <>
            <Copy className="sc-copy-btn__icon" />
            <span className="sc-copy-btn__text">Copy</span>
          </>
        )}
      </button>
    );
  }
);
CopyButton.displayName = 'CopyButton';
