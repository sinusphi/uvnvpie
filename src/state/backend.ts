import { invoke } from '@tauri-apps/api/core';
import type {
  DependencyGraphPackage,
  EnvironmentItem,
  PackageItem,
  ProjectFileNode,
  UvCommandResult
} from '../types/domain';

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

function normalizeProjectFileNode(value: unknown): ProjectFileNode {
  const record = (value ?? {}) as RawRecord;
  const childrenRaw = Array.isArray(record.children) ? record.children : [];
  const nodeTypeRaw = asString(record.nodeType);
  const nodeType: ProjectFileNode['nodeType'] =
    nodeTypeRaw === 'directory' || nodeTypeRaw === 'file' || nodeTypeRaw === 'symlink' ? nodeTypeRaw : 'other';

  return {
    id: asString(record.id),
    name: asString(record.name),
    path: asString(record.path),
    nodeType,
    children: childrenRaw.map((child) => normalizeProjectFileNode(child))
  };
}

function normalizeDependencyGraphPackage(value: unknown): DependencyGraphPackage {
  const record = (value ?? {}) as RawRecord;
  const dependenciesRaw = Array.isArray(record.dependencies) ? record.dependencies : [];

  return {
    id: asString(record.id),
    name: asString(record.name),
    version: asString(record.version),
    dependencies: dependenciesRaw
      .map((entry) => asString(entry).trim())
      .filter((entry) => entry.length > 0)
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

export async function fetchEnvironmentDependencyGraph(interpreterPath: string): Promise<DependencyGraphPackage[]> {
  if (!interpreterPath.trim()) {
    return [];
  }

  const response = await invoke<unknown[]>('list_environment_dependency_graph', {
    interpreterPath
  });

  if (!Array.isArray(response)) {
    return [];
  }

  return response
    .map(normalizeDependencyGraphPackage)
    .filter((entry) => entry.id && entry.name)
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));
}

export async function isValidProjectRoot(projectDir: string): Promise<boolean> {
  const normalized = projectDir.trim();
  if (!normalized) {
    return false;
  }

  try {
    const response = await invoke<unknown>('is_valid_project_root', {
      projectDir: normalized
    });
    return asBoolean(response);
  } catch (error) {
    throw new Error(`[is_valid_project_root] ${toErrorMessage(error)}`);
  }
}

export async function fetchProjectFiles(projectDir: string): Promise<ProjectFileNode[]> {
  const normalized = projectDir.trim();
  if (!normalized) {
    return [];
  }

  const response = await invoke<unknown[]>('list_project_files', {
    projectDir: normalized
  });

  if (!Array.isArray(response)) {
    return [];
  }

  return response
    .map((entry) => normalizeProjectFileNode(entry))
    .filter((entry) => entry.id && entry.path && entry.name);
}

export async function writeTextFile(filePath: string, contents: string): Promise<void> {
  const normalized = filePath.trim();
  if (!normalized) {
    throw new Error('File path is empty');
  }

  try {
    await invoke<unknown>('write_text_file', {
      filePath: normalized,
      contents
    });
  } catch (error) {
    throw new Error(`[write_text_file] ${toErrorMessage(error)}`);
  }
}

export async function runUvAdd(
  projectDir: string,
  requirement: string,
  options?: {
    uvBinaryPath?: string;
    dev?: boolean;
    optionalGroup?: string;
    streamId?: string;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_add', {
    projectDir,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    requirement,
    dev: Boolean(options?.dev),
    optionalGroup: normalizeOptionalString(options?.optionalGroup),
    streamId: normalizeOptionalString(options?.streamId)
  });
}

export async function runUvLock(
  projectDir: string,
  options?: {
    uvBinaryPath?: string;
    checkOnly?: boolean;
    streamId?: string;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_lock', {
    projectDir,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    checkOnly: Boolean(options?.checkOnly),
    streamId: normalizeOptionalString(options?.streamId)
  });
}

export async function runUvSync(
  projectDir: string,
  options?: {
    uvBinaryPath?: string;
    frozen?: boolean;
    noDev?: boolean;
    streamId?: string;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_sync', {
    projectDir,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    frozen: Boolean(options?.frozen),
    noDev: Boolean(options?.noDev),
    streamId: normalizeOptionalString(options?.streamId)
  });
}

export async function runUvUpgrade(
  projectDir: string,
  packageName: string,
  options?: {
    uvBinaryPath?: string;
    streamId?: string;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_upgrade', {
    projectDir,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    packageName,
    streamId: normalizeOptionalString(options?.streamId)
  });
}

export async function runUvUninstall(
  projectDir: string,
  packageName: string,
  options?: {
    uvBinaryPath?: string;
    streamId?: string;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_uninstall', {
    projectDir,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    packageName,
    streamId: normalizeOptionalString(options?.streamId)
  });
}

export async function runUvDirectInstall(
  interpreterPath: string,
  requirement: string,
  options?: {
    uvBinaryPath?: string;
    streamId?: string;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_direct_install', {
    interpreterPath,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    requirement,
    streamId: normalizeOptionalString(options?.streamId)
  });
}

export async function runUvDirectUpgrade(
  interpreterPath: string,
  packageName: string,
  options?: {
    uvBinaryPath?: string;
    streamId?: string;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_direct_upgrade', {
    interpreterPath,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    packageName,
    streamId: normalizeOptionalString(options?.streamId)
  });
}

export async function runUvDirectUninstall(
  interpreterPath: string,
  packageName: string,
  options?: {
    uvBinaryPath?: string;
    streamId?: string;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_direct_uninstall', {
    interpreterPath,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    packageName,
    streamId: normalizeOptionalString(options?.streamId)
  });
}

export async function runUvDirectUpdateAll(
  interpreterPath: string,
  options?: {
    uvBinaryPath?: string;
    streamId?: string;
  }
): Promise<UvCommandResult> {
  return invokeUvCommand('uv_direct_update_all', {
    interpreterPath,
    uvBinaryPath: normalizeOptionalString(options?.uvBinaryPath),
    streamId: normalizeOptionalString(options?.streamId)
  });
}
