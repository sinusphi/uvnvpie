export interface EnvironmentItem {
  id: string;
  name: string;
  pythonVersion: string;
  interpreterPath: string;
  location: string;
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
