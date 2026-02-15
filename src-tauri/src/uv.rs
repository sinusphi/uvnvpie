use std::process::Command;

pub fn uv_version() -> String {
    match Command::new("uv").arg("--version").output() {
        Ok(output) if output.status.success() => {
            String::from_utf8_lossy(&output.stdout).trim().to_string()
        }
        _ => "uv not found".to_string(),
    }
}
