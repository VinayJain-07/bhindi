'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, description, children, footer }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      
      // Simple focus management
      if (modalRef.current) {
        modalRef.current.focus();
      }
      
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div className="sc-modal-overlay" onClick={onClose}>
      <div 
        className="sc-modal" 
        role="dialog" 
        aria-modal="true" 
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="sc-modal-close" 
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        
        {(title || description) && (
          <div className="sc-modal-header">
            {title && <h2 className="sc-modal-title">{title}</h2>}
            {description && <p className="sc-modal-description">{description}</p>}
          </div>
        )}
        
        <div className="sc-modal-content">
          {children}
        </div>
        
        {footer && (
          <div className="sc-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return null;
}
