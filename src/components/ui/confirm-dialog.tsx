'use client';

import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed without confirming */
  onClose: () => void;
  /** Callback when confirm button is clicked */
  onConfirm: () => void | Promise<void>;
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Visual variant affecting the confirm button */
  variant?: 'default' | 'danger';
  /** Text for confirm button */
  confirmText?: string;
  /** Text for cancel button */
  cancelText?: string;
  /** Loading state for confirm button */
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'default',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="sc-confirm-backdrop" role="presentation">
      <div 
        className="sc-confirm-dialog" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="sc-confirm-title"
        aria-describedby="sc-confirm-message"
        ref={dialogRef}
      >
        <div className="sc-confirm-content">
          <h2 id="sc-confirm-title" className="sc-confirm-title">{title}</h2>
          <p id="sc-confirm-message" className="sc-confirm-message">{message}</p>
        </div>
        <div className="sc-confirm-actions">
          <button 
            className="sc-confirm-btn sc-confirm-btn-cancel" 
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button 
            className={`sc-confirm-btn sc-confirm-btn-${variant}`} 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="sc-confirm-spinner" size={16} />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
