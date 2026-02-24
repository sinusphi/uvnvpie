#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod settings;
mod uv;

use tauri::{window::Color, Manager};

#[cfg(target_os = "linux")]
use tauri::WebviewWindow;
use tauri::{PhysicalPosition, PhysicalSize};

#[tauri::command]
fn get_uv_version(uv_binary_path: Option<String>) -> String {
    uv::uv_version(uv_binary_path)
}

#[tauri::command(rename_all = "camelCase")]
fn list_environments(env_root_dir: Option<String>) -> Result<Vec<uv::EnvironmentItem>, String> {
    uv::list_environments(env_root_dir)
}

#[tauri::command(rename_all = "camelCase")]
fn list_environment_packages(interpreter_path: String) -> Result<Vec<uv::PackageItem>, String> {
    uv::list_environment_packages(interpreter_path)
}

#[tauri::command(rename_all = "camelCase")]
fn list_environment_dependency_graph(
    interpreter_path: String,
) -> Result<Vec<uv::DependencyGraphPackage>, String> {
    uv::list_environment_dependency_graph(interpreter_path)
}

#[tauri::command(rename_all = "camelCase")]
fn is_valid_project_root(project_dir: String) -> Result<bool, String> {
    uv::is_valid_project_root(project_dir)
}

#[tauri::command(rename_all = "camelCase")]
fn list_project_files(project_dir: String) -> Result<Vec<uv::ProjectFileNode>, String> {
    uv::list_project_files(project_dir)
}

#[tauri::command(rename_all = "camelCase")]
fn write_text_file(file_path: String, contents: String) -> Result<(), String> {
    use std::fs;
    use std::path::PathBuf;

    let normalized = file_path.trim();
    if normalized.is_empty() {
        return Err("File path is empty".to_string());
    }

    let path = PathBuf::from(normalized);

    if let Some(parent_dir) = path.parent() {
        if !parent_dir.as_os_str().is_empty() {
            fs::create_dir_all(parent_dir).map_err(|error| {
                format!(
                    "Failed to create parent directory '{}': {error}",
                    parent_dir.display()
                )
            })?;
        }
    }

    fs::write(&path, contents)
        .map_err(|error| format!("Failed to write file '{}': {error}", path.display()))
}

async fn run_uv_blocking<F>(task_name: &'static str, task: F) -> Result<uv::UvCommandResult, String>
where
    F: FnOnce() -> Result<uv::UvCommandResult, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|error| format!("Failed to join {task_name} task: {error}"))?
}

