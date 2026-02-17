import { invoke } from '@tauri-apps/api/core';
import type { EnvironmentItem, PackageItem } from '../types/domain';

type RawRecord = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
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
