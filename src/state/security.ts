import type { PackageItem, SecurityFinding, SecurityReference, SecuritySeverityLevel } from '../types/domain';

const OSV_QUERY_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const OSV_QUERY_URL = 'https://api.osv.dev/v1/query';
const OSV_VULN_URL_BASE = 'https://api.osv.dev/v1/vulns/';
const OSV_ECOSYSTEM = 'PyPI';
const QUERY_BATCH_SIZE = 100;
const VULN_DETAILS_CONCURRENCY = 8;

interface OsvPackageQuery {
  package: {
    name: string;
    ecosystem: string;
  };
  version: string;
}

interface OsvBatchResponse {
  results?: OsvQueryResponse[];
}

interface OsvQueryResponse {
  vulns?: Array<{
    id?: string;
  }>;
  next_page_token?: string;
}

interface OsvReference {
  type?: string;
  url?: string;
}

interface OsvSeverityEntry {
  type?: string;
  score?: string;
}

interface OsvRangeEvent {
  fixed?: string;
}

interface OsvAffectedRange {
  events?: OsvRangeEvent[];
}

interface OsvAffectedPackage {
  name?: string;
  ecosystem?: string;
}

interface OsvAffectedEntry {
  package?: OsvAffectedPackage;
  ranges?: OsvAffectedRange[];
}

interface OsvVulnerability {
  id?: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  modified?: string;
  published?: string;
  references?: OsvReference[];
  affected?: OsvAffectedEntry[];
  severity?: OsvSeverityEntry[];
  database_specific?: Record<string, unknown>;
}

const packageQueryCache = new Map<string, string[]>();
const vulnerabilityDetailsCache = new Map<string, OsvVulnerability>();

function normalizePackageName(value: string): string {
  return value.trim().toLowerCase().replace(/[._]+/g, '-');
}

function toPackageCacheKey(name: string, version: string): string {
  return `${normalizePackageName(name)}@${version.trim()}`;
}

function uniqueStrings(values: string[]): string[] {
  const unique = new Set<string>();
  const next: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || unique.has(normalized)) {
      continue;
    }

    unique.add(normalized);
    next.push(normalized);
  }

  return next;
}

function readVulnerabilityIds(response: OsvQueryResponse | null | undefined): string[] {
  if (!response || !Array.isArray(response.vulns)) {
    return [];
  }

  return uniqueStrings(
    response.vulns
      .map((entry) => (typeof entry?.id === 'string' ? entry.id : ''))
      .filter((value) => value.length > 0)
  );
}

function normalizeSeverityKeyword(raw: string): SecuritySeverityLevel {
  const normalized = raw.trim().toUpperCase();

  if (normalized.includes('CRITICAL')) {
    return 'critical';
  }

  if (normalized.includes('HIGH')) {
    return 'high';
  }

  if (normalized.includes('MODERATE') || normalized.includes('MEDIUM')) {
    return 'medium';
  }

  if (normalized.includes('LOW') || normalized.includes('MINOR')) {
    return 'low';
  }

  return 'unknown';
}

function severityRank(severity: SecuritySeverityLevel): number {
  if (severity === 'critical') {
    return 4;
  }

  if (severity === 'high') {
    return 3;
  }

  if (severity === 'medium') {
    return 2;
  }

  if (severity === 'low') {
    return 1;
  }

  return 0;
}

function severityLabel(severity: SecuritySeverityLevel): string {
  if (severity === 'critical') {
    return 'Critical';
  }

  if (severity === 'high') {
    return 'High';
  }

  if (severity === 'medium') {
    return 'Medium';
  }

  if (severity === 'low') {
    return 'Low';
  }

  return 'Unknown';
}

