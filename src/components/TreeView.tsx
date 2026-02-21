import { useMemo, useRef, type KeyboardEvent } from 'react';

export interface TreeViewLeafNode {
  id: string;
  label: string;
  selected: boolean;
  symbol: string;
  onSelect: () => void;
}

export interface TreeViewGroupNode {
  id: string;
  label: string;
  expanded: boolean;
  active: boolean;
  leaves: TreeViewLeafNode[];
  emptyLabel: string;
  onToggle: () => void;
}

interface TreeViewProps {
  ariaLabel: string;
  groups: TreeViewGroupNode[];
}

export default function TreeView({ ariaLabel, groups }: TreeViewProps) {
  const treeRef = useRef<HTMLDivElement | null>(null);

  const rowIds = useMemo(() => {
    const ids: string[] = [];

    for (const group of groups) {
      ids.push(group.id);

      if (!group.expanded) {
        continue;
      }

      for (const leaf of group.leaves) {
        ids.push(leaf.id);
      }
    }

    return ids;
  }, [groups]);

  const focusRowById = (rowId: string) => {
    const root = treeRef.current;
    if (!root) {
      return;
    }

    const rows = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tree-row="true"]'));
    const target = rows.find((row) => row.dataset.nodeId === rowId);
    target?.focus();
  };

  const focusRowByOffset = (currentId: string, offset: number) => {
    const index = rowIds.indexOf(currentId);
    if (index < 0) {
      return;
    }

    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= rowIds.length) {
      return;
    }

    focusRowById(rowIds[nextIndex]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLButtonElement>('[data-tree-row="true"]');

    if (!row) {
      return;
    }

    const rowType = row.dataset.rowType;
    const nodeId = row.dataset.nodeId ?? '';
    const parentId = row.dataset.parentId ?? '';
    const expanded = row.dataset.expanded === 'true';

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusRowByOffset(nodeId, 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusRowByOffset(nodeId, -1);
      return;
    }

    if (event.key === 'ArrowRight') {
      if (rowType === 'group') {
        event.preventDefault();

        if (!expanded) {
          row.click();
          return;
        }

        const group = groups.find((entry) => entry.id === nodeId);
        const firstLeafId = group?.leaves[0]?.id;
        if (firstLeafId) {
          focusRowById(firstLeafId);
        }
      }

      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();

      if (rowType === 'group') {
        if (expanded) {
          row.click();
        }
        return;
      }

      if (parentId) {
        focusRowById(parentId);
      }

      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      row.click();
    }
  };

  return (
    <div className="tree-view" role="tree" aria-label={ariaLabel} onKeyDown={handleKeyDown} ref={treeRef}>
      <ul className="tree-view-root">
        {groups.map((group) => (
          <li key={group.id} className="tree-view-group">
            <button
              type="button"
              role="treeitem"
              aria-level={1}
              aria-expanded={group.expanded}
              aria-selected={group.active}
              className={`tree-row tree-group-row${group.active ? ' is-active' : ''}`}
              data-tree-row="true"
              data-row-type="group"
              data-node-id={group.id}
              data-expanded={group.expanded ? 'true' : 'false'}
              onClick={group.onToggle}
            >
              <span className={`chevron ${group.expanded ? 'down' : 'right'}`} aria-hidden="true" />
              <span className="tree-symbol" aria-hidden="true">
                ▦
              </span>
              <span className="tree-label">{group.label}</span>
            </button>

            {group.expanded ? (
              group.leaves.length > 0 ? (
                <ul role="group" className="tree-view-children">
                  {group.leaves.map((leaf) => (
                    <li key={leaf.id}>
                      <button
                        type="button"
                        role="treeitem"
                        aria-level={2}
                        aria-selected={leaf.selected}
                        className={`tree-row tree-leaf-row${leaf.selected ? ' is-selected' : ''}`}
                        data-tree-row="true"
                        data-row-type="leaf"
                        data-node-id={leaf.id}
                        data-parent-id={group.id}
                        onClick={leaf.onSelect}
                      >
                        <span className="tree-indent" aria-hidden="true" />
                        <span className="tree-symbol" aria-hidden="true">
                          {leaf.symbol}
                        </span>
                        <span className="tree-label">{leaf.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sidebar-empty">{group.emptyLabel}</p>
              )
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
