import { invoke } from '@tauri-apps/api/core';
import type { EnvironmentItem, PackageItem, UvCommandResult } from '../types/domain';

type RawRecord = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : -1;
}

function normalizeUvCommandResult(value: unknown): UvCommandResult {
  const record = (value ?? {}) as RawRecord;

  return {
    success: asBoolean(record.success),
    exitCode: asNumber(record.exitCode),
    stdout: asString(record.stdout),
    stderr: asString(record.stderr),
    command: asString(record.command)
  };
}

function normalizeOptionalString(value: string | undefined): string | null {
  const normalized = (value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function toErrorMessage(error: unknown): string {
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const message = ((error as { message: unknown }).message as string).trim();
    if (message) {
      return message;
    }
  }

  return 'Unknown backend error';
}

async function invokeUvCommand(commandName: string, payload: RawRecord): Promise<UvCommandResult> {
  try {
    const response = await invoke<unknown>(commandName, payload);
    return normalizeUvCommandResult(response);
  } catch (error) {
    throw new Error(`[${commandName}] ${toErrorMessage(error)}`);
  }
}

function normalizeEnvironment(value: unknown): EnvironmentItem {
  const record = (value ?? {}) as RawRecord;

  return {
    id: asString(record.id),
    name: asString(record.name),
    pythonVersion: asString(record.pythonVersion),
    interpreterPath: asString(record.interpreterPath),
    location: asString(record.location)
  };
}

function normalizePackage(value: unknown): PackageItem {
  const record = (value ?? {}) as RawRecord;

  return {
    id: asString(record.id),
    name: asString(record.name),
    version: asString(record.version),
    latest: asString(record.latest),
    summary: asString(record.summary),
    license: asString(record.license),
    homePage: asString(record.homePage)
  };
}

export async function fetchEnvironments(envRootDir: string): Promise<EnvironmentItem[]> {
  const response = await invoke<unknown[]>('list_environments', {
    envRootDir: envRootDir.trim() ? envRootDir : null
  });

  if (!Array.isArray(response)) {
    return [];
  }

  return response
    .map(normalizeEnvironment)
    .filter((environment) => environment.id && environment.name && environment.interpreterPath);
}

export async function fetchEnvironmentPackages(interpreterPath: string): Promise<PackageItem[]> {
  if (!interpreterPath.trim()) {
    return [];
  }

  const response = await invoke<unknown[]>('list_environment_packages', {
    interpreterPath
  });

  if (!Array.isArray(response)) {
    return [];
  }

  return response
    .map(normalizePackage)
    .filter((pkg) => pkg.id && pkg.name)
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));
}

export async function runUvAdd(
  projectDir: string,
  requirement: string,
  options?: {
    uvBinaryPath?: string;
    dev?: boolean;
    optionalGroup?: string;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_add', {
    projectDir,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    requirement,
    dev: Boolean(options?.dev),
    optionalGroup: normalizeOptionalString(options?.optionalGroup)
  });
}

export async function runUvLock(
  projectDir: string,
  options?: {
    uvBinaryPath?: string;
    checkOnly?: boolean;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_lock', {
    projectDir,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    checkOnly: Boolean(options?.checkOnly)
  });
}

export async function runUvSync(
  projectDir: string,
  options?: {
    uvBinaryPath?: string;
    frozen?: boolean;
    noDev?: boolean;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_sync', {
    projectDir,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    frozen: Boolean(options?.frozen),
    noDev: Boolean(options?.noDev)
  });
}

export async function runUvUpgrade(
  projectDir: string,
  packageName: string,
  options?: {
    uvBinaryPath?: string;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_upgrade', {
    projectDir,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    packageName
  });
}

export async function runUvUninstall(
  projectDir: string,
  packageName: string,
  options?: {
    uvBinaryPath?: string;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_uninstall', {
    projectDir,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    packageName
  });
}
