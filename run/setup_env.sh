#!/usr/bin/env bash
set -euo pipefail

step() { echo -e "\n==> $1"; }

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Dieses Script sollte als root laufen (Container meist ok)."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

step "APT: Paketlisten aktualisieren"
apt-get update -y

step "APT: Basis-Tools installieren (curl, git, certificates, build tools)"
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  wget \
  git \
  file \
  xz-utils \
  unzip \
  pkg-config \
  build-essential

step "APT: Tauri Linux Dependencies installieren (GTK/WebKit/AppIndicator/SVG/XDO/SSL)"
# WebKitGTK: auf neueren Distros 4.1, auf Debian Stable oft 4.0
if apt-get install -y --no-install-recommends libwebkit2gtk-4.1-dev; then
  echo "WebKitGTK 4.1 dev installiert."
else
  echo "WebKitGTK 4.1 nicht verfügbar -> fallback auf 4.0"
  apt-get install -y --no-install-recommends libwebkit2gtk-4.0-dev
fi

apt-get install -y --no-install-recommends \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libxdo-dev \
  xdotool \
  libssl-dev

step "APT: Node.js + npm installieren (Debian Pakete)"
apt-get install -y --no-install-recommends nodejs npm

step "pnpm aktivieren (Corepack wenn vorhanden, sonst npm -g)"
if command -v corepack >/dev/null 2>&1; then
  corepack enable
  # Aktiviert eine aktuelle pnpm-Version (zieht aus dem Netz)
  corepack prepare pnpm@latest --activate
else
  npm install -g pnpm
fi

step "Rust installieren (rustup, non-interactive)"
# Installiert Rust nach /root/.cargo und /root/.rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

step "Rust PATH setzen (für diese Shell) + Basis-Tools"
export PATH="/root/.cargo/bin:${PATH}"
rustup toolchain install stable
rustup default stable
rustup component add rustfmt clippy

step "Sanity Check: Versionen ausgeben"
echo "node:  $(node -v || true)"
echo "npm:   $(npm -v || true)"
echo "pnpm:  $(pnpm -v || true)"
echo "rustc: $(rustc -V || true)"
echo "cargo: $(cargo -V || true)"

step "Hinweis: In deinem uvnvpy Repo dann bauen"
cat <<'EOF'
Beispiel:
  pnpm install
  pnpm tauri dev

Für Release:
  pnpm tauri build
EOF

step "Fertig"