function readNumericSeverityScore(entries: OsvSeverityEntry[] | undefined): number | null {
  if (!Array.isArray(entries)) {
    return null;
  }

  for (const entry of entries) {
    const score = typeof entry?.score === 'string' ? entry.score.trim() : '';
    if (!score || !/^\d+(\.\d+)?$/.test(score)) {
      continue;
    }

    const numeric = Number(score);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
}

function severityFromScore(score: number): SecuritySeverityLevel {
  if (score >= 9) {
    return 'critical';
  }

  if (score >= 7) {
    return 'high';
  }

  if (score >= 4) {
    return 'medium';
  }

  if (score > 0) {
    return 'low';
  }

  return 'unknown';
}

function resolveSeverity(vulnerability: OsvVulnerability | null): {
  level: SecuritySeverityLevel;
  label: string;
} {
  const rawDatabaseSeverity =
    vulnerability &&
    vulnerability.database_specific &&
    typeof vulnerability.database_specific.severity === 'string'
      ? vulnerability.database_specific.severity
      : '';

  if (rawDatabaseSeverity) {
    const level = normalizeSeverityKeyword(rawDatabaseSeverity);
    return {
      level,
      label: severityLabel(level)
    };
  }

  const numericScore = readNumericSeverityScore(vulnerability?.severity);
  if (numericScore !== null) {
    const level = severityFromScore(numericScore);
    return {
      level,
      label: `${severityLabel(level)} (${numericScore.toFixed(1)})`
    };
  }

  return {
    level: 'unknown',
    label: severityLabel('unknown')
  };
}

function collectFixedVersions(vulnerability: OsvVulnerability | null, packageName: string): string[] {
  if (!vulnerability || !Array.isArray(vulnerability.affected)) {
    return [];
  }

  const normalizedTargetName = normalizePackageName(packageName);
  const fixedVersions: string[] = [];

  for (const affectedEntry of vulnerability.affected) {
    const affectedPackageName = normalizePackageName(affectedEntry.package?.name ?? '');
    const ecosystem = (affectedEntry.package?.ecosystem ?? '').trim();

    if (!affectedPackageName || affectedPackageName !== normalizedTargetName) {
      continue;
    }

    if (ecosystem && ecosystem !== OSV_ECOSYSTEM) {
      continue;
    }

    const ranges = Array.isArray(affectedEntry.ranges) ? affectedEntry.ranges : [];

    for (const range of ranges) {
      const events = Array.isArray(range.events) ? range.events : [];
      for (const event of events) {
        const fixed = (event.fixed ?? '').trim();
        if (fixed) {
          fixedVersions.push(fixed);
        }
      }
    }
  }

  return uniqueStrings(fixedVersions).sort((left, right) =>
    left.localeCompare(right, 'en', { sensitivity: 'base', numeric: true })
  );
}

function collectReferences(vulnerability: OsvVulnerability | null): SecurityReference[] {
  if (!vulnerability || !Array.isArray(vulnerability.references)) {
    return [];
  }

  const seenUrls = new Set<string>();
  const references: SecurityReference[] = [];

  for (const reference of vulnerability.references) {
    const url = (reference.url ?? '').trim();
    if (!url || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    references.push({
      type: (reference.type ?? 'WEB').trim() || 'WEB',
      url
    });
  }

  return references;
}

function buildRemediation(packageName: string, fixedVersions: string[]): string {
  const firstFixedVersion = fixedVersions[0];
  if (!firstFixedVersion) {
    return '';
  }

  return `Upgrade ${packageName} to >=${firstFixedVersion}`;
}

function compareFindings(left: SecurityFinding, right: SecurityFinding): number {
  const severityDelta = severityRank(right.severity) - severityRank(left.severity);
  if (severityDelta !== 0) {
    return severityDelta;
  }

  const packageDelta = left.packageName.localeCompare(right.packageName, 'en', {
    sensitivity: 'base',
    numeric: true
  });
  if (packageDelta !== 0) {
    return packageDelta;
  }

  return left.vulnerabilityId.localeCompare(right.vulnerabilityId, 'en', {
    sensitivity: 'base',
    numeric: true
  });
}

async function postJson<TResponse>(url: string, payload: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`OSV request failed (${response.status} ${response.statusText})`);
  }

  return (await response.json()) as TResponse;
}

