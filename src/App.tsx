import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { confirm, message, open } from '@tauri-apps/plugin-dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import AboutDialog from './components/AboutDialog';
import ActionsPanel from './components/ActionsPanel';
import ConsolePanel from './components/ConsolePanel';
import DetailsPanel from './components/DetailsPanel';
import HeaderPanel from './components/HeaderPanel';
import InterpreterCard from './components/InterpreterCard';
import PackagesTable from './components/PackagesTable';
import SettingsDialog from './components/SettingsDialog';
import Sidebar from './components/Sidebar';
import Tabs from './components/Tabs';
import Titlebar from './components/Titlebar';
import { environments, initialConsoleLines, packagesByEnvironment } from './mock/data';
import { useI18n } from './state/i18n';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  initSettingsStore,
  loadAppSettings,
  persistAppSettings,
  type Language
} from './state/store';

type MainTab = 'packages' | 'dependencyTree' | 'requirements';

async function showMessage(text: string, title = 'uvnvpy'): Promise<void> {
  try {
    await message(text, { title });
  } catch (error) {
    console.error(title, text, error);
  }
}

async function showConfirm(text: string, title = 'uvnvpy'): Promise<boolean> {
  try {
    return await confirm(text, { title, kind: 'warning' });
  } catch (error) {
    console.error(title, text, error);
    return true;
  }
}

