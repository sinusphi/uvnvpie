import type { EnvironmentItem, ProjectFileNode, ProjectItem } from '../types/domain';
import type { I18nKey } from '../state/i18n';
import ProjectExplorerTree from './ProjectExplorerTree';
import TreeView, { type TreeViewGroupNode } from './TreeView';

interface WorkspaceSidebarItem {
  id: string;
  name: string;
  environments: EnvironmentItem[];
  selectedEnvironmentId: string;
  projects: ProjectItem[];
  selectedProjectId: string;
  projectFileTree: ProjectFileNode[];
  expandedProjectNodeIds: string[];
  isProjectExpanded: boolean;
  isEnvironmentExpanded: boolean;
  showInProjects: boolean;
  showInEnvironments: boolean;
}

interface SidebarProps {
  workspaces: WorkspaceSidebarItem[];
  activeWorkspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onToggleProjectWorkspaceExpanded: (workspaceId: string) => void;
  onToggleProjectDirectory: (workspaceId: string, nodePath: string) => void;
  onToggleEnvironmentWorkspaceExpanded: (workspaceId: string) => void;
  onSelectEnvironment: (workspaceId: string, environmentId: string) => void;
  onCreateEnvironment: () => void;
  onOpenProjectRoot: () => void;
  onOpenEnvironmentRoot: () => void;
  t: (key: I18nKey) => string;
}

export default function Sidebar({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onToggleProjectWorkspaceExpanded,
  onToggleProjectDirectory,
  onToggleEnvironmentWorkspaceExpanded,
  onSelectEnvironment,
  onCreateEnvironment,
  onOpenProjectRoot,
  onOpenEnvironmentRoot,
  t
}: SidebarProps) {
  const projectTreeWorkspaces = workspaces
    .filter((workspace) => workspace.showInProjects)
    .map((workspace) => {
      const isActiveWorkspace = workspace.id === activeWorkspaceId;
      const selectedProject =
        workspace.projects.find((project) => project.id === workspace.selectedProjectId) ?? workspace.projects[0] ?? null;

      return {
        id: workspace.id,
        label: workspace.name,
        active: isActiveWorkspace,
        expanded: workspace.isProjectExpanded,
        rootDir: selectedProject?.rootDir ?? '',
        entries: workspace.projectFileTree,
        expandedNodeIds: workspace.expandedProjectNodeIds
      };
    });

  const environmentTreeGroups: TreeViewGroupNode[] = workspaces
    .filter((workspace) => workspace.showInEnvironments)
    .map((workspace) => {
      const isActiveWorkspace = workspace.id === activeWorkspaceId;

      return {
        id: `environments-group-${workspace.id}`,
        label: workspace.name,
        expanded: workspace.isEnvironmentExpanded,
        active: isActiveWorkspace,
        leaves: workspace.environments.map((environment) => ({
          id: `environment-leaf-${workspace.id}-${environment.id}`,
          label: environment.name,
          selected: environment.id === workspace.selectedEnvironmentId,
          symbol: '◉',
          onSelect: () => onSelectEnvironment(workspace.id, environment.id)
        })),
        emptyLabel: t('noData'),
        onToggle: () => {
          onSelectWorkspace(workspace.id);
          onToggleEnvironmentWorkspaceExpanded(workspace.id);
        }
      };
    });

  return (
    <aside className="sidebar-panel">
      <div className="sidebar-actions-row">
        <button type="button" className="secondary-button split-action" onClick={onOpenProjectRoot}>
          {t('openProjectButton')}
        </button>
        <button type="button" className="primary-action split-action" onClick={onCreateEnvironment}>
          {t('createEnvironmentButton')}
        </button>
      </div>

      <div className="sidebar-sections-split">
        <section className="sidebar-section">
          <h2>{t('projects')}</h2>
          <div className="sidebar-section-scroll">
            {projectTreeWorkspaces.length > 0 ? (
              <ProjectExplorerTree
                ariaLabel="Workspace projects"
                workspaces={projectTreeWorkspaces}
                emptyLabel={t('noData')}
                onSelectWorkspace={onSelectWorkspace}
                onToggleWorkspace={onToggleProjectWorkspaceExpanded}
                onToggleDirectory={onToggleProjectDirectory}
              />
            ) : (
              <p className="sidebar-empty">{t('noData')}</p>
            )}
          </div>
        </section>

        <div className="sidebar-open-row">
          <button type="button" className="secondary-button split-action" onClick={onOpenEnvironmentRoot}>
            {t('openFolderButton')}
          </button>
        </div>

        <section className="sidebar-section">
          <h2>{t('environments')}</h2>
          <div className="sidebar-section-scroll">
            {environmentTreeGroups.length > 0 ? (
              <TreeView ariaLabel="Workspace environments" groups={environmentTreeGroups} />
            ) : (
              <p className="sidebar-empty">{t('noData')}</p>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
