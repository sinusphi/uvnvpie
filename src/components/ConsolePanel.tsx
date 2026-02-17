import { useEffect, useRef } from 'react';
import type { I18nKey } from '../state/i18n';

interface ConsolePanelProps {
  lines: string[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onExit: () => void;
  onClear: () => void;
  t: (key: I18nKey) => string;
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}

export default function ConsolePanel({
  lines,
  collapsed,
  onToggleCollapsed,
  onExit,
  onClear,
  t
}: ConsolePanelProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const toggleLabel = collapsed ? t('expandConsole') : t('collapseConsole');

  useEffect(() => {
    if (collapsed || !bodyRef.current) {
      return;
    }

    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines, collapsed]);

  return (
    <section className={`console-panel${collapsed ? ' collapsed' : ''}`}>
      <header>
        <div className="console-title-group">
          <button type="button" className="console-collapse-button" onClick={onToggleCollapsed} aria-label={toggleLabel}>
            <span className={collapsed ? 'chevron right' : 'chevron down'} aria-hidden="true" />
          </button>
          <h3>{t('consoleOutput')}</h3>
        </div>
        <div className="console-tools">
          <button type="button" className="icon-button" onClick={onClear}>
            {t('clear')}
          </button>
          <button type="button" className="icon-button" aria-label={t('placeholder')}>
            <DotsIcon />
          </button>
        </div>
      </header>

      {!collapsed ? (
        <>
          <div ref={bodyRef} className="console-body">
            {lines.map((line, index) => (
              <p key={`${line}-${index}`}>{line}</p>
            ))}
          </div>

          {/* Exit action intentionally hidden for now, keep implementation for later use.
          <div className="console-footer">
            <button type="button" className="exit-button" onClick={onExit}>
              {t('exit')}
            </button>
          </div>
          */}
        </>
      ) : null}
    </section>
  );
}
