import { useMemo } from 'react';
import type { I18nKey } from '../state/i18n';
import type { DependencyGraphPackage } from '../types/domain';

interface DependencyTreePanelProps {
  packages: DependencyGraphPackage[];
  isLoading: boolean;
  error: string;
  loadedAt: string;
  t: (key: I18nKey) => string;
}

function formatDateTime(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleString();
}

function sortNodeIds(nodeIds: string[], packageById: Map<string, DependencyGraphPackage>): string[] {
  return [...nodeIds].sort((left, right) => {
    const leftLabel = packageById.get(left)?.name ?? left;
    const rightLabel = packageById.get(right)?.name ?? right;

    return leftLabel.localeCompare(rightLabel, 'en', {
      sensitivity: 'base',
      numeric: true
    });
  });
}

export default function DependencyTreePanel({
  packages,
  isLoading,
  error,
  loadedAt,
  t
}: DependencyTreePanelProps) {
  const packageById = useMemo(() => {
    return new Map(packages.map((entry) => [entry.id, entry] as const));
  }, [packages]);

  const edgeCount = useMemo(() => {
    return packages.reduce((total, entry) => total + entry.dependencies.length, 0);
  }, [packages]);

  const rootNodeIds = useMemo(() => {
    if (packages.length === 0) {
      return [];
    }

    const incomingCount = new Map<string, number>();
    for (const entry of packages) {
      incomingCount.set(entry.id, 0);
    }

    for (const entry of packages) {
      for (const dependencyId of entry.dependencies) {
        if (!incomingCount.has(dependencyId)) {
          continue;
        }

        incomingCount.set(dependencyId, (incomingCount.get(dependencyId) ?? 0) + 1);
      }
    }

    const roots = packages
      .map((entry) => entry.id)
      .filter((id) => (incomingCount.get(id) ?? 0) === 0);

    if (roots.length > 0) {
      return sortNodeIds(roots, packageById);
    }

    return sortNodeIds(packages.map((entry) => entry.id), packageById);
  }, [packageById, packages]);

  const formattedLoadedAt = formatDateTime(loadedAt);

  const renderNode = (nodeId: string, ancestry: string[]): JSX.Element => {
    const pathKey = [...ancestry, nodeId].join('>');
    const node = packageById.get(nodeId);

    if (!node) {
      return (
        <li key={pathKey} className="dependency-tree-node missing">
          <div className="dependency-tree-node-line">
            <span className="dependency-tree-node-name">{nodeId}</span>
            <span className="dependency-tree-node-hint">({t('dependencyTreeMissingPackage')})</span>
          </div>
        </li>
      );
    }

    const cycleDetected = ancestry.includes(nodeId);
    const nextAncestry = [...ancestry, nodeId];
    const dependencyIds = sortNodeIds(node.dependencies, packageById);

    return (
      <li key={pathKey} className={`dependency-tree-node${cycleDetected ? ' cycle' : ''}`}>
        <div className="dependency-tree-node-line">
          <span className="dependency-tree-node-name">{node.name}</span>
          <span className="dependency-tree-node-version">{node.version || '?'}</span>
          {cycleDetected ? (
            <span className="dependency-tree-node-hint">({t('dependencyTreeCycle')})</span>
          ) : null}
        </div>

        {!cycleDetected && dependencyIds.length > 0 ? (
          <ul className="dependency-tree-list">
            {dependencyIds.map((dependencyId) => renderNode(dependencyId, nextAncestry))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <div className="dependency-tree-panel">
      <p className="dependency-tree-meta">
        {t('dependencyTreePackagesCount')}: {packages.length} · {t('dependencyTreeEdgesCount')}: {edgeCount} ·{' '}
        {t('dependencyTreeRootsCount')}: {rootNodeIds.length}
        {formattedLoadedAt ? ` · ${t('dependencyTreeLastBuilt')}: ${formattedLoadedAt}` : ''}
      </p>

      {error ? (
        <p className="security-error">
          {t('dependencyTreeLoadFailed')}: {error}
        </p>
      ) : null}

      {isLoading ? <p className="dependency-tree-status">{t('dependencyTreeBuilding')}</p> : null}

      {!isLoading && packages.length === 0 ? (
        <p className="panel-empty">{t('dependencyTreeNoData')}</p>
      ) : !isLoading ? (
        <div className="dependency-tree-wrap">
          <ul className="dependency-tree-list">
            {rootNodeIds.map((rootNodeId) => renderNode(rootNodeId, []))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
