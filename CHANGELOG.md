# Changelog

## [0.1.2] - 2026-03-02

### Added

- Project/Direct workflows with Auto Switch mode in the title bar.
- Split sidebar model for Environments and Projects, including recursive project explorer trees.
- Dependency Tree tab with live graph metadata from installed interpreter packages.
- Requirements tab with generated preview, copy, and file export support.
- Security tab with OSV scanning, state handling, caching, and vulnerability detail hydration.
- Direct `uv` execution paths for environment package actions (`install`, `upgrade`, `uninstall`, `update all`).
- Theme presets and refreshed header visuals with Python/PyPI branding.

### Changed

- Package-management workflows now execute real `uv` commands with streamed output in the integrated console.
- Backend command surface expanded for dependency graph loading, project validation, and direct-mode command handling.
- Workspace model extended to handle separate project/environment trees with persisted UI state.
- Release docs and screenshots refreshed for the current feature set.

### Fixed

- Restored persisted tabs/sidebar state on app startup in multi-workspace scenarios.
- Improved direct-mode warning placement/formatting and tab close-button visuals.
- Corrected bundled app icon path and applied additional UI polish fixes.

### Notes

- Environment management is mostly operational in `v0.1.2`, but creating new environments is still not implemented.

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
