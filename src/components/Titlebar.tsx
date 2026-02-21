import type { I18nKey } from '../state/i18n';
import type { OperationMode } from '../state/store';

interface TitlebarProps {
  title: string;
  isTaskRunning: boolean;
  operationMode: OperationMode;
  autoSwitchModeEnabled: boolean;
  isOperationModeDisabled: boolean;
  onToggleOperationMode: () => void;
  onToggleAutoSwitchMode: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  t: (key: I18nKey) => string;
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.4 2h3.2l.4 2.2c.5.2 1 .4 1.5.7l2-1.2 2.3 2.3-1.2 2c.3.5.5 1 .7 1.5L22 10.4v3.2l-2.2.4c-.2.5-.4 1-.7 1.5l1.2 2-2.3 2.3-2-1.2c-.5.3-1 .5-1.5.7L13.6 22h-3.2l-.4-2.2c-.5-.2-1-.4-1.5-.7l-2 1.2-2.3-2.3 1.2-2c-.3-.5-.5-1-.7-1.5L2 13.6v-3.2l2.2-.4c.2-.5.4-1 .7-1.5l-1.2-2 2.3-2.3 2 1.2c.5-.3 1-.5 1.5-.7L10.4 2Zm1.6 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 4a1.3 1.3 0 1 0 0 2.6A1.3 1.3 0 0 0 12 6Zm-1.2 4.6v1.8h1v4h-1v1.8h4.4v-1.8h-1v-5.8h-3.4Z" />
    </svg>
  );
}

export default function Titlebar({
  title,
  isTaskRunning,
  operationMode,
  autoSwitchModeEnabled,
  isOperationModeDisabled,
  onToggleOperationMode,
  onToggleAutoSwitchMode,
  onOpenSettings,
  onOpenAbout,
  onMinimize,
  onToggleMaximize,
  onClose,
  t
}: TitlebarProps) {
  const isProjectMode = operationMode === 'project';
  const isDirectMode = !isProjectMode;
  const modeLabel = autoSwitchModeEnabled ? t('autoSwitchLabel') : isProjectMode ? t('projectMode') : t('directMode');
  const modeClass = autoSwitchModeEnabled ? ' is-auto' : isProjectMode ? ' is-project' : ' is-direct';
  const modeAriaLabel = autoSwitchModeEnabled
    ? t('autoSwitchModeActive')
    : isProjectMode
      ? t('switchToDirectMode')
      : t('switchToProjectMode');
  const autoSwitchLabel = autoSwitchModeEnabled ? t('switchToManualMode') : t('switchToAutoSwitchMode');
  const autoSwitchStateLabel = autoSwitchModeEnabled ? t('autoSwitchModeActive') : t('autoSwitchModeInactive');
  const operationModeButtonDisabled = isOperationModeDisabled || autoSwitchModeEnabled;

  return (
    <header className="titlebar" data-operation-mode={operationMode}>
      <div className="titlebar-left" data-tauri-drag-region>
        <div className="brand-mark" aria-hidden="true">
          <span />
        </div>
        <span className="brand-name">uvnvpie</span>
        <div className="titlebar-pills" data-tauri-drag-region>
          <span className="titlebar-pill" />
          <span className="titlebar-pill" />
        </div>
      </div>

      <div className="titlebar-center" data-tauri-drag-region>
        <span className="titlebar-title">{title}</span>
      </div>

      <div className="titlebar-right">
        <div className="titlebar-right-drag" data-tauri-drag-region />
        <div className="titlebar-right-actions">
          {isDirectMode ? (
            <div className="titlebar-direct-warning" aria-hidden="true">
              <span className="titlebar-direct-warning-text">
                <span>Lock / Sync</span>
                <span>unavailable</span>
              </span>
              <span className="titlebar-direct-warning-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M12.9 3.2a1 1 0 0 0-1.8 0L2.2 19.4c-.4.8.2 1.8 1.1 1.8h17.4c.9 0 1.5-1 1.1-1.8L12.9 3.2Zm-.9 5.5h0.1c.4 0 .8.3.8.8v5.3c0 .4-.4.8-.8.8H12c-.4 0-.8-.4-.8-.8V9.5c0-.5.4-.8.8-.8Zm.1 9.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
                </svg>
              </span>
            </div>
          ) : null}
          <button
            type="button"
            className={`titlebar-mode-btn${modeClass}`}
            onClick={onToggleOperationMode}
            aria-pressed={autoSwitchModeEnabled ? undefined : isProjectMode}
            aria-label={modeAriaLabel}
            disabled={operationModeButtonDisabled}
          >
            {modeLabel}
          </button>
          <button
            type="button"
            className={`titlebar-auto-switch${autoSwitchModeEnabled ? ' is-active' : ''}`}
            role="switch"
            aria-checked={autoSwitchModeEnabled}
            aria-label={autoSwitchLabel}
            title={autoSwitchStateLabel}
            onClick={onToggleAutoSwitchMode}
            disabled={isOperationModeDisabled}
          >
            <span className="titlebar-auto-switch-track" aria-hidden="true">
              <span className="titlebar-auto-switch-thumb" />
            </span>
          </button>
          <button
            type="button"
            className="titlebar-icon-btn"
            aria-label={t('settings')}
            onClick={onOpenSettings}
          >
            <GearIcon />
          </button>
          <button
            type="button"
            className="titlebar-icon-btn"
            aria-label={t('about')}
            onClick={onOpenAbout}
          >
            <InfoIcon />
          </button>

          <div className="window-controls">
            <button
              type="button"
              className="window-control"
              aria-label="Minimize window"
              onClick={onMinimize}
            >
              <span />
            </button>
            <button
              type="button"
              className="window-control"
              aria-label="Toggle maximize window"
              onClick={onToggleMaximize}
            >
              <span className="square" />
            </button>
            <button
              type="button"
              className="window-control danger"
              aria-label="Close window"
              onClick={onClose}
            >
              <span className="close-mark" />
            </button>
          </div>
        </div>
      </div>

      <div className={`titlebar-task-runway${isTaskRunning ? ' is-active' : ''}`} aria-hidden="true">
        <span className="titlebar-task-glow" />
      </div>
    </header>
  );
}
