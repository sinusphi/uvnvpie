import type { I18nKey } from '../state/i18n';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
  t: (key: I18nKey) => string;
}

export default function AboutDialog({ open, onClose, t }: AboutDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
        className="dialog-card about-card"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-header">
          <h2 id="about-dialog-title">{t('aboutTitle')}</h2>
        </header>
        <div className="dialog-body">
          <p>{t('aboutText')}</p>
        </div>
        <footer className="dialog-footer">
          <button type="button" className="primary-action" onClick={onClose}>
            {t('close')}
          </button>
        </footer>
      </section>
    </div>
  );
}
