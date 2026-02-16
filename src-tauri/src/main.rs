#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod settings;
mod uv;

#[tauri::command]
fn get_uv_version() -> String {
    uv::uv_version()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_uv_version])
        .run(tauri::generate_context!())
        .expect("error while running uvnvpy");
}
