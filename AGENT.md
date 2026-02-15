# AGENT.md — uvnvpy (v0.1.0)

**Projekt:** uvnvpy  
**Version:** 0.1.0  
**Author:** Youssef Serestou
**Author Email:** dev@youssef.serstou.de
**Targets:** Linux + Windows
**Stack (fix):** Tauri v2 + Rust (tokio) + React/Vite + TypeScript + Tailwind + tauri-plugin-store  
**Ziel:** Main Window UI (pixel-treu zur Mockup-Spezifikation) + solide Backend-Foundation für uv-CLI (später echte Integration)

---

## 0) Non-Negotiables (nicht diskutieren, einfach einhalten)
- **Stack nicht ändern.** Kein Framework-Wechsel, kein Redux, kein Electron.
- **UI zuerst, dann Logik.** v0.1.0 ist primär: *Layout + UX + Mock-Daten + Job-Simulation*.
- **App muss starten, auch ohne uv.** Nie crashen, nie hard-failen.
- **Windows + Linux:** keine OS-spezifischen Hacks im UI, nur dort wo nötig (z. B. sidecar path).
- **Keine Feature-Creep:** kein echtes Paketmanagement in v0.1.0 außer `uv --version` Anzeige.

---

## 1) Definition of Done (DoD) ✅
Erledigt ist v0.1.0 erst, wenn:
1. `pnpm install` und `pnpm tauri dev` startet die App.
2. Main Window Layout entspricht der Spezifikation:
   - Custom Titlebar, Sidebar, Header, Tabs, Table, Details, Actions, Console.
3. Env-Switching funktioniert und ändert Header + Package-Mock-Daten sichtbar.
4. Simulierte Jobs streamen Logs in die Console, **Abort** bricht sofort ab.
5. Settings Dialog:
   - Language EN/DE live switching
   - Env-Root folder picker + Persist
   - uv Mode: sidecar ON/OFF + optional path override + Persist
6. Interpreter Card zeigt `uv` Version (über Rust Command), oder **“uv not found”** – ohne Crash.
7. README dokumentiert Setup + Sidecar Platzierung + Linux `chmod +x`.

---

## 2) Repo-Struktur (soll so entstehen)
- `src-tauri/`
  - `src/main.rs`
  - `src/uv.rs` (uv resolution + spawn + cancel)
  - `src/settings.rs`
  - `bin/` (sidecar placeholders)
- `src/`
  - `components/` (Titlebar, Sidebar, Header, Tabs, Table, Panels, Console, SettingsDialog)
  - `state/` (`store.ts`, `i18n.ts`, `jobs.ts`)
  - `mock/` (envs, packages, summaries)
  - `styles/` (`tokens.css`, `app.css`)
- `assets/logo.png`
- `README.md`

---

## 3) Schrittplan (immer in kleinen, sicheren Schritten)
### Step 1 — Projekt anlegen
- Tauri v2 App scaffold
- React/Vite/TS + Tailwind einrichten
- `pnpm` als Package Manager
- App Name überall: **uvnvpy**, Version: **0.1.0**, Author: **Youssef Serestou**

### Step 2 — Theme Tokens
- In `src/styles/tokens.css` oben ein Token-Block:
  - `--bg, --panel, --panel2, --text, --muted, --accent, --accent2, --border, --danger`
- Keine Hardcoded-Farben in Components (außer Icons/SVG, wenn nötig)

### Step 3 — Main Window Layout (statisch)
- Komponenten bauen, Layout pixel-nah:
  - Titlebar (frameless)
  - Sidebar (fixed width)
  - Header (Env Info + Interpreter card)
  - Tabs
  - Packages Table + Buttons
  - Details Panel + Actions Panel
  - Console Output + Abort
- Erstmal alles mit Mock-Daten füllen, keine Backend Calls nötig

### Step 4 — State + Mock Data
- `mock/envs.ts`: 4 envs
- `mock/packages.ts`: min. 2 envs unterscheiden sich
- `
