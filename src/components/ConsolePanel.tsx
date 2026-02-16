import type { I18nKey } from '../state/i18n';

interface ConsolePanelProps {
  lines: string[];
  isJobRunning: boolean;
  onAbort: () => void;
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

export default function ConsolePanel({ lines, isJobRunning, onAbort, onClear, t }: ConsolePanelProps) {
  return (
    <section className="console-panel">
      <header>
        <h3>{t('consoleOutput')}</h3>
        <div className="console-tools">
          <button type="button" className="icon-button" onClick={onClear}>
            {t('clear')}
          </button>
          <button type="button" className="icon-button" aria-label={t('placeholder')}>
            <DotsIcon />
          </button>
        </div>
      </header>

      <div className="console-body">
        {lines.map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
      </div>

      <div className="console-footer">
        <button type="button" className="abort-button" onClick={onAbort} disabled={!isJobRunning}>
          {t('abort')}
        </button>
      </div>
    </section>
  );
}
