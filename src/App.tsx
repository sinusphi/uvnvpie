import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { type CloseRequestedEvent, getCurrentWindow } from '@tauri-apps/api/window';
import { confirm, message, open } from '@tauri-apps/plugin-dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import AboutDialog from './components/AboutDialog';
import ActionsPanel from './components/ActionsPanel';
import ConsolePanel from './components/ConsolePanel';
import DependencyTreePanel from './components/DependencyTreePanel';
import DetailsPanel from './components/DetailsPanel';
import HeaderPanel from './components/HeaderPanel';
import InterpreterCard from './components/InterpreterCard';
import PackagesTable from './components/PackagesTable';
import RequirementsPanel from './components/RequirementsPanel';
import SecurityPanel from './components/SecurityPanel';
import SettingsDialog from './components/SettingsDialog';
import Sidebar from './components/Sidebar';
import Tabs from './components/Tabs';
import Titlebar from './components/Titlebar';
import WorkspaceTabs from './components/WorkspaceTabs';
import {
  fetchEnvironmentDependencyGraph,
  fetchProjectFiles,
  fetchEnvironmentPackages,
  fetchEnvironments,
  isValidProjectRoot,
  runUvDirectInstall,
  runUvDirectUninstall,
  runUvDirectUpdateAll,
  runUvDirectUpgrade,
  runUvAdd,
  runUvLock,
  runUvSync,
  runUvUninstall,
  runUvUpgrade
} from './state/backend';
import { useI18n } from './state/i18n';
import { scanSecurityFindings } from './state/security';
import {
  DEFAULT_SETTINGS,
  getThemeMode,
  type AppSettings,
  initSettingsStore,
  loadAppSettings,
  loadSavedWorkspaceTabs,
  persistAppSettings,
  persistSavedWorkspaceTabs,
  type OperationMode,
  type SavedWorkspaceTab,
  toggleThemeModePreset,
  type Language
} from './state/store';
import type {
  DependencyGraphPackage,
  DirectOperationTarget,
  EnvironmentItem,
  OperationTarget,
  PackageItem,
  ProjectFileNode,
  ProjectItem,
  ProjectOperationTarget,
  SecurityFinding,
  UvCommandResult
} from './types/domain';

type MainTab = 'packages' | 'dependencyTree' | 'requirements' | 'security';
type CommandOutputChannel = 'stdout' | 'stderr';

interface UvCommandOutputEvent {
  streamId: string;
  channel: CommandOutputChannel;
  chunk: string;
}

interface CommandStreamState {
  stdout: string;
  stderr: string;
  sawOutput: boolean;
}

const UV_COMMAND_OUTPUT_EVENT = 'uv-command-output';
const TASK_GLOW_MIN_CYCLE_MS = 1770;

interface WorkspaceTabState {
  id: string;
  name: string;
  envRootDir: string;
  environments: EnvironmentItem[];
  selectedEnvironmentId: string;
  projects: ProjectItem[];
  selectedProjectId: string;
  projectFileTree: ProjectFileNode[];
  expandedEnvironmentNodeIds: string[];
  expandedProjectNodeIds: string[];
  isProjectExpanded: boolean;
  isEnvironmentExpanded: boolean;
  showInProjects: boolean;
  showInEnvironments: boolean;
}

interface EnvironmentSecurityState {
  isScanning: boolean;
  findings: SecurityFinding[];
  error: string;
  scannedAt: string;
  packagesScanned: number;
}

interface EnvironmentDependencyState {
  isLoading: boolean;
  packages: DependencyGraphPackage[];
  error: string;
  loadedAt: string;
}

const INITIAL_CONSOLE_LINES = [
  '[boot] ui initialized',
  '[boot] waiting for environment scan',
  '[ready] waiting for user action'
];

const DEFAULT_ENVIRONMENT_SECURITY_STATE: EnvironmentSecurityState = {
  isScanning: false,
  findings: [],
  error: '',
  scannedAt: '',
  packagesScanned: 0
};

const DEFAULT_ENVIRONMENT_DEPENDENCY_STATE: EnvironmentDependencyState = {
  isLoading: false,
  packages: [],
  error: '',
  loadedAt: ''
};

function splitOutputChunk(buffered: string, chunk: string): { lines: string[]; remainder: string } {
  const normalized = `${buffered}${chunk}`.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parts = normalized.split('\n');
  const remainder = parts.pop() ?? '';
  const lines = parts.map((line) => line.trim()).filter((line) => line.length > 0);
  return { lines, remainder };
}

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

function buildPyprojectPath(rootDir: string): string {
  const normalized = rootDir.trim().replace(/[\\/]+$/, '');

  if (!normalized) {
    return '';
  }

  return `${normalized}/pyproject.toml`;
}

function createDefaultProjectForWorkspace(workspaceId: string, workspaceName: string, envRootDir: string): ProjectItem | null {
  const rootDir = envRootDir.trim();
  if (!rootDir) {
    return null;
  }

  return {
    id: `project-${workspaceId}`,
    name: workspaceName,
    rootDir,
    pyprojectPath: buildPyprojectPath(rootDir)
  };
}

function getNextOperationMode(mode: OperationMode): OperationMode {
  return mode === 'project' ? 'direct' : 'project';
}

function getAutoSwitchOperationMode(workspace: WorkspaceTabState | null): OperationMode {
  return workspace?.showInProjects ? 'project' : 'direct';
}

