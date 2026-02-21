import type { EnvironmentItem } from '../types/domain';
import type { I18nKey } from '../state/i18n';

interface HeaderPanelProps {
  environment: EnvironmentItem;
  isManagedProject: boolean;
  t: (key: I18nKey) => string;
}

export default function HeaderPanel({ environment, isManagedProject, t }: HeaderPanelProps) {
  const badgeModeClass = isManagedProject ? 'project-mode' : 'direct-mode';

  return (
    <section className="header-panel">
      <div className={`environment-name-badge ${badgeModeClass}`} aria-label={environment.name}>
        <span className="environment-name-badge-value">{environment.name}</span>
      </div>
      <p className="header-panel-row">
        {environment.pythonVersion} - {environment.interpreterPath}
      </p>
      <p className="header-panel-row">
        {t('locationLabel')}: {environment.location}
      </p>
      <p className="header-panel-row">
        Managed Project:{' '}
        <span className={isManagedProject ? 'managed-project-value yes' : 'managed-project-value no'}>
          {isManagedProject ? 'Yes' : 'No'}
        </span>
      </p>
    </section>
  );
}
