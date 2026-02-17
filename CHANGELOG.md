# Changelog

## [0.1.1] - 2026-02-17

### Added

- Full main window UI (sidebar, header, interpreter card, tabs, package table, details, actions, console output).
- Custom title bar with minimize/maximize/close and drag region.
- Settings dialog with persistence via `tauri-plugin-store`.
- Path selection via `tauri-plugin-dialog` (environment folder and optional `uv` path).
- Easy in-app language switching (`de`/`en`) without an additional i18n library.
- About dialog.

### Changed

- Data source changed from mock to real read-only data:
  - Environments are read locally.
  - Installed packages are loaded per environment via the interpreter.
- Project/app name standardized to `uvnvpie`.
- Window appearance revised (rounded frame, accent lights, focus/idle transitions).
- Release metadata aligned to `0.1.1` across app manifests and docs.
- README now available in German and English (`README.md`, `README.en.md`).

### Fixed

- Tauri v2 capability setup corrected (`default` capability present, appropriate permissions).
- Maximized state: no longer an invisible outer border.
- Console output: 
  - auto-scroll on new output
  - collapsible behavior stabilized.
  - visible area limited to a maximum of 5 lines, then scrolling.
- Long package lists no longer push lower panels out of view.

### Notes

- Package actions (Install/Upgrade/Uninstall/Update All/Export) are still mock-based in `v0.1.1`.
