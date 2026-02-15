# uvnvpy

Basis-Setup für **Tauri v2 + React/Vite + TypeScript + Tailwind**.

## Voraussetzungen

- Node.js 20+
- pnpm 9+
- Rust (stable)
- Tauri-Systemabhängigkeiten (Linux: siehe `run/setup_env.sh`)

## Installation

```bash
pnpm install
```

## Entwicklung starten

```bash
pnpm tauri dev
```

Nur Frontend lokal starten:

```bash
pnpm dev
```

## Build

```bash
pnpm tauri build
```

## Sidecar-Hinweis (später)

Für Sidecar-Binaries ist der Ordner `src-tauri/bin/` vorgesehen.
Unter Linux müssen Binaries ausführbar sein:

```bash
chmod +x src-tauri/bin/<dein-binary>
```
