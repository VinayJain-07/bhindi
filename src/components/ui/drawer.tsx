'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  width?: string | number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, width = 480, children, footer }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      
      if (drawerRef.current) {
        drawerRef.current.focus();
      }
      
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div className="sc-drawer-overlay" onClick={onClose}>
      <div 
        className="sc-drawer" 
        style={{ width: typeof width === 'number' ? `${width}px` : width }}
        role="dialog" 
        aria-modal="true" 
        ref={drawerRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sc-drawer-header">
          {title && <h2 className="sc-drawer-title">{title}</h2>}
          <button 
            className="sc-drawer-close" 
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="sc-drawer-content">
          {children}
        </div>
        
        {footer && (
          <div className="sc-drawer-footer">
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
