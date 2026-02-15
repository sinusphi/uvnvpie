use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub language: String,
    pub use_sidecar: bool,
    pub sidecar_path: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            language: "de".to_string(),
            use_sidecar: true,
            sidecar_path: None,
        }
    }
}
