# uvnvpie

<p align="center">
  <img src="assets/shot_01.png" alt="screenshot 01" />
</p>

EN | [DE](README.md)

[![Rust: 1.77+](https://img.shields.io/badge/Rust-1.77%2B-brown?logo=rust&logoColor=gold)](https://www.rust-lang.org) 
[![Tauri: 2.x](https://img.shields.io/badge/Tauri-2.x-yellow?logo=tauri&logoColor=cyan)](https://v2.tauri.app) 
[![Node.js: 20+](https://img.shields.io/badge/Node.js-20%2B-darkgreen?logo=node.js&logoColor=green)](https://nodejs.org/en) 
[![pnpm: 9.x](https://img.shields.io/badge/pnpm-9.x-blue?logo=pnpm&logoColor=green)](https://pnpm.io) 
[![Vite: 7.3.1](https://img.shields.io/badge/Vite-7.3.1-purple?logo=vite&logoColor=gold)](https://vite.dev) 
[![Tailwind: 3.4.14](https://img.shields.io/badge/Tailwind-3.4.14-orange?logo=tailwindcss&logoColor=cyan)](https://tailwindcss.com) 
[![React: 18.3.1](https://img.shields.io/badge/React-18.3.1-darkcyan?logo=react&logoColor=cyan)](https://react.dev) 
[![donations: paypal](https://img.shields.io/badge/donations-paypal-darkblue?logo=paypal&logoColor=blue)](https://paypal.me/yserestou) 

uvnvpie is a desktop application built with Tauri v2, React, and Rust.  
The app scans local Python environments, reads installed packages per interpreter, and provides a solid UI foundation for future `uv` actions.

## Project Status

| Area | Status |
| --- | --- |
| Version | **v0.1.1** / **2026-02-17** |
| Platforms | Linux, Windows |
| Live Data | Environments, package lists, `uv --version` |
| Package Actions | Available in the UI, currently simulated |

## Features

- Complete main window with sidebar, header, tabs, package table, details, actions, and console area.
- Detection of local Python environments and loading installed packages per environment.
- Settings dialog with persistence via `tauri-plugin-store`.
- Folder/file picker via `tauri-plugin-dialog`.
- In-app language switching between German and English.
- Custom title bar with minimize/maximize/close.

## Requirements

- **Node.js** 20+
- **pnpm** 9+
- **Rust** stable (1.77+)
- **Tauri** system prerequisites according to official docs:  
  https://v2.tauri.app/start/prerequisites/

## Installation

```bash
pnpm install
```

## Development

Start the full desktop app:

```bash
pnpm tauri dev
```

Start frontend only (Vite):

```bash
pnpm dev
```

## Build

```bash
pnpm tauri build
```

## Usage

1. Start the app with `pnpm tauri dev`.
2. Optionally set a custom environment root in settings.
3. Select an environment from the sidebar.
4. Inspect packages, details, and console output in the main area.

## Environment Detection

If an environment root directory is set in settings, only that path is scanned.  
Without an explicit root, the app uses these defaults:

- `~/.virtualenvs`
- `~/.venvs`
- `~/venvs`

An environment is detected when an interpreter exists at one of these paths:

- `<env>/bin/python`
- `<env>/bin/python3`
- `<env>/Scripts/python.exe`
- `<env>/Scripts/python`

## Architecture

- Frontend: React + TypeScript + Vite + Tailwind
- Desktop Runtime: Tauri v2
- Backend Commands (Rust):
  - `get_uv_version`
  - `list_environments`
  - `list_environment_packages`

## Known Limitations

- `Install`, `Upgrade`, `Uninstall`, `Update All`, and `Export Requirements` are currently mock actions.
- `Dependency Tree` and `Requirements` tabs are placeholders.
- The `uvBinaryPath` setting is persisted but currently not used for command execution.
- The `Latest` column currently shows the same value as `Version`.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

See [LICENSE](LICENSE).
