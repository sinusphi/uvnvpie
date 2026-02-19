import { useEffect, useRef } from 'react';

interface WorkspaceTabItem {
  id: string;
  label: string;
}

interface WorkspaceTabsProps {
  tabs: WorkspaceTabItem[];
  activeTabId: string;
  editingTabId: string | null;
  editValue: string;
  closeLabel: string;
  onSelectTab: (tabId: string) => void;
  onStartEditTab: (tabId: string) => void;
  onEditValueChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onCloseTab: (tabId: string) => void;
}

export default function WorkspaceTabs({
  tabs,
  activeTabId,
  editingTabId,
  editValue,
  closeLabel,
  onSelectTab,
  onStartEditTab,
  onEditValueChange,
  onCommitEdit,
  onCancelEdit,
  onCloseTab
}: WorkspaceTabsProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editingTabId || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    inputRef.current.select();
  }, [editingTabId]);

  return (
    <div className="workspace-tabs-row" role="tablist" aria-label="Workspace tabs">
      {tabs.map((tab) => {
        const selected = tab.id === activeTabId;
        const isEditing = tab.id === editingTabId;

        return (
          <div
            key={tab.id}
            className={`workspace-tab${selected ? ' active' : ''}${isEditing ? ' editing' : ''}`}
            role="presentation"
          >
            {isEditing ? (
              <div className="workspace-tab-editor">
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  className="workspace-tab-input"
                  onChange={(event) => onEditValueChange(event.target.value)}
                  onBlur={() => onCommitEdit()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onCommitEdit();
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault();
                      onCancelEdit();
                    }
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                className="workspace-tab-button"
                onClick={() => onSelectTab(tab.id)}
              >
                <span className="workspace-tab-label" onDoubleClick={() => onStartEditTab(tab.id)}>
                  {tab.label}
                </span>
              </button>
            )}

            <button
              type="button"
              className="workspace-tab-close"
              aria-label={`${closeLabel}: ${tab.label}`}
              onClick={(event) => {
                event.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
}
