# AGENT.md - uvnvpie (v0.1.1)

**Projekt:** uvnvpie  
**Version:** 0.1.1  
**Author:** Youssef Serestou  
**Author Email:** dev@youssef.serestou.de  
**Targets:** Linux + Windows  
**Stack:** Tauri v2 + Rust + React/Vite + TypeScript + Tailwind + tauri-plugin-store

---

## Ziel

Desktop-App fuer lokale Python-Umgebungen mit starkem UI-Fokus und stabiler Read-only-Integration:

- Umgebungen erkennen
- Pakete pro Interpreter lesen
- `uv --version` anzeigen
- Aktionen vorbereitet in der UI (derzeit simuliert)

---

## Aktueller Scope (Release 0.1.1)

- Main Window UI ist vollstaendig umgesetzt.
- Environments/Pakete werden aus realen lokalen Daten gelesen.
- Einstellungen (inkl. Sprache und Pfade) werden persistent gespeichert.
- Paketaktionen (`Install`, `Upgrade`, `Uninstall`, `Update All`, `Export`) sind aktuell Mock-Aktionen.
- Dependency-Tree und Requirements-Preview sind Platzhalter.

---

## Release Definition (0.1.1)

1. `pnpm install` und `pnpm tauri dev` starten ohne Crash.
2. Hauptfenster (Titlebar, Sidebar, Header, Tabs, Table, Details, Actions, Console) funktioniert.
3. Environment-Wechsel aktualisiert Header und Paketdaten.
4. Settings koennen geladen/gespeichert werden.
5. `uv --version` wird angezeigt oder robust mit `uv not found` behandelt.
6. Versionen und Doku sind konsistent auf `0.1.1`.

---

## Nicht im Scope von 0.1.1

- Echte mutierende Paketoperationen.
- Sidecar-Ausfuehrung.
- Vollstaendige Dependency-Tree-Ansicht.

---

## Struktur (relevant)

- `src-tauri/src/main.rs` - App-Setup und Tauri Commands
- `src-tauri/src/uv.rs` - Environment- und Package-Erkennung
- `src/state/store.ts` - persistente App-Settings
- `src/state/backend.ts` - Frontend-Backend-Bruecke
- `src/state/i18n.ts` - DE/EN Texte
- `README.md` / `README.en.md` - Dokumentation
- `CHANGELOG.md` - Release-Notizen
