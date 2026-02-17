import type { PackageItem } from '../types/domain';
import type { I18nKey } from '../state/i18n';

interface DetailsPanelProps {
  packageItem: PackageItem | null;
  t: (key: I18nKey) => string;
}

export default function DetailsPanel({ packageItem, t }: DetailsPanelProps) {
  return (
    <section className="info-panel">
      <header>
        <h3>{t('details')}</h3>
      </header>

      {packageItem ? (
        <dl className="details-grid">
          <div>
            <dt>{t('packageColumn')}</dt>
            <dd>{packageItem.name}</dd>
          </div>
          <div>
            <dt>{t('versionColumn')}</dt>
            <dd>{packageItem.version}</dd>
          </div>
          <div>
            <dt>{t('latestColumn')}</dt>
            <dd>{packageItem.latest}</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>{packageItem.license}</dd>
          </div>
          <div>
            <dt>Homepage</dt>
            <dd className="mono">{packageItem.homePage}</dd>
          </div>
          <div className="summary-row">
            <dt>Summary</dt>
            <dd>{packageItem.summary}</dd>
          </div>
        </dl>
      ) : (
        <p className="panel-empty">{t('noData')}</p>
      )}
    </section>
  );
}