function timestamp(): string {
  return new Date().toLocaleTimeString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [language, setLanguage] = useState<Language>(DEFAULT_SETTINGS.language);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState(environments[0]?.id ?? '');
  const [selectedPackageId, setSelectedPackageId] = useState('requests');
  const [activeTab, setActiveTab] = useState<MainTab>('packages');

  const [uvVersion, setUvVersion] = useState('...');
  const [consoleLines, setConsoleLines] = useState<string[]>(initialConsoleLines);
  const [isJobRunning, setIsJobRunning] = useState(false);
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);
  const [isWindowFocused, setIsWindowFocused] = useState(() => document.hasFocus());

  const timersRef = useRef<number[]>([]);
  const jobTokenRef = useRef(0);

  const { t } = useI18n(language);

  const selectedEnvironment = useMemo(() => {
    return environments.find((environment) => environment.id === selectedEnvironmentId) ?? environments[0] ?? null;
  }, [selectedEnvironmentId]);

  const packages = useMemo(() => {
    return packagesByEnvironment[selectedEnvironmentId] ?? [];
  }, [selectedEnvironmentId]);

  const selectedPackage = useMemo(() => {
    return packages.find((pkg) => pkg.id === selectedPackageId) ?? packages[0] ?? null;
  }, [packages, selectedPackageId]);

  const tabs = useMemo(
    () => [
      { key: 'packages' as const, label: t('packagesTab') },
      { key: 'dependencyTree' as const, label: t('dependencyTreeTab') },
      { key: 'requirements' as const, label: t('requirementsTab') }
    ],
    [t]
  );

  const settingsDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(settingsDraft);
  }, [settings, settingsDraft]);

  const appendConsole = (line: string) => {
    setConsoleLines((previous) => [...previous, `[${timestamp()}] ${line}`]);
  };

  const clearTimers = () => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }

    timersRef.current = [];
  };

  const startMockJob = (label: string) => {
    if (isJobRunning) {
      return;
    }

    clearTimers();
    jobTokenRef.current += 1;
    const token = jobTokenRef.current;

    setIsJobRunning(true);
    appendConsole(`${t('jobStart')}: ${label}`);

    const steps = [t('jobStepResolve'), t('jobStepExecute'), t('jobStepWrite'), t('jobDone')];
    const stepDelays = [700, 1700, 2500, 3400];

    steps.forEach((step, index) => {
      const timer = window.setTimeout(() => {
        if (token !== jobTokenRef.current) {
          return;
        }

        appendConsole(step);

        if (index === steps.length - 1) {
          setIsJobRunning(false);
          clearTimers();
        }
      }, stepDelays[index]);

      timersRef.current.push(timer);
    });
  };

  const runWindowAction = async (action: 'minimize' | 'maximize' | 'close') => {
    try {
      const appWindow = getCurrentWindow();

      if (action === 'minimize') {
        await appWindow.minimize();
      }

      if (action === 'maximize') {
        await appWindow.toggleMaximize();
      }

      if (action === 'close') {
        await appWindow.close();
      }
    } catch (error) {
      console.error('window action failed', action, error);
    }
  };

  const openSettings = () => {
    setSettingsDraft(settings);
    setLanguage(settings.language);
    setIsSettingsOpen(true);
  };

  const closeSettings = async () => {
    if (isSettingsSaving) {
      return;
    }

    if (settingsDirty) {
      const shouldDiscard = await showConfirm(t('discardSettingsConfirm'), t('settings'));

      if (!shouldDiscard) {
        return;
      }
    }

    setSettingsDraft(settings);
    setLanguage(settings.language);
    setIsSettingsOpen(false);
  };

  const saveSettings = async () => {
    setIsSettingsSaving(true);

    try {
      await persistAppSettings(settingsDraft);
      setSettings(settingsDraft);
      setLanguage(settingsDraft.language);
      setIsSettingsOpen(false);
    } catch (error) {
      console.error(error);
      await showMessage(t('settingsSaveFailed'), t('dialogErrorTitle'));
    } finally {
      setIsSettingsSaving(false);
    }
  };

  const browseEnvRoot = async () => {
    try {
      const selection = await open({
        title: t('pickEnvRootTitle'),
        directory: true,
        multiple: false
      });

      if (typeof selection === 'string') {
        setSettingsDraft((previous) => ({
          ...previous,
          envRootDir: selection
        }));
      }
    } catch (error) {
      console.error(error);
      await showMessage(t('settingsLoadFailed'), t('dialogErrorTitle'));
    }
  };

  const browseUvBinary = async () => {
    try {
      const selection = await open({
        title: t('pickUvBinaryTitle'),
        directory: false,
        multiple: false
      });

      if (typeof selection === 'string') {
        setSettingsDraft((previous) => ({
          ...previous,
          uvBinaryPath: selection
        }));
      }
    } catch (error) {
      console.error(error);
      await showMessage(t('settingsLoadFailed'), t('dialogErrorTitle'));
    }
  };

  useEffect(() => {
    if (packages.length === 0) {
      setSelectedPackageId('');
      return;
    }

    if (!packages.some((pkg) => pkg.id === selectedPackageId)) {
      setSelectedPackageId(packages[0].id);
    }
  }, [packages, selectedPackageId]);

  useEffect(() => {
    let alive = true;

    const loadSettings = async () => {
      try {
        await initSettingsStore();
        const savedSettings = await loadAppSettings();

        if (!alive) {
          return;
        }

        setSettings(savedSettings);
        setSettingsDraft(savedSettings);
        setLanguage(savedSettings.language);
      } catch (error) {
        console.error(error);
        await showMessage('Failed to load settings.', 'uvnvpy');
      }
    };

    void loadSettings();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    const loadUvVersion = async () => {
      try {
        const version = await invoke<string>('get_uv_version');

        if (alive) {
          setUvVersion(version);
        }
      } catch (error) {
        console.error(error);

        if (alive) {
          setUvVersion('uv not found');
        }
      }
    };

    void loadUvVersion();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  if (!selectedEnvironment) {
    return null;
  }

  const installPackageLabel = selectedPackage
    ? `${t('installPackage')} ${selectedPackage.name}`
    : t('installPackage');
  const installLabel = selectedPackage ? `${t('install')} ${selectedPackage.name}` : t('install');
  const upgradeLabel = selectedPackage ? `${t('upgrade')} ${selectedPackage.name}` : t('upgrade');
  const uninstallLabel = selectedPackage ? `${t('uninstall')} ${selectedPackage.name}` : t('uninstall');

  return (
    <div className={`window-shell ${isWindowFocused ? 'is-active' : 'is-inactive'}`}>
      <div className="window-frame">
        <div className="app-window">
          <Titlebar
            title={t('appTitle')}
            onOpenSettings={openSettings}
            onOpenAbout={() => setIsAboutOpen(true)}
            onMinimize={() => void runWindowAction('minimize')}
            onToggleMaximize={() => void runWindowAction('maximize')}
            onClose={() => void runWindowAction('close')}
            t={t}
          />

          <div className="main-layout">
            <Sidebar
              environments={environments}
              selectedEnvironmentId={selectedEnvironmentId}
              onSelectEnvironment={setSelectedEnvironmentId}
              onCreateEnvironment={() => appendConsole(t('createEnvironmentPending'))}
              t={t}
            />

            <main className={`main-content${isConsoleCollapsed ? ' console-collapsed' : ''}`}>
              <section className="top-panels">
                <HeaderPanel environment={selectedEnvironment} t={t} />
                <InterpreterCard pythonVersion={selectedEnvironment.pythonVersion} uvVersion={uvVersion} t={t} />
              </section>

              <section className="tab-content-stack">
                <section className="packages-section">
                  <div className="packages-toolbar">
                    <Tabs tabs={tabs} activeTab={activeTab} onChangeTab={setActiveTab} />
                    {activeTab === 'packages' ? (
                      <div className="packages-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={isJobRunning}
                          onClick={() => startMockJob(installPackageLabel)}
                        >
                          {t('installPackage')}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={isJobRunning}
                          onClick={() => startMockJob(t('updateAll'))}
                        >
                          {t('updateAll')}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {activeTab === 'packages' ? (
                    <PackagesTable
                      packages={packages}
                      selectedPackageId={selectedPackage?.id ?? ''}
                      onSelectPackage={setSelectedPackageId}
                      t={t}
                    />
                  ) : (
                    <div className="packages-placeholder">
                      <p>{activeTab === 'dependencyTree' ? t('dependencyTreePlaceholder') : t('requirementsPlaceholder')}</p>
                    </div>
                  )}
                </section>

                {activeTab === 'packages' ? (
                  <section className="bottom-panels">
                    <DetailsPanel packageItem={selectedPackage} t={t} />
                    <ActionsPanel
                      onInstall={() => startMockJob(installLabel)}
                      onUpgrade={() => startMockJob(upgradeLabel)}
                      onUninstall={() => startMockJob(uninstallLabel)}
                      onExportRequirements={() => startMockJob(t('exportRequirements'))}
                      disabled={isJobRunning || !selectedPackage}
                      t={t}
                    />
                  </section>
                ) : null}
              </section>

              <ConsolePanel
                lines={consoleLines}
                collapsed={isConsoleCollapsed}
                onToggleCollapsed={() => setIsConsoleCollapsed((previous) => !previous)}
                onExit={() => void runWindowAction('close')}
                onClear={() => setConsoleLines([])}
                t={t}
              />
            </main>
          </div>

          <SettingsDialog
            open={isSettingsOpen}
            draft={settingsDraft}
            isSaving={isSettingsSaving}
            onChange={(next) => {
              setSettingsDraft(next);
              setLanguage(next.language);
            }}
            onBrowseEnvRoot={() => void browseEnvRoot()}
            onBrowseUvBinary={() => void browseUvBinary()}
            onSave={() => void saveSettings()}
            onCancel={() => void closeSettings()}
            t={t}
          />

          <AboutDialog open={isAboutOpen} onClose={() => setIsAboutOpen(false)} t={t} />
        </div>
      </div>
    </div>
  );
}
