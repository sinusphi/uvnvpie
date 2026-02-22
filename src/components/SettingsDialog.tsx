import type { AppSettings, Language, ThemePreset } from '../state/store';
import type { I18nKey } from '../state/i18n';

const THEME_OPTIONS: Array<{ value: ThemePreset; labelKey: I18nKey }> = [
  { value: 'dark-red', labelKey: 'themeDarkRed' },
  { value: 'dark-green', labelKey: 'themeDarkGreen' },
  { value: 'dark-blue', labelKey: 'themeDarkBlue' },
  { value: 'light-blue', labelKey: 'themeLightBlue' },
  { value: 'light-red', labelKey: 'themeLightRed' }
];

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

  const onAlwaysSaveTabsChange = (checked: boolean) => {
    onChange({
      ...draft,
      alwaysSaveTabs: checked
    });
  };

  const onThemePresetChange = (themePreset: ThemePreset) => {
    onChange({
      ...draft,
      themePreset
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

          <label className="field-row checkbox-field-row">
            <span className="checkbox-inline">
              <input
                type="checkbox"
                checked={draft.alwaysSaveTabs}
                onChange={(event) => onAlwaysSaveTabsChange(event.target.checked)}
              />
              <span>{t('alwaysSaveTabs')}</span>
            </span>
          </label>

          <div className="field-row theme-field-row">
            <span className="theme-options-title">{t('themeSelection')}</span>
            <div className="theme-options-grid" role="group" aria-label={t('themeSelection')}>
              {THEME_OPTIONS.map((themeOption) => (
                <label key={themeOption.value} className="theme-option-checkbox">
                  <input
                    type="checkbox"
                    checked={draft.themePreset === themeOption.value}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onThemePresetChange(themeOption.value);
                      }
                    }}
                  />
                  <span>{t(themeOption.labelKey)}</span>
                </label>
              ))}
            </div>
          </div>
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
