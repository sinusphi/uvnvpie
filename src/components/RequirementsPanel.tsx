import { useEffect, useMemo, useRef, useState } from 'react';
import type { I18nKey } from '../state/i18n';
import type { PackageItem } from '../types/domain';

interface RequirementsPanelProps {
  packages: PackageItem[];
  environmentName: string;
  t: (key: I18nKey) => string;
}

function normalizeFileName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return normalized || 'requirements';
}

function formatDateTime(value: Date): string {
  return value.toLocaleString();
}

export default function RequirementsPanel({ packages, environmentName, t }: RequirementsPanelProps) {
  const resetFeedbackTimerRef = useRef<number | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'done' | 'error'>('idle');
  const generatedAt = useMemo(() => new Date(), [packages]);

  useEffect(() => {
    return () => {
      if (resetFeedbackTimerRef.current !== null) {
        window.clearTimeout(resetFeedbackTimerRef.current);
      }
    };
  }, []);

  const sortedPackages = useMemo(() => {
    return [...packages].sort((left, right) =>
      left.name.localeCompare(right.name, 'en', { sensitivity: 'base', numeric: true })
    );
  }, [packages]);

  const requirementsText = useMemo(() => {
    const packageLines = sortedPackages.map((entry) => {
      const packageName = entry.name.trim();
      const packageVersion = entry.version.trim();
      return packageVersion ? `${packageName}==${packageVersion}` : packageName;
    });

    return [
      `# ${t('requirementsGeneratedAt')}: ${formatDateTime(generatedAt)}`,
      `# ${t('requirementsPackageCount')}: ${packageLines.length}`,
      '',
      ...packageLines
    ].join('\n');
  }, [generatedAt, sortedPackages, t]);

  const handleCopy = async () => {
    if (resetFeedbackTimerRef.current !== null) {
      window.clearTimeout(resetFeedbackTimerRef.current);
      resetFeedbackTimerRef.current = null;
    }

    try {
      await navigator.clipboard.writeText(requirementsText);
      setCopyFeedback('done');
    } catch {
      setCopyFeedback('error');
    }

    resetFeedbackTimerRef.current = window.setTimeout(() => {
      setCopyFeedback('idle');
      resetFeedbackTimerRef.current = null;
    }, 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([requirementsText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const baseName = normalizeFileName(environmentName);
    link.href = url;
    link.download = `${baseName}.requirements.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="requirements-panel">
      <div className="requirements-toolbar">
        <p className="requirements-meta">
          {t('requirementsGeneratedAt')}: {formatDateTime(generatedAt)} · {t('requirementsPackageCount')}:{' '}
          {sortedPackages.length}
        </p>
        <div className="requirements-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={sortedPackages.length === 0}
            onClick={() => void handleCopy()}
          >
            {copyFeedback === 'done'
              ? t('requirementsCopied')
              : copyFeedback === 'error'
                ? t('requirementsCopyFailed')
                : t('requirementsCopy')}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={sortedPackages.length === 0}
            onClick={() => handleDownload()}
          >
            {t('requirementsDownload')}
          </button>
        </div>
      </div>

      {sortedPackages.length === 0 ? (
        <p className="panel-empty">{t('requirementsNoPackages')}</p>
      ) : (
        <textarea className="requirements-textarea" value={requirementsText} readOnly spellCheck={false} />
      )}
    </div>
  );
}
