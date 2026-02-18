import type { EnvironmentItem } from '../types/domain';
import type { I18nKey } from '../state/i18n';
import EnvironmentsList from './EnvironmentsList';

interface WorkspaceSidebarItem {
  id: string;
  name: string;
  environments: EnvironmentItem[];
  selectedEnvironmentId: string;
  isExpanded: boolean;
}

interface SidebarProps {
  workspaces: WorkspaceSidebarItem[];
  activeWorkspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onToggleWorkspaceExpanded: (workspaceId: string) => void;
  onSelectEnvironment: (workspaceId: string, environmentId: string) => void;
  onCreateEnvironment: () => void;
  onOpenWorkspace: () => void;
  t: (key: I18nKey) => string;
}

export default function Sidebar({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onToggleWorkspaceExpanded,
  onSelectEnvironment,
  onCreateEnvironment,
  onOpenWorkspace,
  t
}: SidebarProps) {
  return (
    <aside className="sidebar-panel">
      <div className="sidebar-actions-row">
        <button type="button" className="primary-action split-action" onClick={onCreateEnvironment}>
          {t('createEnvironmentButton')}
        </button>
        <button type="button" className="secondary-button split-action" onClick={onOpenWorkspace}>
          {t('openFolderTab')}
        </button>
      </div>

      <section className="sidebar-section">
        <h2>{t('environments')}</h2>
        <ul className="workspace-groups-list" aria-label="Workspace folders">
          {workspaces.map((workspace) => {
            const isActiveWorkspace = workspace.id === activeWorkspaceId;

            return (
              <li key={workspace.id} className="workspace-group">
                <button
                  type="button"
                  className={`workspace-group-toggle${isActiveWorkspace ? ' active' : ''}`}
                  aria-expanded={workspace.isExpanded}
                  onClick={() => {
                    onSelectWorkspace(workspace.id);
                    onToggleWorkspaceExpanded(workspace.id);
                  }}
                >
                  <span className={`chevron ${workspace.isExpanded ? 'down' : 'right'}`} aria-hidden="true" />
                  <span className="workspace-group-name">{workspace.name}</span>
                </button>

                {workspace.isExpanded ? (
                  workspace.environments.length > 0 ? (
                    <EnvironmentsList
                      environments={workspace.environments}
                      selectedEnvironmentId={workspace.selectedEnvironmentId}
                      onSelectEnvironment={(environmentId) => onSelectEnvironment(workspace.id, environmentId)}
                    />
                  ) : (
                    <p className="sidebar-empty">{t('noData')}</p>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
