import type { EnvironmentItem } from '../types/domain';
import type { I18nKey } from '../state/i18n';

interface HeaderPanelProps {
  environment: EnvironmentItem;
  t: (key: I18nKey) => string;
}

export default function HeaderPanel({ environment, t }: HeaderPanelProps) {
  return (
    <section className="header-panel">
      <h1>
        {t('environmentLabel')}: <span>{environment.name}</span>
      </h1>
      <p>
        {environment.pythonVersion} - {environment.interpreterPath}
      </p>
      <p>
        {t('locationLabel')}: {environment.location}
      </p>
    </section>
  );
}
