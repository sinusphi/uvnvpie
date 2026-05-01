# uvnvpie

<p align="center">
  <img src="assets/shot_05.png" alt="uvnvpie Screenshot" />
</p>

<p align="center">
  <img src="assets/shot_02.png" alt="uvnvpie Screenshot" />
</p>

<p align="center">
  <img src="assets/shot_01.png" alt="uvnvpie Screenshot" />
</p>

<p align="center">
  <img src="assets/shot_03.png" alt="uvnvpie Screenshot" />
</p>

<p align="center">
  <img src="assets/shot_04.png" alt="uvnvpie Screenshot" />
</p>

[EN](README.md) | DE

[![Rust: 1.77+](https://img.shields.io/badge/Rust-1.77%2B-brown?logo=rust&logoColor=gold)](https://www.rust-lang.org)
[![Tauri: 2.x](https://img.shields.io/badge/Tauri-2.x-yellow?logo=tauri&logoColor=cyan)](https://v2.tauri.app)
[![Node.js: 20+](https://img.shields.io/badge/Node.js-20%2B-darkgreen?logo=node.js&logoColor=green)](https://nodejs.org/en)
[![pnpm: 9.x](https://img.shields.io/badge/pnpm-9.x-blue?logo=pnpm&logoColor=green)](https://pnpm.io)
[![React: 18.3.1](https://img.shields.io/badge/React-18.3.1-darkcyan?logo=react&logoColor=cyan)](https://react.dev)
[![Vite: 7.3.1](https://img.shields.io/badge/Vite-7.3.1-purple?logo=vite&logoColor=gold)](https://vite.dev)
[![Tailwind: 3.4.14](https://img.shields.io/badge/Tailwind-3.4.14-orange?logo=tailwindcss&logoColor=cyan)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://github.com/sinusphi/uvnvpie/blob/main/LICENSE)
[![donations: paypal](https://img.shields.io/badge/donations-paypal-darkblue?logo=paypal&logoColor=blue)](https://paypal.me/yserestou)

Moderner Manager für Python-Virtual-Umgebungen.
Entwickelt mit Rust + Tauri und `uv` als Ausführungs-Backend.


## Projektstatus

| Bereich | Stand |
| --- | --- |
| Version | **v0.1.2** |
| Release-Datum | **2026-03-02** |
| Plattformen | Linux, Windows |
| Runtime | Desktop-App (Tauri v2) |
| Datenquellen | Lokale Python-Metadaten + `uv` + OSV API |
| Management-Umfang | Die meisten Management-Workflows sind funktionsfähig; Umgebungserstellung ist noch offen. |


## Was aktuell funktioniert

- Umgebungserkennung aus konfigurierbaren Root-Ordnern.
- Paketbestand pro ausgewählter Umgebung.
- Dependency-Tree-Tab mit Live-Graph-Metadaten aus Interpreter-Paketen.
- Requirements-Tab mit generierter Vorschau, Kopieren und Datei-Export.
- Security-Tab mit Live-OSV-Vulnerability-Scan und Detailansicht pro Finding.
- Echte `uv`-Befehlsausführung für Paket-Management-Aktionen in der Haupt-Toolbar.
- Streaming-Ausgabe von Befehlen in das integrierte Konsolenpanel.
- Project-Modus, Direct-Modus und Auto-Switch-Modus in der Titelleiste.
- Settings-Persistenz über `tauri-plugin-store`.
- Native Ordner-/Dateidialoge über `tauri-plugin-dialog`.
- Multi-Workspace-Sidebar-Modell für Umgebungen und Projekte.


## Voraussetzungen

- **Node.js** 20+
- **pnpm** 9+
- **Rust** stable (1.77+)
- **Python** installiert (für Umgebungs-Introspektion)
- **uv** im `PATH` oder in den App-Einstellungen konfiguriert
- **Tauri**-Systemvoraussetzungen:
  https://v2.tauri.app/start/prerequisites/


## Installation

```bash
pnpm install
```

## Entwicklung

Komplette Desktop-App starten:

```bash
pnpm tauri dev
```

Nur Frontend (Vite) starten:

```bash
pnpm dev
```

## Build

```bash
pnpm tauri build
```


## Nutzung

1. App mit `pnpm tauri dev` starten.
2. Einen oder mehrere Root-Ordner über die Sidebar-Aktionen öffnen.
3. Eine Umgebung auswählen.
4. Tabs zur Inspektion nutzen:
   - `Packages` (Tabelle + Detailpanel)
   - `Dependency Tree`
   - `Requirements` (Kopieren/Export)
   - `Security` (OSV-Scan)
5. Paketaktionen über die Paket-Toolbar ausführen und die Ausgabe im Konsolenpanel verfolgen.


## Umgebungs-Erkennung

Wenn in den Einstellungen ein Root-Verzeichnis gesetzt ist, wird nur dort gesucht.  
Ohne explizites Root nutzt die App standardmäßig:

- `~/.virtualenvs`
- `~/.venvs`
- `~/venvs`

Eine Umgebung wird erkannt, wenn ein Interpreter unter einem dieser Pfade gefunden wird:

- `<env>/bin/python`
- `<env>/bin/python3`
- `<env>/Scripts/python.exe`
- `<env>/Scripts/python`


## Requirements-Export

Der Requirements-Export im Requirements-Tab nutzt:

1. Nativen Speichern-Dialog (`tauri-plugin-dialog`)
2. Backend-Schreibbefehl (`write_text_file`)

Falls der native Export in einem Runtime-Sonderfall fehlschlägt, wird ein browserartiger Download-Fallback verwendet.


## Backend Command Surface (Rust)

- `get_uv_version`
- `list_environments`
- `list_environment_packages`
- `list_environment_dependency_graph`
- `is_valid_project_root`
- `list_project_files`
- `write_text_file`
- `uv_add`
- `uv_lock`
- `uv_sync`
- `uv_upgrade`
- `uv_uninstall`
- `uv_direct_install`
- `uv_direct_upgrade`
- `uv_direct_uninstall`
- `uv_direct_update_all`


## Architektur

- Frontend: React + TypeScript + Vite + Tailwind
- Desktop Runtime: Tauri v2
- Backend: Rust/Tauri-Commands für lokale Umgebungserkennung, Projektdateien, Datei-Export und `uv`-Ausführung


## Bekannte Grenzen

- Neue Umgebungen können über die App-UI noch nicht erstellt werden (`v0.1.2`).
- Das sekundäre **Actions**-Panel unten rechts startet noch Mock-Jobs.
  Die primäre Paket-Toolbar verwendet den echten `uv`-Ausführungspfad.
- Die Spalte `Latest` zeigt momentan denselben Wert wie `Version`.
- Der Security-Scan hängt von externen OSV-Diensten ab und braucht Netzwerkzugriff.
- Die Umgebungserkennung scannt nur direkte Unterverzeichnisse jedes konfigurierten Root-Pfads.


## Changelog

Siehe [CHANGELOG.md](CHANGELOG.md).


## Lizenz

Dieses Projekt ist unter der **MIT License** lizenziert. Details stehen in [LICENSE](https://github.com/sinusphi/uvnvpie/blob/main/LICENSE).


## Beitragen

Beiträge sind willkommen.

* [Pull requests](https://github.com/sinusphi/uvnvpie/pulls)

* [Bug reports](https://github.com/sinusphi/uvnvpie/issues)

* [Feature requests](https://github.com/sinusphi/uvnvpie/issues)
