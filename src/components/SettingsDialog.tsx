import type { AppSettings, Language } from '../state/store';
import type { I18nKey } from '../state/i18n';

interface SettingsDialogProps {
  open: boolean;
  draft: AppSettings;
  isSaving: boolean;
  onChange: (next: AppSettings) => void;
  onBrowseEnvRoot: () => void;
  onBrowseUvBinary: () => void;
  onSave: () => void;
  onCancel: () => void;
  t: (key: I18nKey) => string;
}

export default function SettingsDialog({
  open,
  draft,
  isSaving,
  onChange,
  onBrowseEnvRoot,
  onBrowseUvBinary,
  onSave,
  onCancel,
  t
}: SettingsDialogProps) {
  if (!open) {
    return null;
  }

  const onLanguageChange = (value: string) => {
    onChange({
      ...draft,
      language: (value === 'en' ? 'en' : 'de') as Language
    });
  };

  const onEnvRootChange = (value: string) => {
    onChange({
      ...draft,
      envRootDir: value
    });
  };

  const onUvBinaryPathChange = (value: string) => {
    onChange({
      ...draft,
      uvBinaryPath: value
    });
  };

  const onDebounceChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);

    onChange({
      ...draft,
      autoSaveDebounceMs: Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
    });
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        className="dialog-card"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-header">
          <h2 id="settings-dialog-title">{t('settingsTitle')}</h2>
        </header>

        <div className="dialog-body">
          <label className="field-row">
            <span>{t('language')}</span>
            <div className="select-wrap">
              <select value={draft.language} onChange={(event) => onLanguageChange(event.target.value)}>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
          </label>

          <label className="field-row">
            <span>{t('envRootDir')}</span>
            <div className="path-picker-row">
              <input
                type="text"
                value={draft.envRootDir}
                onChange={(event) => onEnvRootChange(event.target.value)}
                placeholder="/home/user/.virtualenvs"
              />
              <button type="button" className="secondary-button" onClick={onBrowseEnvRoot}>
                {t('browse')}
              </button>
            </div>
          </label>

          <label className="field-row">
            <span>{t('uvBinaryPath')}</span>
            <div className="path-picker-row">
              <input
                type="text"
                value={draft.uvBinaryPath}
                onChange={(event) => onUvBinaryPathChange(event.target.value)}
                placeholder="uv"
              />
              <button type="button" className="secondary-button" onClick={onBrowseUvBinary}>
                {t('browse')}
              </button>
            </div>
          </label>

          <label className="field-row">
            <span>{t('autoSaveDebounceMs')}</span>
            <input
              type="number"
              min={0}
              step={50}
              value={draft.autoSaveDebounceMs}
              onChange={(event) => onDebounceChange(event.target.value)}
            />
          </label>
        </div>

        <footer className="dialog-footer">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={isSaving}>
            {t('cancel')}
          </button>
          <button type="button" className="primary-action" onClick={onSave} disabled={isSaving}>
            {t('save')}
          </button>
        </footer>
      </section>
    </div>
  );
}
