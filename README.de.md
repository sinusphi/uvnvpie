# uvnvpie

<p align="center">
  <img src="assets/shot_01.png" alt="screenshot 01" />
</p>

<p align="center">
  <img src="assets/shot_02.png" alt="uvnvpie screenshot" />
</p>

<p align="center">
  <img src="assets/shot_01.png" alt="uvnvpie screenshot" />
</p>

<p align="center">
  <img src="assets/shot_03.png" alt="uvnvpie screenshot" />
</p>

<p align="center">
  <img src="assets/shot_04.png" alt="uvnvpie screenshot" />
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

Moderner Manager für Python-Virtual-Umgebungen. Entwickelt mit Rust + Tauri, nutzt uv für ultraschnelle Abhängigkeitsverwaltung. Entworfen für Entwickler, die maximale Performance und volle Kontrolle fordern.


## Projektstatus

| Bereich | Stand |
| --- | --- |
| Version | **v0.1.2** / **2026-03-02** |
| Plattformen | Linux, Windows |
| Live-Daten | Umgebungen, Paketlisten, `uv`-Ausfuhrung, OSV-Scan |
| Management-Status | Grösstenteils live, aber Umgebungserstellung noch nicht implementiert |


## Funktionsumfang

- Vollständiges Hauptfenster mit Sidebar, Header, Tabs, Paketliste, Details, Aktionen und Konsolenbereich.
- Erkennung lokaler Python-Umgebungen und Laden installierter Pakete pro Umgebung.
- Settings-Dialog mit Persistenz über `tauri-plugin-store`.
- Ordner-/Dateiauswahl über `tauri-plugin-dialog`.
- Sprachwechsel zwischen Deutsch und Englisch direkt in der App.
- Benutzerdefinierte Titlebar mit Minimize/Maximize/Close.


## Voraussetzungen

- **Node.js** 20+
- **pnpm** 9+
- **Rust** stable (1.77+)
- **Tauri**-Systemvoraussetzungen gemäß offizieller Doku:  
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
2. In den Einstellungen bei Bedarf ein eigenes Umgebungs-Root setzen.
3. Umgebung in der Sidebar wählen.
4. Pakete, Details und Konsolenausgabe im Hauptbereich prüfen.


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


## Architektur

- Frontend: React + TypeScript + Vite + Tailwind
- Desktop Runtime: Tauri v2
- Backend Commands (Rust):
  - `get_uv_version`
  - `list_environments`
  - `list_environment_packages`


## Bekannte Grenzen

- Der meiste Management-Workflow ist live (`Install`, `Upgrade`, `Uninstall`, `Update All`, Requirements-Export).
- `+ Umgebung erstellen` ist in `v0.1.2` noch nicht implementiert.
- Das sekundare **Actions**-Panel unten rechts startet noch Mock-Jobs.
  Die primare Paket-Toolbar verwendet den echten `uv`-Ausfuhrungspfad.
- Die Spalte `Latest` zeigt momentan denselben Wert wie `Version`.
- Der Security-Scan hangt von externen OSV-Diensten ab und braucht Netzwerkzugriff.
- Die Umgebungs-Suche pruft aktuell nur Verzeichnisse der ersten Ebene pro Root-Pfad.


## Changelog

Siehe [CHANGELOG.md](CHANGELOG.md).


## Lizenz

This project is unter der **MIT License** lizensiert - für Details siehe [LICENSE](https://github.com/sinusphi/uvnvpie/blob/main/LICENSE).


## Beitragen

Beiträge sind willkommen. 

* [Pull requests](https://github.com/sinusphi/uvnvpie/pulls)

* [Bug reports](https://github.com/sinusphi/uvnvpie/issues)

* [Feature requests](https://github.com/sinusphi/uvnvpie/issues)
