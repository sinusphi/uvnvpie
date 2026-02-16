import type { I18nKey } from '../state/i18n';

interface ActionsPanelProps {
  onInstall: () => void;
  onUpgrade: () => void;
  onUninstall: () => void;
  onExportRequirements: () => void;
  disabled: boolean;
  t: (key: I18nKey) => string;
}

export default function ActionsPanel({
  onInstall,
  onUpgrade,
  onUninstall,
  onExportRequirements,
  disabled,
  t
}: ActionsPanelProps) {
  return (
    <section className="info-panel">
      <header>
        <h3>{t('actions')}</h3>
      </header>
      <div className="actions-grid">
        <button type="button" className="neutral-action" onClick={onInstall} disabled={disabled}>
          {t('install')}
        </button>
        <button type="button" className="accent-action" onClick={onUninstall} disabled={disabled}>
          {t('uninstall')}
        </button>
        <button type="button" className="neutral-action" onClick={onUpgrade} disabled={disabled}>
          {t('upgrade')}
        </button>
        <button
          type="button"
          className="accent-action"
          onClick={onExportRequirements}
          disabled={disabled}
        >
          {t('exportRequirements')}
        </button>
      </div>
    </section>
  );
}
