import type { I18nKey } from '../state/i18n';
import type { OperationMode, ThemeMode } from '../state/store';

interface TitlebarProps {
  title: string;
  isTaskRunning: boolean;
  operationMode: OperationMode;
  themeMode: ThemeMode;
  autoSwitchModeEnabled: boolean;
  isOperationModeDisabled: boolean;
  onToggleOperationMode: () => void;
  onToggleThemeMode: () => void;
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

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.4 2.6a1 1 0 0 0-1.2 1.3 7.6 7.6 0 0 1-9.4 9.4A1 1 0 0 0 2.6 14.6 10 10 0 1 0 14.4 2.6Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 2h2v3h-2V2Zm0 17h2v3h-2v-3Zm8-8h3v2h-3v-2ZM2 11h3v2H2v-2Zm14.4-5.8 1.4 1.4-2.1 2.1-1.4-1.4 2.1-2.1Zm-8.8 8.8 1.4 1.4-2.1 2.1-1.4-1.4 2.1-2.1Zm8.8 3.5-2.1-2.1 1.4-1.4 2.1 2.1-1.4 1.4Zm-8.8-8.8-2.1-2.1 1.4-1.4 2.1 2.1-1.4 1.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
    </svg>
  );
}

export default function Titlebar({
  title,
  isTaskRunning,
  operationMode,
  themeMode,
  autoSwitchModeEnabled,
  isOperationModeDisabled,
  onToggleOperationMode,
  onToggleThemeMode,
  onToggleAutoSwitchMode,
  onOpenSettings,
  onOpenAbout,
  onMinimize,
  onToggleMaximize,
  onClose,
  t
}: TitlebarProps) {
  const isProjectMode = operationMode === 'project';
  const modeLabel = autoSwitchModeEnabled ? t('autoSwitchLabel') : isProjectMode ? t('projectMode') : t('directMode');
  const modeClass = autoSwitchModeEnabled ? ' is-auto' : isProjectMode ? ' is-project' : ' is-direct';
  const modeAriaLabel = autoSwitchModeEnabled
    ? t('autoSwitchModeActive')
    : isProjectMode
      ? t('switchToDirectMode')
      : t('switchToProjectMode');
  const autoSwitchLabel = autoSwitchModeEnabled ? t('switchToManualMode') : t('switchToAutoSwitchMode');
  const autoSwitchStateLabel = autoSwitchModeEnabled ? t('autoSwitchModeActive') : t('autoSwitchModeInactive');
  const themeToggleLabel = themeMode === 'dark' ? t('switchToLightTheme') : t('switchToDarkTheme');
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
            className="titlebar-icon-btn titlebar-theme-btn"
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
            onClick={onToggleThemeMode}
          >
            {themeMode === 'dark' ? <MoonIcon /> : <SunIcon />}
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
