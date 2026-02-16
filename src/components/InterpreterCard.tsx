import type { I18nKey } from '../state/i18n';

interface InterpreterCardProps {
  pythonVersion: string;
  uvVersion: string;
  t: (key: I18nKey) => string;
}

export default function InterpreterCard({ pythonVersion, uvVersion, t }: InterpreterCardProps) {
  const uvNotFound = uvVersion.toLowerCase().includes('not found');

  return (
    <section className="interpreter-card">
      <h2>{t('interpreter')}</h2>
      <dl>
        <div>
          <dt>{t('pythonLabel')}</dt>
          <dd>{pythonVersion}</dd>
        </div>
        <div>
          <dt>{t('uvLabel')}</dt>
          <dd className={uvNotFound ? 'warning' : ''}>{uvVersion}</dd>
        </div>
      </dl>
    </section>
  );
}
