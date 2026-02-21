import type { ProjectFileNode } from '../types/domain';

interface ProjectWorkspaceTreeItem {
  id: string;
  label: string;
  active: boolean;
  expanded: boolean;
  rootDir: string;
  entries: ProjectFileNode[];
  expandedNodeIds: string[];
}

interface ProjectExplorerTreeProps {
  ariaLabel: string;
  workspaces: ProjectWorkspaceTreeItem[];
  emptyLabel: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onToggleWorkspace: (workspaceId: string) => void;
  onToggleDirectory: (workspaceId: string, nodePath: string) => void;
}

function pathBasename(path: string): string {
  const normalized = path.trim().replace(/[\\/]+$/, '');
  if (!normalized) {
    return '';
  }

  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

function hasExpandedNode(workspace: ProjectWorkspaceTreeItem, nodePath: string): boolean {
  return workspace.expandedNodeIds.includes(nodePath);
}

export default function ProjectExplorerTree({
  ariaLabel,
  workspaces,
  emptyLabel,
  onSelectWorkspace,
  onToggleWorkspace,
  onToggleDirectory
}: ProjectExplorerTreeProps) {
  const renderFileNode = (
    workspace: ProjectWorkspaceTreeItem,
    node: ProjectFileNode,
    ariaLevel: number
  ): JSX.Element => {
    const isDirectory = node.nodeType === 'directory';
    const isExpanded = isDirectory && hasExpandedNode(workspace, node.path);
    const symbol = isDirectory ? '▦' : node.nodeType === 'symlink' ? '↗' : '•';

    return (
      <li key={`${workspace.id}:${node.id}`} className="tree-view-group">
        <button
          type="button"
          role="treeitem"
          aria-level={ariaLevel}
          aria-expanded={isDirectory ? isExpanded : undefined}
          className={`tree-row tree-leaf-row tree-file-row${isDirectory ? ' tree-dir-row' : ''}`}
          onClick={() => {
            onSelectWorkspace(workspace.id);
            if (isDirectory) {
              onToggleDirectory(workspace.id, node.path);
            }
          }}
        >
          {isDirectory ? (
            <span className={`chevron ${isExpanded ? 'down' : 'right'}`} aria-hidden="true" />
          ) : (
            <span className="tree-spacer" aria-hidden="true" />
          )}
          <span className="tree-symbol" aria-hidden="true">
            {symbol}
          </span>
          <span className="tree-label">{node.name}</span>
        </button>

        {isDirectory && isExpanded ? (
          node.children.length > 0 ? (
            <ul role="group" className="tree-view-children">
              {node.children.map((child) => renderFileNode(workspace, child, ariaLevel + 1))}
            </ul>
          ) : (
            <p className="sidebar-empty">{emptyLabel}</p>
          )
        ) : null}
      </li>
    );
  };

  return (
    <div className="tree-view" role="tree" aria-label={ariaLabel}>
      <ul className="tree-view-root">
        {workspaces.map((workspace) => {
          const rootLabel = pathBasename(workspace.rootDir) || workspace.rootDir || workspace.label;
          const rootExpanded = workspace.rootDir ? hasExpandedNode(workspace, workspace.rootDir) : false;
          const showExplicitRootNode = workspace.rootDir.trim().length > 0 && rootLabel !== workspace.label;

          return (
            <li key={workspace.id} className="tree-view-group">
              <button
                type="button"
                role="treeitem"
                aria-level={1}
                aria-expanded={workspace.expanded}
                aria-selected={workspace.active}
                className={`tree-row tree-group-row${workspace.active ? ' is-active' : ''}`}
                onClick={() => {
                  onSelectWorkspace(workspace.id);
                  onToggleWorkspace(workspace.id);
                }}
              >
                <span className={`chevron ${workspace.expanded ? 'down' : 'right'}`} aria-hidden="true" />
                <span className="tree-symbol" aria-hidden="true">
                  ▦
                </span>
                <span className="tree-label">{workspace.label}</span>
              </button>

              {workspace.expanded ? (
                workspace.rootDir ? (
                  showExplicitRootNode ? (
                  <ul role="group" className="tree-view-children">
                    <li className="tree-view-group">
                      <button
                        type="button"
                        role="treeitem"
                        aria-level={2}
                        aria-expanded={rootExpanded}
                        className="tree-row tree-leaf-row tree-file-row tree-dir-row tree-project-root-row"
                        onClick={() => {
                          onSelectWorkspace(workspace.id);
                          onToggleDirectory(workspace.id, workspace.rootDir);
                        }}
                      >
                        <span className={`chevron ${rootExpanded ? 'down' : 'right'}`} aria-hidden="true" />
                        <span className="tree-symbol" aria-hidden="true">
                          ▦
                        </span>
                        <span className="tree-label">{rootLabel}</span>
                      </button>

                      {rootExpanded ? (
                        workspace.entries.length > 0 ? (
                          <ul role="group" className="tree-view-children">
                            {workspace.entries.map((entry) => renderFileNode(workspace, entry, 3))}
                          </ul>
                        ) : (
                          <p className="sidebar-empty">{emptyLabel}</p>
                        )
                      ) : null}
                    </li>
                  </ul>
                  ) : workspace.entries.length > 0 ? (
                    <ul role="group" className="tree-view-children">
                      {workspace.entries.map((entry) => renderFileNode(workspace, entry, 2))}
                    </ul>
                  ) : (
                    <p className="sidebar-empty">{emptyLabel}</p>
                  )
                ) : (
                  <p className="sidebar-empty">{emptyLabel}</p>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
