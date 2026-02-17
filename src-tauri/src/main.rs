#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod settings;
mod uv;

use tauri::{window::Color, Manager};

#[cfg(target_os = "linux")]
use tauri::WebviewWindow;

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

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
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
        .expect("error while running uvnvpy");
}
