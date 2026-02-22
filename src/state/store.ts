import { LazyStore } from '@tauri-apps/plugin-store';

export type Language = 'de' | 'en';
export type OperationMode = 'project' | 'direct';
export type ThemeMode = 'dark' | 'light';
export type ThemePreset = 'dark-red' | 'dark-green' | 'dark-blue' | 'light-blue' | 'light-red';

const THEME_MODE_BY_PRESET: Record<ThemePreset, ThemeMode> = {
  'dark-red': 'dark',
  'dark-green': 'dark',
  'dark-blue': 'dark',
  'light-blue': 'light',
  'light-red': 'light'
};

const THEME_MODE_SWITCH_TARGETS: Record<ThemePreset, ThemePreset> = {
  'dark-red': 'light-red',
  'dark-green': 'light-blue',
  'dark-blue': 'light-blue',
  'light-blue': 'dark-blue',
  'light-red': 'dark-red'
};

export function getThemeMode(themePreset: ThemePreset): ThemeMode {
  return THEME_MODE_BY_PRESET[themePreset];
}

export function toggleThemeModePreset(themePreset: ThemePreset): ThemePreset {
  return THEME_MODE_SWITCH_TARGETS[themePreset];
}

export interface SavedWorkspaceTab {
  envRootDir: string;
  name: string;
  isExpanded: boolean;
  isProjectExpanded: boolean;
  isEnvironmentExpanded: boolean;
  showInProjects: boolean;
  showInEnvironments: boolean;
}

export interface AppSettings {
  language: Language;
  operationMode: OperationMode;
  autoSwitchMode: boolean;
  themePreset: ThemePreset;
  envRootDir: string;
  uvBinaryPath: string;
  autoSaveDebounceMs: number;
  alwaysSaveTabs: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'de',
  operationMode: 'project',
  autoSwitchMode: false,
  themePreset: 'dark-red',
  envRootDir: '',
  uvBinaryPath: '',
  autoSaveDebounceMs: 200,
  alwaysSaveTabs: true
};

const SETTINGS_FILE = 'settings.json';
const settingsStore = new LazyStore(SETTINGS_FILE);
let initialized = false;
const SAVED_WORKSPACE_TABS_KEY = 'savedWorkspaceTabs';

const SETTING_KEYS: Array<keyof AppSettings> = [
  'language',
  'operationMode',
  'autoSwitchMode',
  'themePreset',
  'envRootDir',
  'uvBinaryPath',
  'autoSaveDebounceMs',
  'alwaysSaveTabs'
];

function toLanguage(value: unknown): Language {
  return value === 'en' ? 'en' : 'de';
}

function toOperationMode(value: unknown): OperationMode {
  return value === 'direct' ? 'direct' : 'project';
}

function toThemePreset(value: unknown): ThemePreset {
  if (
    value === 'dark-red' ||
    value === 'dark-green' ||
    value === 'dark-blue' ||
    value === 'light-blue' ||
    value === 'light-red'
  ) {
    return value;
  }

  return DEFAULT_SETTINGS.themePreset;
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toDebounce(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_SETTINGS.autoSaveDebounceMs;
  }

  return Math.max(0, Math.floor(value));
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeSavedWorkspaceTabs(value: unknown): SavedWorkspaceTab[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  const tabs: SavedWorkspaceTab[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const envRootDir = toStringValue(record.envRootDir).trim();

    if (!envRootDir || unique.has(envRootDir)) {
      continue;
    }

    unique.add(envRootDir);
    tabs.push({
      envRootDir,
      name: toStringValue(record.name),
      isExpanded: toBoolean(record.isExpanded, tabs.length === 0),
      isProjectExpanded: toBoolean(
        record.isProjectExpanded,
        toBoolean(record.isExpanded, tabs.length === 0)
      ),
      isEnvironmentExpanded: toBoolean(
        record.isEnvironmentExpanded,
        toBoolean(record.isExpanded, tabs.length === 0)
      ),
      showInProjects: toBoolean(record.showInProjects, false),
      showInEnvironments: toBoolean(record.showInEnvironments, true)
    });
  }

  return tabs;
}

function normalizeSettings(raw: Partial<Record<keyof AppSettings, unknown>>): AppSettings {
  return {
    language: toLanguage(raw.language),
    operationMode: toOperationMode(raw.operationMode),
    autoSwitchMode: toBoolean(raw.autoSwitchMode, DEFAULT_SETTINGS.autoSwitchMode),
    themePreset: toThemePreset(raw.themePreset),
    envRootDir: toStringValue(raw.envRootDir),
    uvBinaryPath: toStringValue(raw.uvBinaryPath),
    autoSaveDebounceMs: toDebounce(raw.autoSaveDebounceMs),
    alwaysSaveTabs: toBoolean(raw.alwaysSaveTabs, DEFAULT_SETTINGS.alwaysSaveTabs)
  };
}

export async function initSettingsStore(): Promise<void> {
  if (initialized) {
    return;
  }

  const current = await loadAppSettings(false);
  await persistAppSettings(current, false);
  const savedTabs = await loadSavedWorkspaceTabs(false);
  await persistSavedWorkspaceTabs(savedTabs, false);
  initialized = true;
}

export async function loadAppSettings(callInit = true): Promise<AppSettings> {
  if (callInit && !initialized) {
    await initSettingsStore();
  }

  const raw: Partial<Record<keyof AppSettings, unknown>> = {};

  for (const key of SETTING_KEYS) {
    raw[key] = await settingsStore.get(key);
  }

  return normalizeSettings({
    ...DEFAULT_SETTINGS,
    ...raw
  });
}

export async function persistAppSettings(settings: AppSettings, callInit = true): Promise<void> {
  if (callInit && !initialized) {
    await initSettingsStore();
  }

  const normalized = normalizeSettings(settings);

  for (const key of SETTING_KEYS) {
    await settingsStore.set(key, normalized[key]);
  }

  await settingsStore.save();
}

export async function loadSavedWorkspaceTabs(callInit = true): Promise<SavedWorkspaceTab[]> {
  if (callInit && !initialized) {
    await initSettingsStore();
  }

  const raw = await settingsStore.get<unknown>(SAVED_WORKSPACE_TABS_KEY);
  return normalizeSavedWorkspaceTabs(raw);
}

export async function persistSavedWorkspaceTabs(tabs: SavedWorkspaceTab[], callInit = true): Promise<void> {
  if (callInit && !initialized) {
    await initSettingsStore();
  }

  const normalized = normalizeSavedWorkspaceTabs(tabs);
  await settingsStore.set(SAVED_WORKSPACE_TABS_KEY, normalized);
  await settingsStore.save();
}
