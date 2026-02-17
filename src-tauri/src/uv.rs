use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentItem {
    pub id: String,
    pub name: String,
    pub python_version: String,
    pub interpreter_path: String,
    pub location: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageItem {
    pub id: String,
    pub name: String,
    pub version: String,
    pub latest: String,
    pub summary: String,
    pub license: String,
    pub home_page: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawPackageItem {
    name: String,
    version: String,
    #[serde(default)]
    summary: String,
    #[serde(default)]
    license: String,
    #[serde(default)]
    home_page: String,
}

const PACKAGE_QUERY_SCRIPT: &str = r#"
import json
import importlib.metadata as md

def pick_homepage(metadata):
    homepage = (metadata.get("Home-page") or "").strip()
    if homepage:
        return homepage
    for value in metadata.get_all("Project-URL") or []:
        if not isinstance(value, str):
            continue
        parts = value.split(",", 1)
        if len(parts) == 2 and parts[1].strip():
            return parts[1].strip()
        if value.strip():
            return value.strip()
    return ""

packages = []
for distribution in md.distributions():
    metadata = distribution.metadata
    name = (metadata.get("Name") or "").strip() or (getattr(distribution, "name", "") or "").strip()
    if not name:
        continue
    version = (distribution.version or "").strip()
    packages.append(
        {
            "name": name,
            "version": version,
            "summary": (metadata.get("Summary") or "").strip(),
            "license": (metadata.get("License") or "").strip(),
            "homePage": pick_homepage(metadata),
        }
    )

packages.sort(key=lambda item: item["name"].lower())
print(json.dumps(packages))
"#;

pub fn uv_version() -> String {
    match Command::new("uv").arg("--version").output() {
        Ok(output) if output.status.success() => {
            String::from_utf8_lossy(&output.stdout).trim().to_string()
        }
        _ => "uv not found".to_string(),
    }
}

pub fn list_environments(env_root_dir: Option<String>) -> Result<Vec<EnvironmentItem>, String> {
    let roots = environment_roots(env_root_dir);
    let mut environments = Vec::new();

    for root in roots {
        if !root.is_dir() {
            continue;
        }

        let entries = match fs::read_dir(&root) {
            Ok(entries) => entries,
            Err(error) => {
                return Err(format!(
                    "Failed to read environment root '{}': {error}",
                    root.display()
                ));
            }
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let Some(interpreter_path) = detect_interpreter_path(&path) else {
                continue;
            };

            let name = path
                .file_name()
                .and_then(|value| value.to_str())
                .map(str::to_string)
                .unwrap_or_else(|| path.to_string_lossy().to_string());

            let location = path.to_string_lossy().to_string();
            let interpreter = interpreter_path.to_string_lossy().to_string();

            environments.push(EnvironmentItem {
                id: location.clone(),
                name,
                python_version: read_python_version(&interpreter_path),
                interpreter_path: interpreter,
                location,
            });
        }
    }

    environments.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    Ok(environments)
}

pub fn list_environment_packages(interpreter_path: String) -> Result<Vec<PackageItem>, String> {
    let interpreter_path = interpreter_path.trim();
    if interpreter_path.is_empty() {
        return Ok(Vec::new());
    }

    let output = Command::new(interpreter_path)
        .args(["-c", PACKAGE_QUERY_SCRIPT])
        .output()
        .map_err(|error| format!("Failed to run interpreter '{interpreter_path}': {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "Failed to read installed packages from '{interpreter_path}': {}",
            stderr.trim()
        ));
    }

    let raw_json = String::from_utf8_lossy(&output.stdout);
    if raw_json.trim().is_empty() {
        return Ok(Vec::new());
    }

    let raw_packages: Vec<RawPackageItem> = serde_json::from_str(&raw_json)
        .map_err(|error| format!("Failed to parse package metadata JSON: {error}"))?;

    let packages = raw_packages
        .into_iter()
        .map(|item| {
            let name = item.name.trim().to_string();
            let version = item.version.trim().to_string();
            let summary = item.summary.trim().to_string();
            let license = item.license.trim().to_string();
            let home_page = item.home_page.trim().to_string();

            PackageItem {
                id: name.to_lowercase(),
                name,
                latest: version.clone(),
                version,
                summary,
                license,
                home_page,
            }
        })
        .collect();

    Ok(packages)
}

fn environment_roots(explicit_root: Option<String>) -> Vec<PathBuf> {
    let explicit_root = explicit_root
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    if let Some(root) = explicit_root {
        return vec![PathBuf::from(root)];
    }

    let mut roots = Vec::new();

    if let Some(home) = env::var_os("HOME") {
        let home = PathBuf::from(home);
        roots.push(home.join(".virtualenvs"));
        roots.push(home.join(".venvs"));
        roots.push(home.join("venvs"));
    }

    roots
}

fn detect_interpreter_path(environment_dir: &Path) -> Option<PathBuf> {
    let unix_candidates = [
        environment_dir.join("bin").join("python"),
        environment_dir.join("bin").join("python3"),
    ];

    let windows_candidates = [
        environment_dir.join("Scripts").join("python.exe"),
        environment_dir.join("Scripts").join("python"),
    ];

    unix_candidates
        .into_iter()
        .chain(windows_candidates)
        .find(|candidate| candidate.is_file())
}

fn read_python_version(interpreter_path: &Path) -> String {
    match Command::new(interpreter_path).arg("--version").output() {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !stdout.is_empty() {
                return stdout;
            }

            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            if !stderr.is_empty() {
                return stderr;
            }

            "Python".to_string()
        }
        _ => "Python".to_string(),
    }
}
