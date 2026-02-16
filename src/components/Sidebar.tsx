import type { EnvironmentItem } from '../mock/data';
import type { I18nKey } from '../state/i18n';
import EnvironmentsList from './EnvironmentsList';

interface SidebarProps {
  environments: EnvironmentItem[];
  selectedEnvironmentId: string;
  onSelectEnvironment: (environmentId: string) => void;
  onCreateEnvironment: () => void;
  t: (key: I18nKey) => string;
}

export default function Sidebar({
  environments,
  selectedEnvironmentId,
  onSelectEnvironment,
  onCreateEnvironment,
  t
}: SidebarProps) {
  return (
    <aside className="sidebar-panel">
      <button type="button" className="primary-action" onClick={onCreateEnvironment}>
        {t('createEnvironment')}
      </button>

      <section className="sidebar-section">
        <h2>{t('environments')}</h2>
        <EnvironmentsList
          environments={environments}
          selectedEnvironmentId={selectedEnvironmentId}
          onSelectEnvironment={onSelectEnvironment}
        />
      </section>
    </aside>
  );
}
