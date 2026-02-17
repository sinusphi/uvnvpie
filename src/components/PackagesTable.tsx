import type { PackageItem } from '../mock/data';
import type { I18nKey } from '../state/i18n';

interface PackagesTableProps {
  packages: PackageItem[];
  selectedPackageId: string;
  onSelectPackage: (packageId: string) => void;
  t: (key: I18nKey) => string;
}

function PackageIcon({ seed }: { seed: string }) {
  const hue = (seed.charCodeAt(0) * 13) % 360;

  return (
    <svg className="package-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={`hsl(${hue} 72% 45%)`} />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontFamily="inherit">
        {seed.charAt(0).toUpperCase()}
      </text>
    </svg>
  );
}

export default function PackagesTable({
  packages,
  selectedPackageId,
  onSelectPackage,
  t
}: PackagesTableProps) {
  return (
    <div className="table-wrap">
      <table className="packages-table">
        <thead>
          <tr>
            <th>{t('packageColumn')}</th>
            <th>{t('versionColumn')}</th>
            <th>{t('latestColumn')}</th>
          </tr>
        </thead>
        <tbody>
          {packages.map((pkg) => {
            const isSelected = pkg.id === selectedPackageId;
            const needsUpdate = pkg.version !== pkg.latest;

            return (
              <tr
                key={pkg.id}
                className={isSelected ? 'selected' : ''}
                onClick={() => onSelectPackage(pkg.id)}
              >
                <td>
                  <div className="package-name-cell">
                    <PackageIcon seed={pkg.name} />
                    <span>{pkg.name}</span>
                  </div>
                </td>
                <td>{pkg.version}</td>
                <td className={needsUpdate ? 'update-available' : ''}>{pkg.latest}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
