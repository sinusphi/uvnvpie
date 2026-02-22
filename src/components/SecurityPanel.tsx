import { useMemo } from 'react';
import type { I18nKey } from '../state/i18n';
import type { SecurityFinding, SecuritySeverityLevel } from '../types/domain';

interface SecurityPanelProps {
  findings: SecurityFinding[];
  selectedFindingId: string;
  onSelectFinding: (findingId: string) => void;
  isScanning: boolean;
  scanError: string;
  scannedAt: string;
  packagesScanned: number;
  currentPackageCount: number;
  t: (key: I18nKey) => string;
}

function formatDateTime(value: string, withTime: boolean): string {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  if (withTime) {
    return parsed.toLocaleString();
  }

  return parsed.toLocaleDateString();
}

function severityClass(level: SecuritySeverityLevel): string {
  if (level === 'critical') {
    return 'critical';
  }

  if (level === 'high') {
    return 'high';
  }

  if (level === 'medium') {
    return 'medium';
  }

  if (level === 'low') {
    return 'low';
  }

  return 'unknown';
}

export default function SecurityPanel({
  findings,
  selectedFindingId,
  onSelectFinding,
  isScanning,
  scanError,
  scannedAt,
  packagesScanned,
  currentPackageCount,
  t
}: SecurityPanelProps) {
  const selectedFinding = useMemo(() => {
    return findings.find((entry) => entry.id === selectedFindingId) ?? findings[0] ?? null;
  }, [findings, selectedFindingId]);

  const summary = useMemo(() => {
    const affectedPackages = new Set(findings.map((entry) => entry.packageName.toLowerCase()));
    const critical = findings.filter((entry) => entry.severity === 'critical').length;
    const fixable = findings.filter((entry) => entry.fixedVersions.length > 0).length;

    return {
      total: findings.length,
      critical,
      fixable,
      affectedPackages: affectedPackages.size
    };
  }, [findings]);

  const formattedScannedAt = formatDateTime(scannedAt, true);

  return (
    <div className="security-panel">
      <div className="security-summary-grid">
        <article className="security-summary-card">
          <p className="security-summary-label">{t('securitySummaryTotal')}</p>
          <p className="security-summary-value">{summary.total}</p>
        </article>
        <article className="security-summary-card">
          <p className="security-summary-label">{t('securitySummaryCritical')}</p>
          <p className="security-summary-value">{summary.critical}</p>
        </article>
        <article className="security-summary-card">
          <p className="security-summary-label">{t('securitySummaryFixable')}</p>
          <p className="security-summary-value">{summary.fixable}</p>
        </article>
        <article className="security-summary-card">
          <p className="security-summary-label">{t('securitySummaryAffectedPackages')}</p>
          <p className="security-summary-value">{summary.affectedPackages}</p>
        </article>
      </div>

      {scanError ? (
        <p className="security-error">
          {t('securityScanFailed')}: {scanError}
        </p>
      ) : null}

      <p className="security-meta">
        {formattedScannedAt
          ? `${t('securityLastScanned')}: ${formattedScannedAt} · ${t('securityPackagesScanned')}: ${packagesScanned}`
          : t('securityNotScannedYet')}
      </p>

      {isScanning ? <p className="security-status">{t('securityScanning')}</p> : null}

      {currentPackageCount === 0 ? (
        <p className="panel-empty">{t('securityEmptyPackages')}</p>
      ) : findings.length === 0 ? (
        <p className="panel-empty">{formattedScannedAt ? t('securityNoFindings') : t('securityNoScanYet')}</p>
      ) : (
        <div className="security-content-grid">
          <div className="table-wrap security-table-wrap">
            <table className="packages-table security-table">
              <thead>
                <tr>
                  <th>{t('packageColumn')}</th>
                  <th>{t('securityInstalledColumn')}</th>
                  <th>{t('securitySeverityColumn')}</th>
                  <th>{t('securityVulnerabilityColumn')}</th>
                  <th>{t('securityFixedInColumn')}</th>
                  <th>{t('securityPublishedColumn')}</th>
                  <th>{t('securityDependencyColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((finding) => {
                  const published = formatDateTime(finding.published, false) || t('securityDateUnknown');
                  const dependencyLabel =
                    finding.dependencyType === 'unknown' ? t('securityDependencyUnknown') : finding.dependencyType;
                  const isSelected = selectedFinding?.id === finding.id;

                  return (
                    <tr
                      key={finding.id}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => onSelectFinding(finding.id)}
                    >
                      <td>{finding.packageName}</td>
                      <td>{finding.installedVersion}</td>
                      <td>
                        <span className={`security-severity-badge ${severityClass(finding.severity)}`}>
                          {finding.severityLabel}
                        </span>
                      </td>
                      <td className="security-vuln-id">{finding.vulnerabilityId}</td>
                      <td>{finding.fixedVersions[0] ?? t('securityNoFix')}</td>
                      <td>{published}</td>
                      <td>{dependencyLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <section className="info-panel security-details-panel">
            <header>
              <h3>{t('details')}</h3>
            </header>

            {selectedFinding ? (
              <dl className="details-grid security-details-grid">
                <div>
                  <dt>{t('packageColumn')}</dt>
                  <dd>{selectedFinding.packageName}</dd>
                </div>
                <div>
                  <dt>{t('securityInstalledColumn')}</dt>
                  <dd>{selectedFinding.installedVersion}</dd>
                </div>
                <div>
                  <dt>{t('securityVulnerabilityColumn')}</dt>
                  <dd className="security-vuln-id">{selectedFinding.vulnerabilityId}</dd>
                </div>
                <div>
                  <dt>{t('securitySeverityColumn')}</dt>
                  <dd>
                    <span className={`security-severity-badge ${severityClass(selectedFinding.severity)}`}>
                      {selectedFinding.severityLabel}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>{t('securityAliasesLabel')}</dt>
                  <dd>{selectedFinding.aliases.join(', ') || t('notAvailable')}</dd>
                </div>
                <div>
                  <dt>{t('securityFixedInColumn')}</dt>
                  <dd>{selectedFinding.fixedVersions.join(', ') || t('securityNoFix')}</dd>
                </div>
                <div>
                  <dt>{t('securityRemediationLabel')}</dt>
                  <dd>{selectedFinding.remediation || t('notAvailable')}</dd>
                </div>
                <div>
                  <dt>{t('securityPublishedColumn')}</dt>
                  <dd>{formatDateTime(selectedFinding.published, true) || t('securityDateUnknown')}</dd>
                </div>
                <div>
                  <dt>{t('securityModifiedLabel')}</dt>
                  <dd>{formatDateTime(selectedFinding.modified, true) || t('securityDateUnknown')}</dd>
                </div>
                <div className="summary-row">
                  <dt>{t('securitySummaryLabel')}</dt>
                  <dd>{selectedFinding.summary || t('securityNoSummary')}</dd>
                </div>
                <div className="summary-row">
                  <dt>{t('securityDetailsLabel')}</dt>
                  <dd className="security-long-text">{selectedFinding.details || t('securityNoDetails')}</dd>
                </div>
                <div className="summary-row">
                  <dt>{t('securityReferencesLabel')}</dt>
                  <dd>
                    {selectedFinding.references.length > 0 ? (
                      <ul className="security-reference-list">
                        {selectedFinding.references.map((reference) => (
                          <li key={`${reference.type}-${reference.url}`}>
                            <a href={reference.url} target="_blank" rel="noreferrer">
                              {reference.type}: {reference.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      t('securityNoReferences')
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="panel-empty">{t('securityNoFindings')}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
