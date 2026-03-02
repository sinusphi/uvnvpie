import { useCallback, useEffect, useState } from 'react';
import type { EnvironmentItem } from '../types/domain';
import type { I18nKey } from '../state/i18n';

type PathDisclosureState = 'collapsed' | 'expanding' | 'expanded' | 'collapsing';

const TYPEWRITER_TARGET_MS = 860;
const TYPEWRITER_MIN_STEP_MS = 14;
const TYPEWRITER_MAX_STEP_MS = 38;
const PATH_FADE_OUT_MS = 360;

interface HeaderPanelProps {
  environment: EnvironmentItem;
  isManagedProject: boolean;
  t: (key: I18nKey) => string;
}

function usePathDisclosure(path: string) {
  const [state, setState] = useState<PathDisclosureState>('collapsed');
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    setState('collapsed');
    setVisibleChars(0);
  }, [path]);

  useEffect(() => {
    if (state !== 'expanding') {
      return;
    }

    if (path.length === 0) {
      setVisibleChars(0);
      setState('expanded');
      return;
    }

    setVisibleChars(0);
    const stepMs = Math.max(
      TYPEWRITER_MIN_STEP_MS,
      Math.min(TYPEWRITER_MAX_STEP_MS, Math.floor(TYPEWRITER_TARGET_MS / path.length))
    );
    const timer = window.setInterval(() => {
      setVisibleChars((current) => {
        const next = current + 1;
        if (next >= path.length) {
          window.clearInterval(timer);
          setState('expanded');
          return path.length;
        }

        return next;
      });
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [path, state]);

  useEffect(() => {
    if (state !== 'collapsing') {
      return;
    }

    const timer = window.setTimeout(() => {
      setVisibleChars(0);
      setState('collapsed');
    }, PATH_FADE_OUT_MS);

    return () => window.clearTimeout(timer);
  }, [state]);

  const toggle = useCallback(() => {
    setState((current) => {
      if (current === 'collapsed' || current === 'collapsing') {
        return 'expanding';
      }

      return 'collapsing';
    });
  }, []);

  const isOpen = state === 'expanding' || state === 'expanded';
  const isVisible = state !== 'collapsed';
  const displayedPath = state === 'expanded' ? path : path.slice(0, visibleChars);

  return {
    displayedPath,
    isOpen,
    isVisible,
    state,
    toggle
  };
}

export default function HeaderPanel({ environment, isManagedProject, t }: HeaderPanelProps) {
  const badgeModeClass = isManagedProject ? 'project-mode' : 'direct-mode';
  const modeClass = isManagedProject ? 'is-project' : 'is-direct';
  const pythonVersionLabel = environment.pythonVersion.split(/\s*-\s*/, 1)[0]?.trim() || environment.pythonVersion;
  const interpreterPath = usePathDisclosure(environment.interpreterPath);
  const locationPath = usePathDisclosure(environment.location);
  const interpreterToggleLabel = interpreterPath.isOpen ? 'Hide interpreter path' : 'Show interpreter path';
  const locationToggleLabel = locationPath.isOpen ? 'Hide location path' : 'Show location path';

  return (
    <section className="header-panel">
      <h2>ENVIRONMENT</h2>
      <div className={`environment-name-badge ${badgeModeClass}`} aria-label={environment.name}>
        <span className="environment-name-badge-value">{environment.name}</span>
      </div>

      <div className="header-panel-row header-panel-python-row">
        <span className="header-panel-text">{pythonVersionLabel}</span>
        <button
          type="button"
          className="header-path-toggle-button"
          onClick={interpreterPath.toggle}
          aria-label={interpreterToggleLabel}
        >
          <span className={interpreterPath.isOpen ? 'chevron left' : 'chevron right'} aria-hidden="true" />
        </button>
        {interpreterPath.isVisible ? (
          <span className={`header-path-text ${interpreterPath.state}`}>{interpreterPath.displayedPath}</span>
        ) : null}
      </div>

      <div className="header-panel-row header-panel-location-row">
        <span className={`header-status-dot ${modeClass}`} aria-hidden="true" />
        <span className="header-panel-text">{t('locationLabel')}</span>
        <button
          type="button"
          className="header-path-toggle-button"
          onClick={locationPath.toggle}
          aria-label={locationToggleLabel}
        >
          <span className={locationPath.isOpen ? 'chevron left' : 'chevron right'} aria-hidden="true" />
        </button>
        {locationPath.isVisible ? (
          <span className={`header-path-text ${locationPath.state}`}>{locationPath.displayedPath}</span>
        ) : null}
      </div>
    </section>
  );
}
