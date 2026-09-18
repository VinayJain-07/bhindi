'use client';

import React from 'react';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';

/* --------------------------------------------------------------------------
   Agent Page Layout
   Shared page template for all agent interfaces.
   Structure: compact header → split content (input + workspace) → progress
   -------------------------------------------------------------------------- */

export interface AgentAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export interface ProgressStage {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

export interface AgentPageLayoutProps {
  /** Agent icon element */
  icon: React.ReactNode;
  /** Agent name */
  agentName: string;
  /** One-sentence purpose */
  purpose: string;
  /** Optional status badge */
  status?: React.ReactNode;
  /** Primary action buttons in the header */
  actions?: AgentAction[];
  /** Overflow/secondary actions */
  secondaryActions?: AgentAction[];
  /** Optional back navigation handler */
  onBack?: () => void;
  /** Input panel (left side in desktop, top on mobile) */
  inputPanel?: React.ReactNode;
  /** Main workspace content (right side in desktop, bottom on mobile) */
  workspace: React.ReactNode;
  /** Live progress stages (shown between input and workspace when running) */
  progressStages?: ProgressStage[];
  /** Evidence/source drawer content (slide-in panel) */
  evidenceDrawer?: React.ReactNode;
  /** Whether the evidence drawer is open */
  evidenceDrawerOpen?: boolean;
  /** Callback to close the evidence drawer */
  onEvidenceDrawerClose?: () => void;
  /** Optional footer/version history */
  footer?: React.ReactNode;
  /** Layout mode: 'split' (editor+preview) or 'full' (full-width workspace) */
  layout?: 'split' | 'full';
  /** Custom class name */
  className?: string;
}

export function AgentPageLayout({
  icon,
  agentName,
  purpose,
  status,
  actions = [],
  secondaryActions = [],
  onBack,
  inputPanel,
  workspace,
  progressStages,
  evidenceDrawer,
  evidenceDrawerOpen = false,
  onEvidenceDrawerClose,
  footer,
  layout = 'split',
  className = '',
}: AgentPageLayoutProps) {
  const [showSecondaryMenu, setShowSecondaryMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu on outside click
  React.useEffect(() => {
    if (!showSecondaryMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowSecondaryMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSecondaryMenu]);

  const hasProgress = progressStages && progressStages.length > 0;
  const isRunning = progressStages?.some(s => s.status === 'active');

  return (
    <div className={`sc-agent-page ${className}`}>
      {/* ---- Compact Identity Header ---- */}
      <header className="sc-agent-header">
        <div className="sc-agent-header__left">
          {onBack && (
            <button
              className="sc-agent-header__back"
              onClick={onBack}
              aria-label="Go back"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <span className="sc-agent-header__icon" aria-hidden="true">
            {icon}
          </span>
          <div className="sc-agent-header__info">
            <h1 className="sc-agent-header__title">{agentName}</h1>
            <p className="sc-agent-header__purpose">{purpose}</p>
          </div>
          {status && (
            <div className="sc-agent-header__status">{status}</div>
          )}
        </div>

        <div className="sc-agent-header__actions">
          {actions.map((action, i) => (
            <button
              key={i}
              className={`sc-btn sc-btn--${action.variant || 'secondary'} sc-btn--sm`}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
            >
              {action.loading ? (
                <span className="sc-btn__spinner" aria-hidden="true" />
              ) : action.icon ? (
                <span className="sc-btn__icon">{action.icon}</span>
              ) : null}
              {action.label}
            </button>
          ))}

          {secondaryActions.length > 0 && (
            <div className="sc-agent-header__menu-wrap" ref={menuRef}>
              <button
                className="sc-btn sc-btn--ghost sc-btn--sm sc-btn--icon-only"
                onClick={() => setShowSecondaryMenu(v => !v)}
                aria-label="More actions"
                aria-expanded={showSecondaryMenu}
              >
                <MoreHorizontal size={16} />
              </button>
              {showSecondaryMenu && (
                <div className="sc-agent-header__menu" role="menu">
                  {secondaryActions.map((action, i) => (
                    <button
                      key={i}
                      className="sc-agent-header__menu-item"
                      role="menuitem"
                      onClick={() => {
                        action.onClick();
                        setShowSecondaryMenu(false);
                      }}
                      disabled={action.disabled}
                    >
                      {action.icon && (
                        <span className="sc-agent-header__menu-icon">
                          {action.icon}
                        </span>
                      )}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ---- Live Progress Bar ---- */}
      {hasProgress && (
        <div className="sc-agent-progress" role="status" aria-live="polite">
          <div className="sc-agent-progress__stages">
            {progressStages!.map((stage, i) => (
              <React.Fragment key={stage.id}>
                {i > 0 && (
                  <div
                    className={`sc-agent-progress__connector ${
                      stage.status === 'done' || stage.status === 'active'
                        ? 'sc-agent-progress__connector--active'
                        : ''
                    }`}
                  />
                )}
                <div
                  className={`sc-agent-progress__stage sc-agent-progress__stage--${stage.status}`}
                >
                  <div className="sc-agent-progress__dot">
                    {stage.status === 'done' && (
                      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                        <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {stage.status === 'active' && (
                      <span className="sc-agent-progress__pulse" />
                    )}
                  </div>
                  <span className="sc-agent-progress__label">{stage.label}</span>
                  {stage.description && (
                    <span className="sc-agent-progress__desc">{stage.description}</span>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* ---- Main Content Area ---- */}
      <div
        className={`sc-agent-content ${
          layout === 'split' && inputPanel
            ? 'sc-agent-content--split'
            : 'sc-agent-content--full'
        }`}
      >
        {/* Input Panel (left/top) */}
        {inputPanel && (
          <aside className="sc-agent-input-panel">{inputPanel}</aside>
        )}

        {/* Workspace (right/bottom) */}
        <main className="sc-agent-workspace">{workspace}</main>
      </div>

      {/* ---- Footer / Version History ---- */}
      {footer && <footer className="sc-agent-footer">{footer}</footer>}

      {/* ---- Evidence Drawer ---- */}
      {evidenceDrawer && evidenceDrawerOpen && (
        <>
          <div
            className="sc-agent-drawer-backdrop"
            onClick={onEvidenceDrawerClose}
            aria-hidden="true"
          />
          <aside
            className="sc-agent-evidence-drawer"
            role="complementary"
            aria-label="Evidence and sources"
          >
            <div className="sc-agent-evidence-drawer__header">
              <h2 className="sc-agent-evidence-drawer__title">
                Evidence & Sources
              </h2>
              <button
                className="sc-btn sc-btn--ghost sc-btn--sm"
                onClick={onEvidenceDrawerClose}
                aria-label="Close evidence drawer"
              >
                ✕
              </button>
            </div>
            <div className="sc-agent-evidence-drawer__body">
              {evidenceDrawer}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default AgentPageLayout;
