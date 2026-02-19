import { invoke } from '@tauri-apps/api/core';
import { type CloseRequestedEvent, getCurrentWindow } from '@tauri-apps/api/window';
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
import WorkspaceTabs from './components/WorkspaceTabs';
import { fetchEnvironmentPackages, fetchEnvironments } from './state/backend';
import { useI18n } from './state/i18n';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  initSettingsStore,
  loadAppSettings,
  loadSavedWorkspaceTabs,
  persistAppSettings,
  persistSavedWorkspaceTabs,
  type SavedWorkspaceTab,
  type Language
} from './state/store';
import type { EnvironmentItem, PackageItem } from './types/domain';

type MainTab = 'packages' | 'dependencyTree' | 'requirements';

interface WorkspaceTabState {
  id: string;
  name: string;
  envRootDir: string;
  environments: EnvironmentItem[];
  selectedEnvironmentId: string;
  isExpanded: boolean;
}

const INITIAL_CONSOLE_LINES = [
  '[boot] ui initialized',
  '[boot] waiting for environment scan',
  '[ready] waiting for user action'
];

async function showMessage(text: string, title = 'uvnvpie'): Promise<void> {
  try {
    await message(text, { title });
  } catch (error) {
    console.error(title, text, error);
  }
}

async function showConfirm(text: string, title = 'uvnvpie'): Promise<boolean> {
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

function getFolderName(path: string): string {
  const normalized = path.trim().replace(/[\\/]+$/, '');

  if (!normalized) {
    return '';
  }

  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [language, setLanguage] = useState<Language>(DEFAULT_SETTINGS.language);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsReady, setIsSettingsReady] = useState(false);

  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTabState[]>([]);
  const [activeWorkspaceTabId, setActiveWorkspaceTabId] = useState('');
  const [editingWorkspaceTabId, setEditingWorkspaceTabId] = useState<string | null>(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState('');

  const [packagesByEnvironment, setPackagesByEnvironment] = useState<Record<string, PackageItem[]>>({});
  const [selectedPackageIdByWorkspace, setSelectedPackageIdByWorkspace] = useState<Record<string, string>>({});
  const [mainTabByWorkspace, setMainTabByWorkspace] = useState<Record<string, MainTab>>({});

  const [uvVersion, setUvVersion] = useState('...');
  const [consoleLines, setConsoleLines] = useState<string[]>(INITIAL_CONSOLE_LINES);
  const [isJobRunning, setIsJobRunning] = useState(false);
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);
  const [isWindowFocused, setIsWindowFocused] = useState(() => document.hasFocus());
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);

  const timersRef = useRef<number[]>([]);
  const jobTokenRef = useRef(0);
  const workspaceCounterRef = useRef(0);
  const closePromptActiveRef = useRef(false);
  const requestWindowCloseRef = useRef<() => Promise<void>>(async () => {});
  const closeRequestedUnlistenRef = useRef<(() => void) | null>(null);

  const { t } = useI18n(language);

  const createWorkspaceTab = (envRootDir: string, nameOverride = ''): WorkspaceTabState => {
    workspaceCounterRef.current += 1;

    const folderName = getFolderName(envRootDir);
    const normalizedName = nameOverride.trim();

    return {
      id: `workspace-${workspaceCounterRef.current}`,
      name: normalizedName || folderName || t('folderFallbackName'),
      envRootDir,
      environments: [],
      selectedEnvironmentId: '',
      isExpanded: true
    };
  };

  const appendConsole = (line: string) => {
    setConsoleLines((previous) => [...previous, `[${timestamp()}] ${line}`]);
  };

  const clearTimers = () => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }

    timersRef.current = [];
  };

  const loadWorkspaceEnvironments = async (tabId: string, envRootDir: string) => {
    const normalizedRootDir = envRootDir.trim();

    if (!normalizedRootDir) {
      setWorkspaceTabs((previous) =>
        previous.map((tab) => {
          if (tab.id !== tabId) {
            return tab;
          }

          return {
            ...tab,
            environments: [],
            selectedEnvironmentId: ''
          };
        })
      );

      setSelectedPackageIdByWorkspace((previous) => ({
        ...previous,
        [tabId]: ''
      }));

      return;
    }

    try {
      const nextEnvironments = await fetchEnvironments(normalizedRootDir);

      setWorkspaceTabs((previous) =>
        previous.map((tab) => {
          if (tab.id !== tabId) {
            return tab;
          }

          const selectedEnvironmentId = nextEnvironments.some(
            (environment) => environment.id === tab.selectedEnvironmentId
          )
            ? tab.selectedEnvironmentId
            : nextEnvironments[0]?.id ?? '';

          return {
            ...tab,
            environments: nextEnvironments,
            selectedEnvironmentId
          };
        })
      );

      setSelectedPackageIdByWorkspace((previous) => ({
        ...previous,
        [tabId]: ''
      }));

      appendConsole(
        `[data] loaded ${nextEnvironments.length} environment(s)${normalizedRootDir ? ` from ${normalizedRootDir}` : ''}`
      );
    } catch (error) {
      console.error(error);

      setWorkspaceTabs((previous) =>
        previous.map((tab) => {
          if (tab.id !== tabId) {
            return tab;
          }

          return {
            ...tab,
            environments: [],
            selectedEnvironmentId: ''
          };
        })
      );

      setSelectedPackageIdByWorkspace((previous) => ({
        ...previous,
        [tabId]: ''
      }));

      appendConsole('[error] failed to load environment list');
      await showMessage('Failed to load environments.', 'uvnvpie');
    }
  };

  const activeWorkspace = useMemo(() => {
    if (!activeWorkspaceTabId) {
      return workspaceTabs[0] ?? null;
    }

    return workspaceTabs.find((tab) => tab.id === activeWorkspaceTabId) ?? workspaceTabs[0] ?? null;
  }, [workspaceTabs, activeWorkspaceTabId]);

  const selectedEnvironment = useMemo(() => {
    if (!activeWorkspace) {
      return null;
    }

    return (
      activeWorkspace.environments.find((environment) => environment.id === activeWorkspace.selectedEnvironmentId) ?? null
    );
  }, [activeWorkspace]);

  const fallbackEnvironment = useMemo<EnvironmentItem>(() => {
    return {
      id: 'none',
      name: t('notAvailable'),
      pythonVersion: 'Python',
      interpreterPath: t('notAvailable'),
      location: t('notAvailable')
    };
  }, [t]);

  const displayedEnvironment = selectedEnvironment ?? fallbackEnvironment;

  const packages = useMemo(() => {
    if (!selectedEnvironment) {
      return [];
    }

    return packagesByEnvironment[selectedEnvironment.id] ?? [];
  }, [packagesByEnvironment, selectedEnvironment]);

  const activeMainTab = useMemo<MainTab>(() => {
    if (!activeWorkspace?.id) {
      return 'packages';
    }

    return mainTabByWorkspace[activeWorkspace.id] ?? 'packages';
  }, [activeWorkspace, mainTabByWorkspace]);

  const selectedPackageId = useMemo(() => {
    if (!activeWorkspace?.id) {
      return '';
    }

    return selectedPackageIdByWorkspace[activeWorkspace.id] ?? '';
  }, [activeWorkspace, selectedPackageIdByWorkspace]);

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

  const collectWorkspaceTabsForPersistence = (): SavedWorkspaceTab[] => {
    const unique = new Set<string>();

    return workspaceTabs
      .map((tab) => ({
        envRootDir: tab.envRootDir.trim(),
        name: tab.name.trim()
      }))
      .filter((tab) => {
        if (!tab.envRootDir || unique.has(tab.envRootDir)) {
          return false;
        }

        unique.add(tab.envRootDir);
        return true;
      });
  };

  const closeWindowNow = async () => {
    const appWindow = getCurrentWindow();
    if (closeRequestedUnlistenRef.current) {
      closeRequestedUnlistenRef.current();
      closeRequestedUnlistenRef.current = null;
    }

    await appWindow.close();
  };

  const requestWindowClose = async () => {
    if (closePromptActiveRef.current) {
      return;
    }

    closePromptActiveRef.current = true;

    try {
      if (settings.alwaysSaveTabs) {
        const tabsToPersist = collectWorkspaceTabsForPersistence();
        await persistSavedWorkspaceTabs(tabsToPersist);
      } else {
        await persistSavedWorkspaceTabs([]);
      }

      await closeWindowNow();
    } catch (error) {
      console.error('window close request failed', error);
      await closeWindowNow();
    } finally {
      closePromptActiveRef.current = false;
    }
  };

  requestWindowCloseRef.current = requestWindowClose;

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

  const syncWindowMaximizedState = async () => {
    try {
      const maximized = await getCurrentWindow().isMaximized();
      setIsWindowMaximized(maximized);
    } catch (error) {
      console.error('window maximize state sync failed', error);
    }
  };

  const runWindowAction = async (action: 'minimize' | 'maximize' | 'close') => {
    try {
      const appWindow = getCurrentWindow();

      if (action === 'minimize') {
        await appWindow.minimize();
      }

      if (action === 'maximize') {
        await appWindow.toggleMaximize();
        await syncWindowMaximizedState();
      }

      if (action === 'close') {
        await requestWindowClose();
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

  const openWorkspaceTab = async () => {
    try {
      const selection = await open({
        title: t('pickWorkspaceFolderTitle'),
        directory: true,
        multiple: false
      });

      if (typeof selection !== 'string') {
        return;
      }

      const envRootDir = selection.trim();

      if (!envRootDir) {
        return;
      }

      const existingTab = workspaceTabs.find((tab) => tab.envRootDir === envRootDir);

      if (existingTab) {
        setActiveWorkspaceTabId(existingTab.id);
        setWorkspaceTabs((previous) =>
          previous.map((tab) => {
            if (tab.id !== existingTab.id) {
              return tab;
            }

            return {
              ...tab,
              isExpanded: true
            };
          })
        );

        return;
      }

      const nextTab = createWorkspaceTab(envRootDir);

      setWorkspaceTabs((previous) => [...previous, nextTab]);
      setActiveWorkspaceTabId(nextTab.id);
      setMainTabByWorkspace((previous) => ({
        ...previous,
        [nextTab.id]: 'packages'
      }));
      setSelectedPackageIdByWorkspace((previous) => ({
        ...previous,
        [nextTab.id]: ''
      }));

      void loadWorkspaceEnvironments(nextTab.id, nextTab.envRootDir);
    } catch (error) {
      console.error(error);
      await showMessage(t('settingsLoadFailed'), t('dialogErrorTitle'));
    }
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    setActiveWorkspaceTabId(workspaceId);
  };

  const handleToggleWorkspaceExpanded = (workspaceId: string) => {
    setWorkspaceTabs((previous) =>
      previous.map((tab) => {
        if (tab.id !== workspaceId) {
          return tab;
        }

        return {
          ...tab,
          isExpanded: !tab.isExpanded
        };
      })
    );
  };

  const handleSelectEnvironment = (workspaceId: string, environmentId: string) => {
    setActiveWorkspaceTabId(workspaceId);
    setWorkspaceTabs((previous) =>
      previous.map((tab) => {
        if (tab.id !== workspaceId) {
          return tab;
        }

        return {
          ...tab,
          selectedEnvironmentId: environmentId,
          isExpanded: true
        };
      })
    );
  };

  const handleMainTabChange = (tab: MainTab) => {
    if (!activeWorkspace?.id) {
      return;
    }

    setMainTabByWorkspace((previous) => ({
      ...previous,
      [activeWorkspace.id]: tab
    }));
  };

  const handleSelectPackage = (packageId: string) => {
    if (!activeWorkspace?.id) {
      return;
    }

    setSelectedPackageIdByWorkspace((previous) => ({
      ...previous,
      [activeWorkspace.id]: packageId
    }));
  };

  const startWorkspaceRename = (workspaceId: string) => {
    const target = workspaceTabs.find((tab) => tab.id === workspaceId);

    if (!target) {
      return;
    }

    setEditingWorkspaceTabId(workspaceId);
    setEditingWorkspaceName(target.name);
  };

  const cancelWorkspaceRename = () => {
    setEditingWorkspaceTabId(null);
    setEditingWorkspaceName('');
  };

  const commitWorkspaceRename = () => {
    if (!editingWorkspaceTabId) {
      return;
    }

    const nextLabel = editingWorkspaceName.trim();
    const editingId = editingWorkspaceTabId;

    setWorkspaceTabs((previous) =>
      previous.map((tab) => {
        if (tab.id !== editingId) {
          return tab;
        }

        return {
          ...tab,
          name: nextLabel || getFolderName(tab.envRootDir) || t('folderFallbackName')
        };
      })
    );

    setEditingWorkspaceTabId(null);
    setEditingWorkspaceName('');
  };

  const closeWorkspaceTab = (workspaceId: string) => {
    const targetIndex = workspaceTabs.findIndex((tab) => tab.id === workspaceId);

    if (targetIndex < 0) {
      return;
    }

    const nextTabs = workspaceTabs.filter((tab) => tab.id !== workspaceId);
    setWorkspaceTabs(nextTabs);

    if (activeWorkspaceTabId === workspaceId) {
      const neighborTab = workspaceTabs[targetIndex + 1] ?? workspaceTabs[targetIndex - 1] ?? nextTabs[0];
      setActiveWorkspaceTabId(neighborTab?.id ?? '');
    }

    setMainTabByWorkspace((previous) => {
      if (!(workspaceId in previous)) {
        return previous;
      }

      const { [workspaceId]: _removedMainTab, ...rest } = previous;
      return rest;
    });

    setSelectedPackageIdByWorkspace((previous) => {
      if (!(workspaceId in previous)) {
        return previous;
      }

      const { [workspaceId]: _removedPackageId, ...rest } = previous;
      return rest;
    });

    if (editingWorkspaceTabId === workspaceId) {
      setEditingWorkspaceTabId(null);
      setEditingWorkspaceName('');
    }
  };

  useEffect(() => {
    if (!activeWorkspaceTabId && workspaceTabs.length > 0) {
      setActiveWorkspaceTabId(workspaceTabs[0].id);
      return;
    }

    if (activeWorkspaceTabId && !workspaceTabs.some((tab) => tab.id === activeWorkspaceTabId)) {
      setActiveWorkspaceTabId(workspaceTabs[0]?.id ?? '');
    }
  }, [activeWorkspaceTabId, workspaceTabs]);

  useEffect(() => {
    if (!activeWorkspace?.id) {
      return;
    }

    setSelectedPackageIdByWorkspace((previous) => {
      const currentPackageId = previous[activeWorkspace.id] ?? '';

      if (packages.length === 0) {
        if (!currentPackageId) {
          return previous;
        }

        return {
          ...previous,
          [activeWorkspace.id]: ''
        };
      }

      if (packages.some((pkg) => pkg.id === currentPackageId)) {
        return previous;
      }

      return {
        ...previous,
        [activeWorkspace.id]: packages[0].id
      };
    });
  }, [activeWorkspace, packages]);

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
        await showMessage('Failed to load settings.', 'uvnvpie');
      } finally {
        if (alive) {
          setIsSettingsReady(true);
        }
      }
    };

    void loadSettings();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isSettingsReady) {
      return;
    }

    let alive = true;

    const resetWorkspaceState = () => {
      setWorkspaceTabs([]);
      setActiveWorkspaceTabId('');
      setMainTabByWorkspace({});
      setSelectedPackageIdByWorkspace({});
      setPackagesByEnvironment({});
      setEditingWorkspaceTabId(null);
      setEditingWorkspaceName('');
    };

    const restoreSavedTabs = async () => {
      try {
        const savedTabs = await loadSavedWorkspaceTabs();

        if (!alive) {
          return;
        }

        if (savedTabs.length === 0) {
          resetWorkspaceState();
          return;
        }

        const restoredTabs = savedTabs.map((tab) => createWorkspaceTab(tab.envRootDir, tab.name));

        setWorkspaceTabs(restoredTabs);
        setActiveWorkspaceTabId(restoredTabs[0]?.id ?? '');
        setMainTabByWorkspace(
          Object.fromEntries(restoredTabs.map((tab) => [tab.id, 'packages'] as const)) as Record<string, MainTab>
        );
        setSelectedPackageIdByWorkspace(
          Object.fromEntries(restoredTabs.map((tab) => [tab.id, ''] as const)) as Record<string, string>
        );
        setPackagesByEnvironment({});
        setEditingWorkspaceTabId(null);
        setEditingWorkspaceName('');

        for (const tab of restoredTabs) {
          void loadWorkspaceEnvironments(tab.id, tab.envRootDir);
        }
      } catch (error) {
        console.error(error);
        await showMessage('Failed to load settings.', 'uvnvpie');

        if (alive) {
          resetWorkspaceState();
        }
      }
    };

    void restoreSavedTabs();

    return () => {
      alive = false;
    };
  }, [isSettingsReady]);

  useEffect(() => {
    if (!selectedEnvironment) {
      return;
    }

    if (packagesByEnvironment[selectedEnvironment.id]) {
      return;
    }

    let alive = true;
    const environment = selectedEnvironment;

    const loadPackages = async () => {
      try {
        const nextPackages = await fetchEnvironmentPackages(environment.interpreterPath);

        if (!alive) {
          return;
        }

        setPackagesByEnvironment((previous) => ({
          ...previous,
          [environment.id]: nextPackages
        }));

        appendConsole(`[data] loaded ${nextPackages.length} package(s) for ${environment.name}`);
      } catch (error) {
        console.error(error);

        if (!alive) {
          return;
        }

        setPackagesByEnvironment((previous) => ({
          ...previous,
          [environment.id]: []
        }));

        appendConsole(`[error] failed to load packages for ${environment.name}`);
        await showMessage('Failed to load package data for this environment.', 'uvnvpie');
      }
    };

    void loadPackages();

    return () => {
      alive = false;
    };
  }, [selectedEnvironment, packagesByEnvironment]);

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
    let active = true;
    const appWindow = getCurrentWindow();

    const syncState = async () => {
      try {
        const maximized = await appWindow.isMaximized();

        if (active) {
          setIsWindowMaximized(maximized);
        }
      } catch (error) {
        console.error('window maximize listener failed', error);
      }
    };

    void syncState();

    let unlistenResized: (() => void) | null = null;

    void appWindow
      .onResized(() => {
        void syncState();
      })
      .then((unlisten) => {
        if (!active) {
          unlisten();
          return;
        }

        unlistenResized = unlisten;
      })
      .catch((error) => {
        console.error('window resize listener registration failed', error);
      });

    return () => {
      active = false;

      if (unlistenResized) {
        unlistenResized();
      }
    };
  }, []);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let unlistenCloseRequested: (() => void) | null = null;
    let active = true;

    void appWindow
      .onCloseRequested(async (event: CloseRequestedEvent) => {
        event.preventDefault();
        await requestWindowCloseRef.current();
      })
      .then((unlisten) => {
        if (!active) {
          unlisten();
          return;
        }

        unlistenCloseRequested = unlisten;
        closeRequestedUnlistenRef.current = unlisten;
      })
      .catch((error) => {
        console.error('window close listener registration failed', error);
      });

    return () => {
      active = false;

      if (unlistenCloseRequested) {
        unlistenCloseRequested();
      }

      if (closeRequestedUnlistenRef.current === unlistenCloseRequested) {
        closeRequestedUnlistenRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('window-maximized', isWindowMaximized);

    return () => {
      document.body.classList.remove('window-maximized');
    };
  }, [isWindowMaximized]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

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
            isTaskRunning={isJobRunning}
            onOpenSettings={openSettings}
            onOpenAbout={() => setIsAboutOpen(true)}
            onMinimize={() => void runWindowAction('minimize')}
            onToggleMaximize={() => void runWindowAction('maximize')}
            onClose={() => void runWindowAction('close')}
            t={t}
          />

          <div className="main-layout">
            <Sidebar
              workspaces={workspaceTabs}
              activeWorkspaceId={activeWorkspace?.id ?? ''}
              onSelectWorkspace={handleSelectWorkspace}
              onToggleWorkspaceExpanded={handleToggleWorkspaceExpanded}
              onSelectEnvironment={handleSelectEnvironment}
              onCreateEnvironment={() => appendConsole(t('createEnvironmentPending'))}
              onOpenWorkspace={() => void openWorkspaceTab()}
              t={t}
            />

            <main className={`main-content${isConsoleCollapsed ? ' console-collapsed' : ''}`}>
              <section className="top-panels">
                <HeaderPanel environment={displayedEnvironment} t={t} />
                <InterpreterCard pythonVersion={displayedEnvironment.pythonVersion} uvVersion={uvVersion} t={t} />
              </section>

              <WorkspaceTabs
                tabs={workspaceTabs.map((tab) => ({ id: tab.id, label: tab.name }))}
                activeTabId={activeWorkspace?.id ?? ''}
                editingTabId={editingWorkspaceTabId}
                editValue={editingWorkspaceName}
                closeLabel={t('close')}
                onSelectTab={handleSelectWorkspace}
                onStartEditTab={startWorkspaceRename}
                onEditValueChange={setEditingWorkspaceName}
                onCommitEdit={commitWorkspaceRename}
                onCancelEdit={cancelWorkspaceRename}
                onCloseTab={closeWorkspaceTab}
              />

              <section className="tab-content-stack">
                <section className="packages-section">
                  <div className="packages-toolbar">
                    <Tabs tabs={tabs} activeTab={activeMainTab} onChangeTab={handleMainTabChange} />
                    {activeMainTab === 'packages' ? (
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

                  {activeMainTab === 'packages' ? (
                    <PackagesTable
                      packages={packages}
                      selectedPackageId={selectedPackage?.id ?? ''}
                      onSelectPackage={handleSelectPackage}
                      t={t}
                    />
                  ) : (
                    <div className="packages-placeholder">
                      <p>{activeMainTab === 'dependencyTree' ? t('dependencyTreePlaceholder') : t('requirementsPlaceholder')}</p>
                    </div>
                  )}
                </section>

                {activeMainTab === 'packages' ? (
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
