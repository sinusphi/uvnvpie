# uvnvpie

uvnvpie ist eine Desktop-Anwendung auf Basis von Tauri v2, React und Rust.  
Die App scannt lokale Python-Umgebungen, liest installierte Pakete pro Interpreter aus und bietet eine solide UI-Basis für spätere `uv`-Aktionen.

<p align="center">
  <img src="assets/shot_01.png" alt="screenshot 01" />
</p>

## Projektstatus

| Bereich | Stand |
| --- | --- |
| Version | `0.1.1` 2026-02-17 |
| Plattformen | Linux, Windows |
| Live-Daten | Umgebungen, Paketlisten, `uv --version` |
| Paketaktionen | In der UI vorhanden, aktuell simuliert |

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

- `Install`, `Upgrade`, `Uninstall`, `Update All` und `Export Requirements` sind aktuell Mock-Aktionen.
- Tabs für `Dependency Tree` und `Requirements` sind Platzhalter.
- Die Einstellung `uvBinaryPath` wird gespeichert, aber derzeit noch nicht für Command-Ausführung verwendet.
- Die Spalte `Latest` zeigt momentan denselben Wert wie `Version`.

## Changelog

Siehe [CHANGELOG.md](https://github.com/sinusphi/uvnvpie/blob/prep_v0.1.1_release/CHANGELOG.md).

## Lizenz

Siehe [LICENSE](https://github.com/sinusphi/uvnvpie/blob/prep_v0.1.1_release/LICENSE) (aktuell als Platzhalter gepflegt).