async function getJson<TResponse>(url: string): Promise<TResponse> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OSV request failed (${response.status} ${response.statusText})`);
  }

  return (await response.json()) as TResponse;
}

async function loadPaginatedVulnerabilityIds(query: OsvPackageQuery, initialPageToken: string): Promise<string[]> {
  const collectedIds: string[] = [];
  const visitedTokens = new Set<string>();
  let pageToken = initialPageToken.trim();

  while (pageToken && !visitedTokens.has(pageToken)) {
    visitedTokens.add(pageToken);

    const response = await postJson<OsvQueryResponse>(OSV_QUERY_URL, {
      ...query,
      page_token: pageToken
    });

    collectedIds.push(...readVulnerabilityIds(response));
    pageToken = (response.next_page_token ?? '').trim();
  }

  return uniqueStrings(collectedIds);
}

async function loadQueryBatchVulnerabilityIds(queries: OsvPackageQuery[]): Promise<string[][]> {
  if (queries.length === 0) {
    return [];
  }

  const response = await postJson<OsvBatchResponse>(OSV_QUERY_BATCH_URL, { queries });
  const rawResults = Array.isArray(response.results) ? response.results : [];
  const idsByQuery = queries.map(() => [] as string[]);

  for (let index = 0; index < queries.length; index += 1) {
    const query = queries[index];
    const queryResult = rawResults[index];
    const ids = readVulnerabilityIds(queryResult);
    const nextPageToken = (queryResult?.next_page_token ?? '').trim();

    if (!nextPageToken) {
      idsByQuery[index] = ids;
      continue;
    }

    const paginatedIds = await loadPaginatedVulnerabilityIds(query, nextPageToken);
    idsByQuery[index] = uniqueStrings([...ids, ...paginatedIds]);
  }

  return idsByQuery;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;

  const runners = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = cursor;
      cursor += 1;

      if (currentIndex >= items.length) {
        return;
      }

      await worker(items[currentIndex]);
    }
  });

  await Promise.all(runners);
}

async function loadMissingVulnerabilityDetails(vulnerabilityIds: string[]): Promise<void> {
  const missingIds = vulnerabilityIds.filter((id) => !vulnerabilityDetailsCache.has(id));

  await runWithConcurrency(missingIds, VULN_DETAILS_CONCURRENCY, async (vulnerabilityId) => {
    try {
      const vulnerability = await getJson<OsvVulnerability>(`${OSV_VULN_URL_BASE}${encodeURIComponent(vulnerabilityId)}`);
      vulnerabilityDetailsCache.set(vulnerabilityId, vulnerability);
    } catch {
      // Keep scan resilient; row will still be rendered with ID-only fallback data.
    }
  });
}

function buildFinding(
  packageName: string,
  installedVersion: string,
  vulnerabilityId: string,
  vulnerability: OsvVulnerability | null
): SecurityFinding {
  const aliases = uniqueStrings(Array.isArray(vulnerability?.aliases) ? vulnerability?.aliases : []);
  const fixedVersions = collectFixedVersions(vulnerability, packageName);
  const references = collectReferences(vulnerability);
  const severity = resolveSeverity(vulnerability);

  return {
    id: `${normalizePackageName(packageName)}@${installedVersion}::${vulnerabilityId}`,
    packageName,
    installedVersion,
    vulnerabilityId,
    aliases,
    severity: severity.level,
    severityLabel: severity.label,
    summary: (vulnerability?.summary ?? '').trim(),
    details: (vulnerability?.details ?? '').trim(),
    fixedVersions,
    published: (vulnerability?.published ?? '').trim(),
    modified: (vulnerability?.modified ?? '').trim(),
    references,
    dependencyType: 'unknown',
    remediation: buildRemediation(packageName, fixedVersions)
  };
}

export async function scanSecurityFindings(packages: PackageItem[]): Promise<SecurityFinding[]> {
  const packageEntries = Array.from(
    new Map(
      packages
        .map((item) => ({
          name: item.name.trim(),
          version: item.version.trim()
        }))
        .filter((item) => item.name && item.version)
        .map((item) => [toPackageCacheKey(item.name, item.version), item] as const)
    ).values()
  );

  if (packageEntries.length === 0) {
    return [];
  }

  const packageVulnerabilityIds = new Map<string, string[]>();
  const missingQueries: OsvPackageQuery[] = [];
  const missingQueryKeys: string[] = [];

  for (const entry of packageEntries) {
    const key = toPackageCacheKey(entry.name, entry.version);
    const cachedIds = packageQueryCache.get(key);

    if (cachedIds) {
      packageVulnerabilityIds.set(key, cachedIds);
      continue;
    }

    missingQueries.push({
      package: {
        name: entry.name,
        ecosystem: OSV_ECOSYSTEM
      },
      version: entry.version
    });
    missingQueryKeys.push(key);
  }

  for (let start = 0; start < missingQueries.length; start += QUERY_BATCH_SIZE) {
    const queryChunk = missingQueries.slice(start, start + QUERY_BATCH_SIZE);
    const keyChunk = missingQueryKeys.slice(start, start + QUERY_BATCH_SIZE);
    const vulnerabilityIdChunk = await loadQueryBatchVulnerabilityIds(queryChunk);

    vulnerabilityIdChunk.forEach((ids, index) => {
      const key = keyChunk[index];
      packageQueryCache.set(key, ids);
      packageVulnerabilityIds.set(key, ids);
    });
  }

  for (const entry of packageEntries) {
    const key = toPackageCacheKey(entry.name, entry.version);
    if (!packageVulnerabilityIds.has(key)) {
      packageVulnerabilityIds.set(key, []);
    }
  }

  const allVulnerabilityIds = uniqueStrings(
    Array.from(packageVulnerabilityIds.values()).flatMap((ids) => ids)
  );
  await loadMissingVulnerabilityDetails(allVulnerabilityIds);

  const findings: SecurityFinding[] = [];

  for (const entry of packageEntries) {
    const key = toPackageCacheKey(entry.name, entry.version);
    const vulnerabilityIds = packageVulnerabilityIds.get(key) ?? [];

    for (const vulnerabilityId of vulnerabilityIds) {
      findings.push(
        buildFinding(
          entry.name,
          entry.version,
          vulnerabilityId,
          vulnerabilityDetailsCache.get(vulnerabilityId) ?? null
        )
      );
    }
  }

  return findings.sort(compareFindings);
}
