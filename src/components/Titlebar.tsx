import type { I18nKey } from '../state/i18n';

interface TitlebarProps {
  title: string;
  isTaskRunning: boolean;
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
  onOpenSettings,
  onOpenAbout,
  onMinimize,
  onToggleMaximize,
  onClose,
  t
}: TitlebarProps) {
  return (
    <header className="titlebar" data-tauri-drag-region>
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

      <div className="titlebar-right" data-tauri-drag-region>
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

      <div className={`titlebar-task-runway${isTaskRunning ? ' is-active' : ''}`} aria-hidden="true">
        <span className="titlebar-task-glow" />
      </div>
    </header>
  );
}