function normalizeFolderSelection(selection: string | string[] | null): string[] {
  const selectedFolders = (Array.isArray(selection) ? selection : [selection])
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(selectedFolders));
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [language, setLanguage] = useState<Language>(DEFAULT_SETTINGS.language);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsReady, setIsSettingsReady] = useState(false);
  const [hasRestoredWorkspaceState, setHasRestoredWorkspaceState] = useState(false);

  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTabState[]>([]);
  const [activeWorkspaceTabId, setActiveWorkspaceTabId] = useState('');
  const [editingWorkspaceTabId, setEditingWorkspaceTabId] = useState<string | null>(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState('');

  const [packagesByEnvironment, setPackagesByEnvironment] = useState<Record<string, PackageItem[]>>({});
  const [selectedPackageIdByWorkspace, setSelectedPackageIdByWorkspace] = useState<Record<string, string>>({});
  const [mainTabByWorkspace, setMainTabByWorkspace] = useState<Record<string, MainTab>>({});
  const [securityByEnvironment, setSecurityByEnvironment] = useState<Record<string, EnvironmentSecurityState>>({});
  const [selectedSecurityFindingIdByEnvironment, setSelectedSecurityFindingIdByEnvironment] = useState<
    Record<string, string>
  >({});
  const [dependencyByEnvironment, setDependencyByEnvironment] = useState<
    Record<string, EnvironmentDependencyState>
  >({});

  const [uvVersion, setUvVersion] = useState('...');
  const [consoleLines, setConsoleLines] = useState<string[]>(INITIAL_CONSOLE_LINES);
  const [isJobRunning, setIsJobRunning] = useState(false);
  const [isTaskGlowActive, setIsTaskGlowActive] = useState(false);
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);
  const [isWindowFocused, setIsWindowFocused] = useState(() => document.hasFocus());
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);

  const timersRef = useRef<number[]>([]);
  const jobTokenRef = useRef(0);
  const workspaceCounterRef = useRef(0);
  const commandStreamCounterRef = useRef(0);
  const commandStreamsRef = useRef<Record<string, CommandStreamState>>({});
  const taskGlowStartedAtRef = useRef<number | null>(null);
  const taskGlowHideTimerRef = useRef<number | null>(null);
  const closePromptActiveRef = useRef(false);
  const allowNativeCloseRef = useRef(false);
  const requestWindowCloseRef = useRef<() => Promise<void>>(async () => {});
  const closeRequestedUnlistenRef = useRef<(() => void) | null>(null);

  const { t } = useI18n(language);

  const createWorkspaceTab = (
    envRootDir: string,
    nameOverride = '',
    defaultExpanded = false,
    options: {
      seedProject?: boolean;
      initialProjectExpanded?: boolean;
      initialEnvironmentExpanded?: boolean;
      showInProjects?: boolean;
      showInEnvironments?: boolean;
    } = {}
  ): WorkspaceTabState => {
    workspaceCounterRef.current += 1;
    const workspaceId = `workspace-${workspaceCounterRef.current}`;

    const folderName = getFolderName(envRootDir);
    const normalizedName = nameOverride.trim();
    const workspaceName = normalizedName || folderName || t('folderFallbackName');
    const defaultProject = options.seedProject
      ? createDefaultProjectForWorkspace(workspaceId, workspaceName, envRootDir)
      : null;

    return {
      id: workspaceId,
      name: workspaceName,
      envRootDir,
      environments: [],
      selectedEnvironmentId: '',
      projects: defaultProject ? [defaultProject] : [],
      selectedProjectId: defaultProject?.id ?? '',
      projectFileTree: [],
      expandedEnvironmentNodeIds: [],
      expandedProjectNodeIds: [],
      isProjectExpanded: options.initialProjectExpanded ?? defaultExpanded,
      isEnvironmentExpanded: options.initialEnvironmentExpanded ?? defaultExpanded,
      showInProjects: options.showInProjects ?? true,
      showInEnvironments: options.showInEnvironments ?? true
    };
  };

  const appendConsole = (line: string) => {
    setConsoleLines((previous) => [...previous, `[${timestamp()}] ${line}`]);
  };

  const appendConsoleBatch = (lines: string[]) => {
    if (lines.length === 0) {
      return;
    }

    setConsoleLines((previous) => [...previous, ...lines.map((line) => `[${timestamp()}] ${line}`)]);
  };

  const clearTimers = () => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }

    timersRef.current = [];
  };

  const clearTaskGlowHideTimer = () => {
    if (taskGlowHideTimerRef.current === null) {
      return;
    }

    window.clearTimeout(taskGlowHideTimerRef.current);
    taskGlowHideTimerRef.current = null;
  };

  const waitForUiFrame = async () => {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  };

  const beginCommandStream = () => {
    commandStreamCounterRef.current += 1;
    const streamId = `uv-stream-${Date.now()}-${commandStreamCounterRef.current}`;
    commandStreamsRef.current[streamId] = {
      stdout: '',
      stderr: '',
      sawOutput: false
    };
    return streamId;
  };

  const finishCommandStream = (streamId: string): boolean => {
    const state = commandStreamsRef.current[streamId];
    if (!state) {
      return false;
    }

    const stdoutTail = state.stdout.trim();
    if (stdoutTail) {
      appendConsole(`[stdout] ${stdoutTail}`);
      state.sawOutput = true;
    }

    const stderrTail = state.stderr.trim();
    if (stderrTail) {
      appendConsole(`[stderr] ${stderrTail}`);
      state.sawOutput = true;
    }

    const sawOutput = state.sawOutput;
    delete commandStreamsRef.current[streamId];
    return sawOutput;
  };

  const loadWorkspaceEnvironments = async (
    tabId: string,
    envRootDir: string,
    options: { refreshPackages?: boolean } = {}
  ): Promise<EnvironmentItem | null> => {
    const normalizedRootDir = envRootDir.trim();

    try {
      const nextEnvironments = await fetchEnvironments(normalizedRootDir);
      const currentTab = workspaceTabs.find((tab) => tab.id === tabId) ?? null;
      const selectedEnvironmentId = nextEnvironments.some(
        (environment) => environment.id === currentTab?.selectedEnvironmentId
      )
        ? currentTab?.selectedEnvironmentId ?? ''
        : nextEnvironments[0]?.id ?? '';
      const selectedEnvironment =
        nextEnvironments.find((environment) => environment.id === selectedEnvironmentId) ?? null;

      setWorkspaceTabs((previous) =>
        previous.map((tab) => {
          if (tab.id !== tabId) {
            return tab;
          }

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

      if (options.refreshPackages && selectedEnvironment) {
        try {
          const nextPackages = await fetchEnvironmentPackages(selectedEnvironment.interpreterPath);
          setPackagesByEnvironment((previous) => ({
            ...previous,
            [selectedEnvironment.id]: nextPackages
          }));
          appendConsole(`[data] loaded ${nextPackages.length} package(s) for ${selectedEnvironment.name}`);
        } catch (error) {
          console.error(error);
          appendConsole(`[error] failed to load packages for ${selectedEnvironment.name}`);
        }
      }

      return selectedEnvironment;
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
      return null;
    }
  };

  const syncWorkspaceProjectState = async (
    tabId: string,
    envRootDir: string,
    options: { showInvalidMessage?: boolean } = {}
  ): Promise<boolean> => {
    const normalizedRootDir = envRootDir.trim();

    if (!normalizedRootDir) {
      setWorkspaceTabs((previous) =>
        previous.map((tab) => {
          if (tab.id !== tabId) {
            return tab;
          }

          return {
            ...tab,
            projects: [],
            selectedProjectId: '',
            projectFileTree: [],
            expandedProjectNodeIds: []
          };
        })
      );
      return false;
    }

    let isValid = false;
    let projectFileTree: ProjectFileNode[] = [];

    try {
      isValid = await isValidProjectRoot(normalizedRootDir);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : `Failed to validate project root: ${String(error ?? 'Unknown error')}`;
      appendConsole(`[error] ${messageText}`);
      if (options.showInvalidMessage) {
        await showMessage(messageText, 'uvnvpie');
      }
      return false;
    }

    if (isValid) {
      try {
        projectFileTree = await fetchProjectFiles(normalizedRootDir);
        appendConsole(
          `[data] loaded ${projectFileTree.length} project root entr${projectFileTree.length === 1 ? 'y' : 'ies'} from ${normalizedRootDir}`
        );
      } catch (error) {
        const messageText = error instanceof Error ? error.message : `Failed to read project tree: ${String(error ?? 'Unknown error')}`;
        appendConsole(`[error] ${messageText}`);
        if (options.showInvalidMessage) {
          await showMessage(messageText, 'uvnvpie');
        }
      }
    }

    setWorkspaceTabs((previous) =>
      previous.map((tab) => {
        if (tab.id !== tabId) {
          return tab;
        }

        const project = isValid ? createDefaultProjectForWorkspace(tab.id, tab.name, normalizedRootDir) : null;

        return {
          ...tab,
          projects: project ? [project] : [],
          selectedProjectId: project?.id ?? '',
          projectFileTree: project ? projectFileTree : [],
          expandedProjectNodeIds: project ? [normalizedRootDir] : []
        };
      })
    );

    if (!isValid && options.showInvalidMessage) {
      await showMessage(`No pyproject.toml found in:\n${normalizedRootDir}`, 'Invalid project folder');
    }

    return isValid;
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

  const activeEnvironmentSecurity = useMemo<EnvironmentSecurityState>(() => {
    if (!selectedEnvironment) {
      return DEFAULT_ENVIRONMENT_SECURITY_STATE;
    }

    return securityByEnvironment[selectedEnvironment.id] ?? DEFAULT_ENVIRONMENT_SECURITY_STATE;
  }, [selectedEnvironment, securityByEnvironment]);

  const activeEnvironmentDependency = useMemo<EnvironmentDependencyState>(() => {
    if (!selectedEnvironment) {
      return DEFAULT_ENVIRONMENT_DEPENDENCY_STATE;
    }

    return dependencyByEnvironment[selectedEnvironment.id] ?? DEFAULT_ENVIRONMENT_DEPENDENCY_STATE;
  }, [selectedEnvironment, dependencyByEnvironment]);

  const activeSecurityFindingId = useMemo(() => {
    if (!selectedEnvironment) {
      return '';
    }

    return selectedSecurityFindingIdByEnvironment[selectedEnvironment.id] ?? '';
  }, [selectedEnvironment, selectedSecurityFindingIdByEnvironment]);

  const selectedProject = useMemo(() => {
    if (!activeWorkspace) {
      return null;
    }

    return activeWorkspace.projects.find((project) => project.id === activeWorkspace.selectedProjectId) ?? null;
  }, [activeWorkspace]);

  const autoSwitchOperationMode = useMemo<OperationMode>(() => {
    return getAutoSwitchOperationMode(activeWorkspace);
  }, [activeWorkspace]);

  const activeThemePreset = isSettingsOpen ? settingsDraft.themePreset : settings.themePreset;
  const isProjectMode = settings.operationMode === 'project';
  const themeMode = getThemeMode(activeThemePreset);
  const isManagedProjectContext = selectedProject !== null;
  const activeProjectDir = (selectedProject?.rootDir ?? '').trim();
  const activeInterpreterPath = (selectedEnvironment?.interpreterPath ?? '').trim();
  const activeDirectTarget = useMemo<DirectOperationTarget | null>(() => {
    if (!activeWorkspace || !selectedEnvironment || !activeInterpreterPath) {
      return null;
    }

    return {
      mode: 'direct',
      workspaceId: activeWorkspace.id,
      environmentId: selectedEnvironment.id,
      interpreterPath: activeInterpreterPath
    };
  }, [activeWorkspace, selectedEnvironment, activeInterpreterPath]);

  const activeProjectTarget = useMemo<ProjectOperationTarget | null>(() => {
    if (!activeWorkspace || !selectedProject || !activeProjectDir) {
      return null;
    }

    return {
      mode: 'project',
      workspaceId: activeWorkspace.id,
      projectId: selectedProject.id,
      projectDir: activeProjectDir
    };
  }, [activeWorkspace, selectedProject, activeProjectDir]);

  const activeOperationTarget = useMemo<OperationTarget | null>(() => {
    return isProjectMode ? activeProjectTarget : activeDirectTarget;
  }, [isProjectMode, activeProjectTarget, activeDirectTarget]);

  const normalizedUvBinaryPath = settings.uvBinaryPath.trim();
  const hasModeActionTarget = activeOperationTarget !== null;
  const toolbarModeActionsDisabled = isJobRunning || !hasModeActionTarget;
  const toolbarPackageActionsDisabled = toolbarModeActionsDisabled || !selectedPackage;
  const projectOnlyActionsDisabled = isJobRunning || !activeProjectDir || !isProjectMode;
  const dependencyTreeRefreshDisabled =
    isJobRunning || !selectedEnvironment || activeEnvironmentDependency.isLoading;
  const securityScanDisabled =
    isJobRunning || !selectedEnvironment || packages.length === 0 || activeEnvironmentSecurity.isScanning;
  const isOperationModeDisabled = isJobRunning || isSettingsSaving;

  const tabs = useMemo(
    () => [
      { key: 'packages' as const, label: t('packagesTab') },
      { key: 'dependencyTree' as const, label: t('dependencyTreeTab') },
      { key: 'requirements' as const, label: t('requirementsTab') },
      { key: 'security' as const, label: t('securityTab') }
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
        name: tab.name.trim(),
        isExpanded: tab.isProjectExpanded || tab.isEnvironmentExpanded,
        isProjectExpanded: tab.isProjectExpanded,
        isEnvironmentExpanded: tab.isEnvironmentExpanded,
        showInProjects: tab.showInProjects,
        showInEnvironments: tab.showInEnvironments
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
    allowNativeCloseRef.current = true;

    if (closeRequestedUnlistenRef.current) {
      closeRequestedUnlistenRef.current();
      closeRequestedUnlistenRef.current = null;
    }

    try {
      await appWindow.close();
    } catch (error) {
      allowNativeCloseRef.current = false;
      throw error;
    }
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

  const toggleOperationMode = async () => {
    if (settings.autoSwitchMode || isSettingsSaving || isJobRunning) {
      return;
    }

    const previousMode = settings.operationMode;
    const nextMode = getNextOperationMode(previousMode);

    setSettings((previous) => ({
      ...previous,
      operationMode: nextMode
    }));
    setSettingsDraft((previous) => ({
      ...previous,
      operationMode: nextMode
    }));

    try {
      await persistAppSettings({
        ...settings,
        operationMode: nextMode
      });
      appendConsole(`[mode] switched to ${nextMode}`);
    } catch (error) {
      console.error(error);
      setSettings((previous) => ({
        ...previous,
        operationMode: previousMode
      }));
      setSettingsDraft((previous) => ({
        ...previous,
        operationMode: previousMode
      }));
      await showMessage(t('settingsSaveFailed'), t('dialogErrorTitle'));
    }
  };

  const toggleAutoSwitchMode = async () => {
    if (isSettingsSaving || isJobRunning) {
      return;
    }

    const previousAutoSwitch = settings.autoSwitchMode;
    const previousMode = settings.operationMode;
    const nextAutoSwitch = !previousAutoSwitch;
    const nextMode = nextAutoSwitch ? getAutoSwitchOperationMode(activeWorkspace) : previousMode;

    setSettings((previous) => ({
      ...previous,
      autoSwitchMode: nextAutoSwitch,
      operationMode: nextMode
    }));
    setSettingsDraft((previous) => ({
      ...previous,
      autoSwitchMode: nextAutoSwitch,
      operationMode: nextMode
    }));

    try {
      await persistAppSettings({
        ...settings,
        autoSwitchMode: nextAutoSwitch,
        operationMode: nextMode
      });

      appendConsole(`[mode] auto switch ${nextAutoSwitch ? 'enabled' : 'disabled'}`);

      if (nextAutoSwitch && nextMode !== previousMode) {
        appendConsole(`[mode] auto-switched to ${nextMode}`);
      }
    } catch (error) {
      console.error(error);
      setSettings((previous) => ({
        ...previous,
        autoSwitchMode: previousAutoSwitch,
        operationMode: previousMode
      }));
      setSettingsDraft((previous) => ({
        ...previous,
        autoSwitchMode: previousAutoSwitch,
        operationMode: previousMode
      }));
      await showMessage(t('settingsSaveFailed'), t('dialogErrorTitle'));
    }
  };

  const toggleThemeMode = async () => {
    if (isSettingsSaving) {
      return;
    }

    const previousThemePreset = settings.themePreset;
    const nextThemePreset = toggleThemeModePreset(previousThemePreset);

    setSettings((previous) => ({
      ...previous,
      themePreset: nextThemePreset
    }));
    setSettingsDraft((previous) => ({
      ...previous,
      themePreset: nextThemePreset
    }));

    try {
      await persistAppSettings({
        ...settings,
        themePreset: nextThemePreset
      });
      appendConsole(`[theme] switched to ${nextThemePreset}`);
    } catch (error) {
      console.error(error);
      setSettings((previous) => ({
        ...previous,
        themePreset: previousThemePreset
      }));
      setSettingsDraft((previous) => ({
        ...previous,
        themePreset: previousThemePreset
      }));
      await showMessage(t('settingsSaveFailed'), t('dialogErrorTitle'));
    }
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

  const applyOpenedRootFolders = async (
    rootDirs: string[],
    options: {
      requireValidProjectRoot: boolean;
      targetTree: 'projects' | 'environments';
    }
  ) => {
    if (rootDirs.length === 0) {
      return;
    }

    const existingByRootDir = new Map(workspaceTabs.map((tab) => [tab.envRootDir, tab]));
    const expandedExistingIds = new Set<string>();
    const newTabs: WorkspaceTabState[] = [];
    const invalidProjectRoots: string[] = [];
    const touchedTabs: Array<{ id: string; envRootDir: string }> = [];
    let nextActiveTabId = '';

    for (const envRootDir of rootDirs) {
      if (options.requireValidProjectRoot) {
        let validProjectRoot = false;

        try {
          validProjectRoot = await isValidProjectRoot(envRootDir);
        } catch (error) {
          const messageText = error instanceof Error ? error.message : String(error ?? 'Unknown validation error');
          appendConsole(`[error] ${messageText}`);
        }

        if (!validProjectRoot) {
          invalidProjectRoots.push(envRootDir);
          continue;
        }
      }

      const existingTab = existingByRootDir.get(envRootDir);

      if (existingTab) {
        expandedExistingIds.add(existingTab.id);
        touchedTabs.push({
          id: existingTab.id,
          envRootDir: existingTab.envRootDir
        });
        nextActiveTabId = existingTab.id;
        continue;
      }

      const shouldExpandByDefault = workspaceTabs.length === 0 && newTabs.length === 0;
      const nextTab = createWorkspaceTab(envRootDir, '', shouldExpandByDefault, {
        seedProject: options.requireValidProjectRoot,
        initialProjectExpanded:
          options.targetTree === 'projects' ? shouldExpandByDefault : false,
        initialEnvironmentExpanded:
          options.targetTree === 'environments' ? shouldExpandByDefault : false,
        showInProjects: options.targetTree === 'projects',
        showInEnvironments: options.targetTree === 'environments'
      });

      newTabs.push(nextTab);
      touchedTabs.push({
        id: nextTab.id,
        envRootDir: nextTab.envRootDir
      });
      existingByRootDir.set(envRootDir, nextTab);
      nextActiveTabId = nextTab.id;
    }

    if (options.requireValidProjectRoot && invalidProjectRoots.length > 0) {
      appendConsole(
        `[warn] skipped ${invalidProjectRoots.length} folder(s) without pyproject.toml: ${invalidProjectRoots.join(', ')}`
      );
      await showMessage(
        `Only valid project roots can be opened.\n\nMissing pyproject.toml:\n${invalidProjectRoots.join('\n')}`,
        'Invalid project folder'
      );
    }

    if (expandedExistingIds.size > 0) {
      setWorkspaceTabs((previous) =>
        previous.map((tab) => {
          if (!expandedExistingIds.has(tab.id)) {
            return tab;
          }

          if (options.targetTree === 'projects') {
            return {
              ...tab,
              isProjectExpanded: true,
              showInProjects: true
            };
          }

          return {
            ...tab,
            isEnvironmentExpanded: true,
            showInEnvironments: true
          };
        })
      );
    }

    if (newTabs.length > 0) {
      setWorkspaceTabs((previous) => [...previous, ...newTabs]);
      setMainTabByWorkspace((previous) => ({
        ...previous,
        ...Object.fromEntries(newTabs.map((tab) => [tab.id, 'packages'] as const))
      }));
      setSelectedPackageIdByWorkspace((previous) => ({
        ...previous,
        ...Object.fromEntries(newTabs.map((tab) => [tab.id, ''] as const))
      }));
    }

    for (const tab of touchedTabs) {
      void loadWorkspaceEnvironments(tab.id, tab.envRootDir, {
        refreshPackages: options.targetTree === 'projects' && tab.id === nextActiveTabId
      });
      if (options.targetTree === 'projects') {
        void syncWorkspaceProjectState(tab.id, tab.envRootDir);
      }
    }

    if (nextActiveTabId) {
      setActiveWorkspaceTabId(nextActiveTabId);
    }
  };

  const openProjectRootFolders = async () => {
    try {
      const selection = await open({
        title: t('pickProjectFolderTitle'),
        directory: true,
        multiple: true
      });

      const rootDirs = normalizeFolderSelection(selection);
      await applyOpenedRootFolders(rootDirs, { requireValidProjectRoot: true, targetTree: 'projects' });
    } catch (error) {
      console.error(error);
      await showMessage(t('settingsLoadFailed'), t('dialogErrorTitle'));
    }
  };

  const openEnvironmentRootFolders = async () => {
    try {
      const selection = await open({
        title: t('pickWorkspaceFolderTitle'),
        directory: true,
        multiple: true
      });

      const rootDirs = normalizeFolderSelection(selection);
      await applyOpenedRootFolders(rootDirs, { requireValidProjectRoot: false, targetTree: 'environments' });
    } catch (error) {
      console.error(error);
      await showMessage(t('settingsLoadFailed'), t('dialogErrorTitle'));
    }
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    setActiveWorkspaceTabId(workspaceId);
  };

  const handleToggleProjectWorkspaceExpanded = (workspaceId: string) => {
    setWorkspaceTabs((previous) =>
      previous.map((tab) => {
        if (tab.id !== workspaceId) {
          return tab;
        }

        return {
          ...tab,
          isProjectExpanded: !tab.isProjectExpanded
        };
      })
    );
  };

  const handleToggleProjectDirectory = (workspaceId: string, nodePath: string) => {
    if (!nodePath.trim()) {
      return;
    }

    setActiveWorkspaceTabId(workspaceId);
    setWorkspaceTabs((previous) =>
      previous.map((tab) => {
        if (tab.id !== workspaceId) {
          return tab;
        }

        const expanded = new Set(tab.expandedProjectNodeIds);
        if (expanded.has(nodePath)) {
          expanded.delete(nodePath);
        } else {
          expanded.add(nodePath);
        }

        return {
          ...tab,
          isProjectExpanded: true,
          expandedProjectNodeIds: Array.from(expanded)
        };
      })
    );
  };

  const handleToggleEnvironmentWorkspaceExpanded = (workspaceId: string) => {
    setWorkspaceTabs((previous) =>
      previous.map((tab) => {
        if (tab.id !== workspaceId) {
          return tab;
        }

        return {
          ...tab,
          isEnvironmentExpanded: !tab.isEnvironmentExpanded
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
          isEnvironmentExpanded: true
        };
      })
    );
  };

  const handleSelectProject = (workspaceId: string, projectId: string) => {
    setActiveWorkspaceTabId(workspaceId);
    setWorkspaceTabs((previous) =>
      previous.map((tab) => {
        if (tab.id !== workspaceId) {
          return tab;
        }

        return {
          ...tab,
          selectedProjectId: projectId,
          isProjectExpanded: true
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

  const updateEnvironmentSecurityState = (
    environmentId: string,
    updater: (previous: EnvironmentSecurityState) => EnvironmentSecurityState
  ) => {
    setSecurityByEnvironment((previous) => {
      const previousState = previous[environmentId] ?? DEFAULT_ENVIRONMENT_SECURITY_STATE;
      return {
        ...previous,
        [environmentId]: updater(previousState)
      };
    });
  };

  const updateEnvironmentDependencyState = (
    environmentId: string,
    updater: (previous: EnvironmentDependencyState) => EnvironmentDependencyState
  ) => {
    setDependencyByEnvironment((previous) => {
      const previousState = previous[environmentId] ?? DEFAULT_ENVIRONMENT_DEPENDENCY_STATE;
      return {
        ...previous,
        [environmentId]: updater(previousState)
      };
    });
  };

  const handleRefreshDependencyTree = async (forceRefresh = true) => {
    if (!selectedEnvironment || isJobRunning) {
      return;
    }

    const environment = selectedEnvironment;
    const environmentId = environment.id;
    const existingState = dependencyByEnvironment[environmentId] ?? null;

    if (!forceRefresh && existingState) {
      return;
    }

    if (existingState?.isLoading) {
      return;
    }

    updateEnvironmentDependencyState(environmentId, (previous) => ({
      ...previous,
      isLoading: true,
      error: ''
    }));

    appendConsole(`[deps] building dependency tree for ${environment.name}`);
    await waitForUiFrame();

    try {
      const dependencyPackages = await fetchEnvironmentDependencyGraph(environment.interpreterPath);
      updateEnvironmentDependencyState(environmentId, () => ({
        isLoading: false,
        packages: dependencyPackages,
        error: '',
        loadedAt: new Date().toISOString()
      }));
      appendConsole(
        `[deps] loaded ${dependencyPackages.length} package entr${dependencyPackages.length === 1 ? 'y' : 'ies'} for ${
          environment.name
        }`
      );
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error ?? 'Unknown dependency graph error');
      updateEnvironmentDependencyState(environmentId, (previous) => ({
        ...previous,
        isLoading: false,
        error: messageText
      }));
      appendConsole(`[deps] failed to build dependency tree for ${environment.name}: ${messageText}`);
    }
  };

  const handleSelectSecurityFinding = (findingId: string) => {
    if (!selectedEnvironment) {
      return;
    }

    setSelectedSecurityFindingIdByEnvironment((previous) => ({
      ...previous,
      [selectedEnvironment.id]: findingId
    }));
  };

  const handleScanSecurity = async () => {
    if (!selectedEnvironment || activeEnvironmentSecurity.isScanning || isJobRunning) {
      return;
    }

    const environment = selectedEnvironment;
    const environmentId = environment.id;
    const scanPackages = packages
      .map((pkg) => ({
        ...pkg,
        name: pkg.name.trim(),
        version: pkg.version.trim()
      }))
      .filter((pkg) => pkg.name && pkg.version);

    if (scanPackages.length === 0) {
      updateEnvironmentSecurityState(environmentId, (previous) => ({
        ...previous,
        isScanning: false,
        error: '',
        findings: [],
        scannedAt: new Date().toISOString(),
        packagesScanned: 0
      }));
      setSelectedSecurityFindingIdByEnvironment((previous) => ({
        ...previous,
        [environmentId]: ''
      }));
      appendConsole(`[security] no packages available for ${environment.name}`);
      return;
    }

    updateEnvironmentSecurityState(environmentId, (previous) => ({
      ...previous,
      isScanning: true,
      error: ''
    }));
    appendConsole(`[security] scanning ${scanPackages.length} package(s) for ${environment.name}`);
    await waitForUiFrame();

    try {
      const findings = await scanSecurityFindings(scanPackages);
      const scannedAt = new Date().toISOString();

      updateEnvironmentSecurityState(environmentId, () => ({
        isScanning: false,
        findings,
        error: '',
        scannedAt,
        packagesScanned: scanPackages.length
      }));
      setSelectedSecurityFindingIdByEnvironment((previous) => ({
        ...previous,
        [environmentId]: findings[0]?.id ?? ''
      }));

      appendConsole(
        `[security] found ${findings.length} vulnerabilit${findings.length === 1 ? 'y' : 'ies'} for ${environment.name}`
      );
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error ?? 'Unknown security scan error');
      updateEnvironmentSecurityState(environmentId, (previous) => ({
        ...previous,
        isScanning: false,
        error: messageText,
        packagesScanned: scanPackages.length
      }));
      appendConsole(`[security] scan failed for ${environment.name}: ${messageText}`);
    }
  };

  const appendCommandOutput = (channel: CommandOutputChannel, output: string) => {
    const lines = output
      .split(/\r?\n|\r/g)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    appendConsoleBatch(lines.map((line) => `[${channel}] ${line}`));
  };

  const appendUvCommandResult = (result: UvCommandResult, options: { includeOutput?: boolean } = {}) => {
    const includeOutput = options.includeOutput ?? true;
    appendConsole(`[cmd] ${result.command}`);
    if (includeOutput) {
      appendCommandOutput('stdout', result.stdout);
      appendCommandOutput('stderr', result.stderr);
    }
    appendConsole(
      result.success
        ? `[done] command exited with code ${result.exitCode}`
        : `[error] command exited with code ${result.exitCode}`
    );
  };

  const executeUvCommandStep = async (step: {
    label: string;
    run: (streamId: string) => Promise<UvCommandResult>;
  }): Promise<UvCommandResult> => {
    appendConsole(`[step] ${step.label}`);

    const streamId = beginCommandStream();

    try {
      const result = await step.run(streamId);
      const streamedOutputSeen = finishCommandStream(streamId);
      appendUvCommandResult(result, {
        includeOutput: !streamedOutputSeen
      });
      return result;
    } catch (error) {
      finishCommandStream(streamId);
      throw error;
    }
  };

  const refreshSelectedEnvironmentPackages = async () => {
    let environment = selectedEnvironment;

    if (!environment && activeWorkspace) {
      environment = await loadWorkspaceEnvironments(activeWorkspace.id, activeWorkspace.envRootDir);
    }

    if (!environment) {
      return;
    }

    const nextPackages = await fetchEnvironmentPackages(environment.interpreterPath);
    setPackagesByEnvironment((previous) => ({
      ...previous,
      [environment.id]: nextPackages
    }));
    setDependencyByEnvironment((previous) => {
      if (!(environment.id in previous)) {
        return previous;
      }

      const { [environment.id]: _removedState, ...rest } = previous;
      return rest;
    });
    appendConsole(`[data] loaded ${nextPackages.length} package(s) for ${environment.name}`);
  };

  const runProjectAction = async (
    actionLabel: string,
    steps: Array<{ label: string; run: (streamId: string) => Promise<UvCommandResult> }>,
    options: { refreshPackages?: boolean } = {}
  ) => {
    if (isJobRunning || !activeProjectDir) {
      return;
    }

    setIsJobRunning(true);
    appendConsole(`[job] ${actionLabel}`);
    await waitForUiFrame();

    try {
      for (const step of steps) {
        const result = await executeUvCommandStep(step);

        if (!result.success) {
          throw new Error(result.stderr || `Command failed with exit code ${result.exitCode}.`);
        }
      }

      if (options.refreshPackages) {
        await refreshSelectedEnvironmentPackages();
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error || 'Unknown command error');
      appendConsole(`[error] ${actionLabel} failed: ${messageText}`);
      await showMessage(messageText, 'uvnvpie');
    } finally {
      setIsJobRunning(false);
    }
  };

  const runDirectAction = async (
    actionLabel: string,
    steps: Array<{ label: string; run: (streamId: string) => Promise<UvCommandResult> }>,
    options: { refreshPackages?: boolean } = {}
  ) => {
    if (isJobRunning || !activeInterpreterPath) {
      return;
    }

    setIsJobRunning(true);
    appendConsole(`[job] ${actionLabel}`);
    await waitForUiFrame();

    try {
      for (const step of steps) {
        const result = await executeUvCommandStep(step);

        if (!result.success) {
          throw new Error(result.stderr || `Command failed with exit code ${result.exitCode}.`);
        }
      }

      if (options.refreshPackages) {
        await refreshSelectedEnvironmentPackages();
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error || 'Unknown command error');
      appendConsole(`[error] ${actionLabel} failed: ${messageText}`);
      await showMessage(messageText, 'uvnvpie');
    } finally {
      setIsJobRunning(false);
    }
  };

  const promptRequirement = async (actionLabel: string): Promise<string | null> => {
    const input = window.prompt(`${actionLabel}\n\nRequirement (e.g. requests, httpx>=0.28):`, '');
    if (input === null) {
      return null;
    }

    const requirement = input.trim();
    if (!requirement) {
      await showMessage('Please enter a package requirement.', 'uvnvpie');
      return null;
    }

    return requirement;
  };

  const handleInstallPackage = async () => {
    if (toolbarModeActionsDisabled) {
      return;
    }

    const requirement = await promptRequirement('Install Package');
    if (!requirement) {
      return;
    }

    if (!isProjectMode) {
      await runDirectAction(
        'Install Package',
        [
          {
            label: `uv pip install ${requirement}`,
            run: (streamId: string) =>
              runUvDirectInstall(activeInterpreterPath, requirement, {
                uvBinaryPath: normalizedUvBinaryPath,
                streamId
              })
          }
        ],
        { refreshPackages: true }
      );
      return;
    }

    await runProjectAction(
      'Install Package',
      [
        {
          label: `uv add ${requirement}`,
          run: (streamId: string) =>
            runUvAdd(activeProjectDir, requirement, {
              uvBinaryPath: normalizedUvBinaryPath,
              streamId
            })
        }
      ],
      { refreshPackages: true }
    );
  };

  const handleUpgradePackage = async () => {
    if (toolbarPackageActionsDisabled || !selectedPackage) {
      return;
    }

    if (!isProjectMode) {
      const packageName = selectedPackage.name;
      await runDirectAction(
        `Upgrade Package ${packageName}`,
        [
          {
            label: `uv pip install --upgrade ${packageName}`,
            run: (streamId: string) =>
              runUvDirectUpgrade(activeInterpreterPath, packageName, {
                uvBinaryPath: normalizedUvBinaryPath,
                streamId
              })
          }
        ],
        { refreshPackages: true }
      );
      return;
    }

    const packageName = selectedPackage.name;
    await runProjectAction(
      `Upgrade Package ${packageName}`,
      [
        {
          label: `uv lock --upgrade-package ${packageName}`,
          run: (streamId: string) =>
            runUvUpgrade(activeProjectDir, packageName, {
              uvBinaryPath: normalizedUvBinaryPath,
              streamId
            })
        },
        {
          label: 'uv sync',
          run: (streamId: string) =>
            runUvSync(activeProjectDir, {
              uvBinaryPath: normalizedUvBinaryPath,
              streamId
            })
        }
      ],
      { refreshPackages: true }
    );
  };

  const handleUninstallPackage = async () => {
    if (toolbarPackageActionsDisabled || !selectedPackage) {
      return;
    }

    if (!isProjectMode) {
      const packageName = selectedPackage.name;
      await runDirectAction(
        `Uninstall Package ${packageName}`,
        [
          {
            label: `uv pip uninstall ${packageName}`,
            run: (streamId: string) =>
              runUvDirectUninstall(activeInterpreterPath, packageName, {
                uvBinaryPath: normalizedUvBinaryPath,
                streamId
              })
          }
        ],
        { refreshPackages: true }
      );
      return;
    }

    const packageName = selectedPackage.name;
    await runProjectAction(
      `Uninstall Package ${packageName}`,
      [
        {
          label: `uv remove ${packageName}`,
          run: (streamId: string) =>
            runUvUninstall(activeProjectDir, packageName, {
              uvBinaryPath: normalizedUvBinaryPath,
              streamId
            })
        }
      ],
      { refreshPackages: true }
    );
  };

  const handleUpdateAll = async () => {
    if (toolbarModeActionsDisabled) {
      return;
    }

    if (!isProjectMode) {
      await runDirectAction(
        'Update All',
        [
          {
            label: 'uv pip list --outdated && uv pip install --upgrade <outdated>',
            run: (streamId: string) =>
              runUvDirectUpdateAll(activeInterpreterPath, {
                uvBinaryPath: normalizedUvBinaryPath,
                streamId
              })
          }
        ],
        { refreshPackages: true }
      );
      return;
    }

    await runProjectAction(
      'Update All',
      [
        {
          label: 'uv lock',
          run: (streamId: string) =>
            runUvLock(activeProjectDir, {
              uvBinaryPath: normalizedUvBinaryPath,
              streamId
            })
        },
        {
          label: 'uv sync',
          run: (streamId: string) =>
            runUvSync(activeProjectDir, {
              uvBinaryPath: normalizedUvBinaryPath,
              streamId
            })
        }
      ],
      { refreshPackages: true }
    );
  };

  const handleAdd = async () => {
    if (projectOnlyActionsDisabled) {
      return;
    }

    const requirement = await promptRequirement('Add');
    if (!requirement) {
      return;
    }

    await runProjectAction(
      `Add ${requirement}`,
      [
        {
          label: `uv add ${requirement}`,
          run: (streamId: string) =>
            runUvAdd(activeProjectDir, requirement, {
              uvBinaryPath: normalizedUvBinaryPath,
              streamId
            })
        }
      ],
      { refreshPackages: true }
    );
  };

  const handleLock = async () => {
    if (!isProjectMode) {
      appendConsole('[mode] Lock is only available in Project mode');
      return;
    }

    await runProjectAction('Lock', [
      {
        label: 'uv lock',
        run: (streamId: string) =>
          runUvLock(activeProjectDir, {
            uvBinaryPath: normalizedUvBinaryPath,
            streamId
          })
      }
    ]);
  };

  const handleSync = async () => {
    if (!isProjectMode) {
      appendConsole('[mode] Sync is only available in Project mode');
      return;
    }

    await runProjectAction(
      'Sync',
      [
        {
          label: 'uv sync',
          run: (streamId: string) =>
            runUvSync(activeProjectDir, {
              uvBinaryPath: normalizedUvBinaryPath,
              streamId
            })
        }
      ],
      { refreshPackages: true }
    );
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

        const nextName = nextLabel || getFolderName(tab.envRootDir) || t('folderFallbackName');

        return {
          ...tab,
          name: nextName,
          projects: tab.projects.map((project) => ({
            ...project,
            name: nextName
          }))
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

    const removedWorkspaceTab = workspaceTabs[targetIndex];
    const removedEnvironmentIds = new Set(removedWorkspaceTab.environments.map((environment) => environment.id));
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

    if (removedEnvironmentIds.size > 0) {
      setDependencyByEnvironment((previous) => {
        const next = { ...previous };
        let changed = false;

        for (const environmentId of removedEnvironmentIds) {
          if (!(environmentId in next)) {
            continue;
          }

          delete next[environmentId];
          changed = true;
        }

        return changed ? next : previous;
      });

      setSecurityByEnvironment((previous) => {
        const next = { ...previous };
        let changed = false;

        for (const environmentId of removedEnvironmentIds) {
          if (!(environmentId in next)) {
            continue;
          }

          delete next[environmentId];
          changed = true;
        }

        return changed ? next : previous;
      });

      setSelectedSecurityFindingIdByEnvironment((previous) => {
        const next = { ...previous };
        let changed = false;

        for (const environmentId of removedEnvironmentIds) {
          if (!(environmentId in next)) {
            continue;
          }

          delete next[environmentId];
          changed = true;
        }

        return changed ? next : previous;
      });
    }

    if (editingWorkspaceTabId === workspaceId) {
      setEditingWorkspaceTabId(null);
      setEditingWorkspaceName('');
    }
  };

  useEffect(() => {
    let active = true;
    let unlisten: UnlistenFn | null = null;

    void listen<UvCommandOutputEvent>(UV_COMMAND_OUTPUT_EVENT, (event) => {
      const payload = event.payload;
      if (!payload || (payload.channel !== 'stdout' && payload.channel !== 'stderr')) {
        return;
      }

      const state = commandStreamsRef.current[payload.streamId];
      if (!state) {
        return;
      }

      const parsed = splitOutputChunk(state[payload.channel], payload.chunk ?? '');
      state[payload.channel] = parsed.remainder;

      if (parsed.lines.length > 0 || parsed.remainder.length > 0) {
        state.sawOutput = true;
      }

      appendConsoleBatch(parsed.lines.map((line) => `[${payload.channel}] ${line}`));
    })
      .then((detach) => {
        if (!active) {
          detach();
          return;
        }
        unlisten = detach;
      })
      .catch((error) => {
        console.error('command stream listener registration failed', error);
      });

    return () => {
      active = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    if (isJobRunning) {
      clearTaskGlowHideTimer();
      taskGlowStartedAtRef.current = Date.now();
      setIsTaskGlowActive(true);
      return;
    }

    const startedAt = taskGlowStartedAtRef.current;
    if (startedAt === null) {
      setIsTaskGlowActive(false);
      return;
    }

    const elapsedMs = Date.now() - startedAt;
    const remainingMs = TASK_GLOW_MIN_CYCLE_MS - elapsedMs;

    if (remainingMs <= 0) {
      taskGlowStartedAtRef.current = null;
      setIsTaskGlowActive(false);
      return;
    }

    clearTaskGlowHideTimer();
    taskGlowHideTimerRef.current = window.setTimeout(() => {
      taskGlowHideTimerRef.current = null;
      taskGlowStartedAtRef.current = null;
      setIsTaskGlowActive(false);
    }, remainingMs);
  }, [isJobRunning]);

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
    if (activeMainTab !== 'dependencyTree' || !selectedEnvironment) {
      return;
    }

    if (dependencyByEnvironment[selectedEnvironment.id]) {
      return;
    }

    void handleRefreshDependencyTree(false);
  }, [activeMainTab, selectedEnvironment, dependencyByEnvironment]);

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

    setHasRestoredWorkspaceState(false);
    let alive = true;

    const resetWorkspaceState = () => {
      setWorkspaceTabs([]);
      setActiveWorkspaceTabId('');
      setMainTabByWorkspace({});
      setSelectedPackageIdByWorkspace({});
      setDependencyByEnvironment({});
      setSecurityByEnvironment({});
      setSelectedSecurityFindingIdByEnvironment({});
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
          const initialTab = createWorkspaceTab(settings.envRootDir.trim(), '', true, {
            initialProjectExpanded: false,
            initialEnvironmentExpanded: true,
            showInProjects: false,
            showInEnvironments: true
          });

          setWorkspaceTabs([initialTab]);
          setActiveWorkspaceTabId(initialTab.id);
          setMainTabByWorkspace({ [initialTab.id]: 'packages' });
          setSelectedPackageIdByWorkspace({ [initialTab.id]: '' });
          setDependencyByEnvironment({});
          setSecurityByEnvironment({});
          setSelectedSecurityFindingIdByEnvironment({});
          setPackagesByEnvironment({});
          setEditingWorkspaceTabId(null);
          setEditingWorkspaceName('');

          void loadWorkspaceEnvironments(initialTab.id, initialTab.envRootDir);
          if (initialTab.showInProjects) {
            void syncWorkspaceProjectState(initialTab.id, initialTab.envRootDir);
          }
          setHasRestoredWorkspaceState(true);
          return;
        }

        const restoredTabs = savedTabs.map((tab) =>
          createWorkspaceTab(tab.envRootDir, tab.name, tab.isExpanded, {
            initialProjectExpanded: tab.isProjectExpanded,
            initialEnvironmentExpanded: tab.isEnvironmentExpanded,
            showInProjects: tab.showInProjects,
            showInEnvironments: tab.showInEnvironments
          })
        );

        setWorkspaceTabs(restoredTabs);
        setActiveWorkspaceTabId(restoredTabs[0]?.id ?? '');
        setMainTabByWorkspace(
          Object.fromEntries(restoredTabs.map((tab) => [tab.id, 'packages'] as const)) as Record<string, MainTab>
        );
        setSelectedPackageIdByWorkspace(
          Object.fromEntries(restoredTabs.map((tab) => [tab.id, ''] as const)) as Record<string, string>
        );
        setDependencyByEnvironment({});
        setSecurityByEnvironment({});
        setSelectedSecurityFindingIdByEnvironment({});
        setPackagesByEnvironment({});
        setEditingWorkspaceTabId(null);
        setEditingWorkspaceName('');
        setHasRestoredWorkspaceState(true);

        for (const tab of restoredTabs) {
          void loadWorkspaceEnvironments(tab.id, tab.envRootDir);
          if (tab.showInProjects) {
            void syncWorkspaceProjectState(tab.id, tab.envRootDir);
          }
        }
      } catch (error) {
        console.error(error);
        await showMessage('Failed to load settings.', 'uvnvpie');

        if (alive) {
          resetWorkspaceState();
          setHasRestoredWorkspaceState(true);
        }
      }
    };

    void restoreSavedTabs();

    return () => {
      alive = false;
    };
  }, [isSettingsReady]);

  useEffect(() => {
    if (!settings.autoSwitchMode) {
      return;
    }

    if (settings.operationMode === autoSwitchOperationMode) {
      return;
    }

    const previousMode = settings.operationMode;

    setSettings((previous) => ({
      ...previous,
      operationMode: autoSwitchOperationMode
    }));
    setSettingsDraft((previous) => ({
      ...previous,
      operationMode: autoSwitchOperationMode
    }));

    void persistAppSettings({
      ...settings,
      operationMode: autoSwitchOperationMode
    })
      .then(() => {
        appendConsole(`[mode] auto-switched to ${autoSwitchOperationMode}`);
      })
      .catch(async (error) => {
        console.error(error);
        setSettings((previous) => ({
          ...previous,
          operationMode: previousMode
        }));
        setSettingsDraft((previous) => ({
          ...previous,
          operationMode: previousMode
        }));
        await showMessage(t('settingsSaveFailed'), t('dialogErrorTitle'));
      });
  }, [autoSwitchOperationMode, settings, t]);

  useEffect(() => {
    if (!isSettingsReady || !hasRestoredWorkspaceState) {
      return;
    }

    const timer = window.setTimeout(() => {
      const tabsToPersist = settings.alwaysSaveTabs ? collectWorkspaceTabsForPersistence() : [];
      void persistSavedWorkspaceTabs(tabsToPersist).catch((error) => {
        console.error('failed to persist workspace tabs', error);
      });
    }, settings.autoSaveDebounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    hasRestoredWorkspaceState,
    isSettingsReady,
    settings.alwaysSaveTabs,
    settings.autoSaveDebounceMs,
    workspaceTabs
  ]);

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
        const version = await invoke<string>('get_uv_version', {
          uvBinaryPath: normalizedUvBinaryPath ? normalizedUvBinaryPath : null
        });

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
  }, [normalizedUvBinaryPath]);

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
        if (allowNativeCloseRef.current) {
          return;
        }

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
      clearTaskGlowHideTimer();
    };
  }, []);

  const installLabel = selectedPackage ? `${t('install')} ${selectedPackage.name}` : t('install');
  const upgradeLabel = selectedPackage ? `${t('upgrade')} ${selectedPackage.name}` : t('upgrade');
  const uninstallLabel = selectedPackage ? `${t('uninstall')} ${selectedPackage.name}` : t('uninstall');

  return (
    <div className={`window-shell theme-${activeThemePreset} ${isWindowFocused ? 'is-active' : 'is-inactive'}`}>
      <div className="window-frame">
        <div className="app-window">
          <Titlebar
            title={t('appTitle')}
            isTaskRunning={isTaskGlowActive}
            operationMode={settings.operationMode}
            themeMode={themeMode}
            autoSwitchModeEnabled={settings.autoSwitchMode}
            isOperationModeDisabled={isOperationModeDisabled}
            onToggleOperationMode={() => void toggleOperationMode()}
            onToggleThemeMode={() => void toggleThemeMode()}
            onToggleAutoSwitchMode={() => void toggleAutoSwitchMode()}
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
              onToggleProjectWorkspaceExpanded={handleToggleProjectWorkspaceExpanded}
              onToggleProjectDirectory={handleToggleProjectDirectory}
              onToggleEnvironmentWorkspaceExpanded={handleToggleEnvironmentWorkspaceExpanded}
              onSelectEnvironment={handleSelectEnvironment}
              onCreateEnvironment={() => appendConsole(t('createEnvironmentPending'))}
              onOpenProjectRoot={() => void openProjectRootFolders()}
              onOpenEnvironmentRoot={() => void openEnvironmentRootFolders()}
              t={t}
            />

            <main className={`main-content${isConsoleCollapsed ? ' console-collapsed' : ''}`}>
              <section className="top-panels">
                <HeaderPanel environment={displayedEnvironment} isManagedProject={isManagedProjectContext} t={t} />
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
                        {!isProjectMode ? (
                          <div className="titlebar-direct-warning" aria-hidden="true">
                            <span className="titlebar-direct-warning-text">
                              <span>Features</span>
                              <span>disabled</span>
                            </span>
                            <span className="titlebar-direct-warning-icon">
                              <svg viewBox="0 0 24 24">
                                <path d="M12.9 3.2a1 1 0 0 0-1.8 0L2.2 19.4c-.4.8.2 1.8 1.1 1.8h17.4c.9 0 1.5-1 1.1-1.8L12.9 3.2Zm-.9 5.5h0.1c.4 0 .8.3.8.8v5.3c0 .4-.4.8-.8.8H12c-.4 0-.8-.4-.8-.8V9.5c0-.5.4-.8.8-.8Zm.1 9.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
                              </svg>
                            </span>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={toolbarModeActionsDisabled}
                          onClick={() => void handleInstallPackage()}
                        >
                          Install Package
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={toolbarPackageActionsDisabled}
                          onClick={() => void handleUpgradePackage()}
                        >
                          Upgrade Package
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={toolbarPackageActionsDisabled}
                          onClick={() => void handleUninstallPackage()}
                        >
                          Uninstall Package
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={toolbarModeActionsDisabled}
                          onClick={() => void handleUpdateAll()}
                        >
                          Update All
                        </button>
                        {isProjectMode ? (
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={projectOnlyActionsDisabled}
                            onClick={() => void handleAdd()}
                          >
                            Add
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={projectOnlyActionsDisabled}
                          onClick={() => void handleLock()}
                        >
                          Lock
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={projectOnlyActionsDisabled}
                          onClick={() => void handleSync()}
                        >
                          Sync
                        </button>
                      </div>
                    ) : activeMainTab === 'dependencyTree' ? (
                      <div className="packages-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={dependencyTreeRefreshDisabled}
                          onClick={() => void handleRefreshDependencyTree()}
                        >
                          {activeEnvironmentDependency.isLoading
                            ? t('dependencyTreeRefreshingButton')
                            : t('dependencyTreeRefresh')}
                        </button>
                      </div>
                    ) : activeMainTab === 'security' ? (
                      <div className="packages-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={securityScanDisabled}
                          onClick={() => void handleScanSecurity()}
                        >
                          {activeEnvironmentSecurity.isScanning
                            ? t('securityScanningButton')
                            : activeEnvironmentSecurity.scannedAt
                              ? t('securityRescan')
                              : t('securityScan')}
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
                  ) : activeMainTab === 'dependencyTree' ? (
                    <DependencyTreePanel
                      packages={activeEnvironmentDependency.packages}
                      isLoading={activeEnvironmentDependency.isLoading}
                      error={activeEnvironmentDependency.error}
                      loadedAt={activeEnvironmentDependency.loadedAt}
                      t={t}
                    />
                  ) : activeMainTab === 'requirements' ? (
                    <RequirementsPanel packages={packages} environmentName={displayedEnvironment.name} t={t} />
                  ) : activeMainTab === 'security' ? (
                    <SecurityPanel
                      findings={activeEnvironmentSecurity.findings}
                      selectedFindingId={activeSecurityFindingId}
                      onSelectFinding={handleSelectSecurityFinding}
                      isScanning={activeEnvironmentSecurity.isScanning}
                      scanError={activeEnvironmentSecurity.error}
                      scannedAt={activeEnvironmentSecurity.scannedAt}
                      packagesScanned={activeEnvironmentSecurity.packagesScanned}
                      currentPackageCount={packages.length}
                      t={t}
                    />
                  ) : (
                    <div className="packages-placeholder">
                      <p>{t('placeholder')}</p>
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
