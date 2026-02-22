export interface EnvironmentItem {
  id: string;
  name: string;
  pythonVersion: string;
  interpreterPath: string;
  location: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  rootDir: string;
  pyprojectPath: string;
}

export interface ProjectFileNode {
  id: string;
  name: string;
  path: string;
  nodeType: 'directory' | 'file' | 'symlink' | 'other';
  children: ProjectFileNode[];
}

export interface PackageItem {
  id: string;
  name: string;
  version: string;
  latest: string;
  summary: string;
  license: string;
  homePage: string;
}

export interface UvCommandResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
}

export type SecuritySeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export interface SecurityReference {
  type: string;
  url: string;
}

export interface SecurityFinding {
  id: string;
  packageName: string;
  installedVersion: string;
  vulnerabilityId: string;
  aliases: string[];
  severity: SecuritySeverityLevel;
  severityLabel: string;
  summary: string;
  details: string;
  fixedVersions: string[];
  published: string;
  modified: string;
  references: SecurityReference[];
  dependencyType: 'unknown';
  remediation: string;
}

export type SidebarTreeKind = 'environments' | 'projects';

interface SidebarTreeNodeBase {
  id: string;
  label: string;
}

export interface EnvironmentTreeWorkspaceNode extends SidebarTreeNodeBase {
  tree: 'environments';
  nodeType: 'workspace';
  workspaceId: string;
  isExpanded: boolean;
}

export interface EnvironmentTreeItemNode extends SidebarTreeNodeBase {
  tree: 'environments';
  nodeType: 'environment';
  workspaceId: string;
  environmentId: string;
  environment: EnvironmentItem;
}

export type EnvironmentTreeNode = EnvironmentTreeWorkspaceNode | EnvironmentTreeItemNode;

export interface ProjectTreeWorkspaceNode extends SidebarTreeNodeBase {
  tree: 'projects';
  nodeType: 'workspace';
  workspaceId: string;
  isExpanded: boolean;
}

export interface ProjectTreeItemNode extends SidebarTreeNodeBase {
  tree: 'projects';
  nodeType: 'project';
  workspaceId: string;
  projectId: string;
  project: ProjectItem;
}

export type ProjectTreeNode = ProjectTreeWorkspaceNode | ProjectTreeItemNode;

export interface DirectOperationTarget {
  mode: 'direct';
  workspaceId: string;
  environmentId: string;
  interpreterPath: string;
}

export interface ProjectOperationTarget {
  mode: 'project';
  workspaceId: string;
  projectId: string;
  projectDir: string;
}

export type OperationTarget = DirectOperationTarget | ProjectOperationTarget;
