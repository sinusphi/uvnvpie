interface TabItem<T extends string> {
  key: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: Array<TabItem<T>>;
  activeTab: T;
  onChangeTab: (tab: T) => void;
}

export default function Tabs<T extends string>({ tabs, activeTab, onChangeTab }: TabsProps<T>) {
  return (
    <div className="tabs-row" role="tablist" aria-label="Main tabs">
      {tabs.map((tab) => {
        const selected = tab.key === activeTab;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`tab-button${selected ? ' active' : ''}`}
            onClick={() => onChangeTab(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
