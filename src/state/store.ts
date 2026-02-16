import { LazyStore } from '@tauri-apps/plugin-store';

export type Language = 'de' | 'en';

export interface AppSettings {
  language: Language;
  envRootDir: string;
  uvBinaryPath: string;
  autoSaveDebounceMs: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'de',
  envRootDir: '',
  uvBinaryPath: '',
  autoSaveDebounceMs: 200
};

const SETTINGS_FILE = 'settings.json';
const settingsStore = new LazyStore(SETTINGS_FILE);
let initialized = false;

const SETTING_KEYS: Array<keyof AppSettings> = [
  'language',
  'envRootDir',
  'uvBinaryPath',
  'autoSaveDebounceMs'
];

function toLanguage(value: unknown): Language {
  return value === 'en' ? 'en' : 'de';
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

function normalizeSettings(raw: Partial<Record<keyof AppSettings, unknown>>): AppSettings {
  return {
    language: toLanguage(raw.language),
    envRootDir: toStringValue(raw.envRootDir),
    uvBinaryPath: toStringValue(raw.uvBinaryPath),
    autoSaveDebounceMs: toDebounce(raw.autoSaveDebounceMs)
  };
}

export async function initSettingsStore(): Promise<void> {
  if (initialized) {
    return;
  }

  const current = await loadAppSettings(false);
  await persistAppSettings(current, false);
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
