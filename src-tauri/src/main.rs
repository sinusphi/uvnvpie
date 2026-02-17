#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod settings;
mod uv;

use tauri::{window::Color, Manager};

#[cfg(target_os = "linux")]
use tauri::WebviewWindow;
use tauri::{PhysicalPosition, PhysicalSize};

#[tauri::command]
fn get_uv_version() -> String {
    uv::uv_version()
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
        .invoke_handler(tauri::generate_handler![get_uv_version])
        .run(tauri::generate_context!())
        .expect("error while running uvnvpie");
}