#[tauri::command(rename_all = "camelCase")]
async fn uv_add(
    window: tauri::Window,
    project_dir: String,
    uv_binary_path: Option<String>,
    requirement: String,
    dev: bool,
    optional_group: Option<String>,
    stream_id: Option<String>,
) -> Result<uv::UvCommandResult, String> {
    run_uv_blocking("uv_add", move || {
        uv::uv_add(
            &window,
            project_dir,
            uv_binary_path,
            requirement,
            dev,
            optional_group,
            stream_id,
        )
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
async fn uv_lock(
    window: tauri::Window,
    project_dir: String,
    uv_binary_path: Option<String>,
    check_only: bool,
    stream_id: Option<String>,
) -> Result<uv::UvCommandResult, String> {
    run_uv_blocking("uv_lock", move || {
        uv::uv_lock(&window, project_dir, uv_binary_path, check_only, stream_id)
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
async fn uv_sync(
    window: tauri::Window,
    project_dir: String,
    uv_binary_path: Option<String>,
    frozen: bool,
    no_dev: bool,
    stream_id: Option<String>,
) -> Result<uv::UvCommandResult, String> {
    run_uv_blocking("uv_sync", move || {
        uv::uv_sync(
            &window,
            project_dir,
            uv_binary_path,
            frozen,
            no_dev,
            stream_id,
        )
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
async fn uv_upgrade(
    window: tauri::Window,
    project_dir: String,
    uv_binary_path: Option<String>,
    package_name: String,
    stream_id: Option<String>,
) -> Result<uv::UvCommandResult, String> {
    run_uv_blocking("uv_upgrade", move || {
        uv::uv_upgrade(
            &window,
            project_dir,
            uv_binary_path,
            package_name,
            stream_id,
        )
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
async fn uv_uninstall(
    window: tauri::Window,
    project_dir: String,
    uv_binary_path: Option<String>,
    package_name: String,
    stream_id: Option<String>,
) -> Result<uv::UvCommandResult, String> {
    run_uv_blocking("uv_uninstall", move || {
        uv::uv_uninstall(
            &window,
            project_dir,
            uv_binary_path,
            package_name,
            stream_id,
        )
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
async fn uv_direct_install(
    window: tauri::Window,
    interpreter_path: String,
    uv_binary_path: Option<String>,
    requirement: String,
    stream_id: Option<String>,
) -> Result<uv::UvCommandResult, String> {
    run_uv_blocking("uv_direct_install", move || {
        uv::uv_direct_install(
            &window,
            interpreter_path,
            uv_binary_path,
            requirement,
            stream_id,
        )
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
async fn uv_direct_upgrade(
    window: tauri::Window,
    interpreter_path: String,
    uv_binary_path: Option<String>,
    package_name: String,
    stream_id: Option<String>,
) -> Result<uv::UvCommandResult, String> {
    run_uv_blocking("uv_direct_upgrade", move || {
        uv::uv_direct_upgrade(
            &window,
            interpreter_path,
            uv_binary_path,
            package_name,
            stream_id,
        )
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
async fn uv_direct_uninstall(
    window: tauri::Window,
    interpreter_path: String,
    uv_binary_path: Option<String>,
    package_name: String,
    stream_id: Option<String>,
) -> Result<uv::UvCommandResult, String> {
    run_uv_blocking("uv_direct_uninstall", move || {
        uv::uv_direct_uninstall(
            &window,
            interpreter_path,
            uv_binary_path,
            package_name,
            stream_id,
        )
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
async fn uv_direct_update_all(
    window: tauri::Window,
    interpreter_path: String,
    uv_binary_path: Option<String>,
    stream_id: Option<String>,
) -> Result<uv::UvCommandResult, String> {
    run_uv_blocking("uv_direct_update_all", move || {
        uv::uv_direct_update_all(&window, interpreter_path, uv_binary_path, stream_id)
    })
    .await
}

#[cfg(target_os = "linux")]
fn apply_gtk_round_mask(window: &gtk::ApplicationWindow, radius: i32) {
    use gtk::cairo::{RectangleInt, Region};
    use gtk::prelude::WidgetExt;

    let allocation = window.allocation();
    let width = allocation.width();
    let height = allocation.height();

    if width <= 0 || height <= 0 {
        return;
    }

    let radius = radius.max(0).min(width.min(height) / 2);
    let region = Region::create();

    for y in 0..height {
        let mut offset = 0;

        if radius > 0 {
            if y < radius {
                let dy = (radius - 1 - y) as f64;
                let r = radius as f64;
                offset = (r - (r * r - dy * dy).max(0.0).sqrt()).ceil() as i32;
            } else if y >= height - radius {
                let dy = (y - (height - radius)) as f64;
                let r = radius as f64;
                offset = (r - (r * r - dy * dy).max(0.0).sqrt()).ceil() as i32;
            }
        }

        let line_width = width - (offset * 2);
        if line_width > 0 {
            let _ = region.union_rectangle(&RectangleInt::new(offset, y, line_width, 1));
        }
    }

    window.shape_combine_region(Some(&region));
}

#[cfg(target_os = "linux")]
fn apply_linux_window_rounding(window: &WebviewWindow, radius: i32) {
    use gtk::prelude::WidgetExt;

    if let Ok(gtk_window) = window.gtk_window() {
        apply_gtk_round_mask(&gtk_window, radius);
        gtk_window.connect_size_allocate(move |window, _| apply_gtk_round_mask(window, radius));
    }
}

fn apply_launch_margins(window: &WebviewWindow) {
    const H_MARGIN: i32 = 28;
    const V_MARGIN: i32 = 18;
    const MIN_WIDTH: u32 = 1100;
    const MIN_HEIGHT: u32 = 720;

    if let Ok(Some(monitor)) = window.current_monitor() {
        let work_area = monitor.work_area();
        let work_width = work_area.size.width;
        let work_height = work_area.size.height;

        let preferred_width = work_width.saturating_sub((H_MARGIN * 2) as u32);
        let preferred_height = work_height.saturating_sub((V_MARGIN * 2) as u32);

        let target_width = preferred_width.max(MIN_WIDTH).min(work_width);
        let target_height = preferred_height.max(MIN_HEIGHT).min(work_height);

        let available_x = work_width.saturating_sub(target_width) as i32;
        let available_y = work_height.saturating_sub(target_height) as i32;

        let x = work_area.position.x + H_MARGIN.min(available_x.max(0));
        let y = work_area.position.y + V_MARGIN.min(available_y.max(0));

        let _ = window.set_size(PhysicalSize::new(target_width, target_height));
        let _ = window.set_position(PhysicalPosition::new(x, y));
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                apply_launch_margins(&window);
                let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
                #[cfg(target_os = "linux")]
                apply_linux_window_rounding(&window, 20);
            }

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_uv_version,
            list_environments,
            list_environment_packages,
            list_environment_dependency_graph,
            is_valid_project_root,
            list_project_files,
            write_text_file,
            uv_add,
            uv_lock,
            uv_sync,
            uv_upgrade,
            uv_uninstall,
            uv_direct_install,
            uv_direct_upgrade,
            uv_direct_uninstall,
            uv_direct_update_all
        ])
        .run(tauri::generate_context!())
        .expect("error while running uvnvpie");
}
