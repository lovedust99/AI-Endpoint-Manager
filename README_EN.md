<div align="center">

![1](https://github.com/lovedust99/Source/blob/main/pic/lovedust.png?raw=true)

---

<img src="public/icon.png" alt="AI Endpoint Manager" width="120" height="120">

# AI Endpoint Manager

**OpenAI-Compatible API Endpoint & Relay Check-in Manager**

One-stop management for your API endpoints, keys, and relay site check-in tasks

[![Vue 3](https://img.shields.io/badge/Vue-3.5-green.svg)](https://vuejs.org/)
[![lucide](https://img.shields.io/badge/icons-lucide-blue.svg)](https://lucide.dev/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest%20V3-yellow.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![Vite](https://img.shields.io/badge/Vite-8.0-purple.svg)](https://vitejs.dev/)

[中文](./README.md) | English

</div>

---

## Background

When working with various third-party services that offer APIs — whether public welfare sites, self-hosted relays, or temporary test endpoints — you often need to switch between endpoints quickly without adding them all to your production configuration. This tool is built for that workflow: manage API endpoints entirely in your browser, test connectivity on the fly, and automate relay site check-ins.

## ✨ Features

### 🔗 Endpoint Management

Basic API key management features are all provided. Please submit an issue if you need anything else.

<img src="public/1.png" alt="Endpoint Management" width="100%">

### ✅ Check-in Automation

<img src="public/2.png" alt="Check-in Automation" width="100%">

- **New-API Preset Mode** — Quick setup based on `New-API`
- **Custom HTTP Mode** — Supports any HTTP request configuration (URL, method, headers, body)
- **curl Command Import** — Parse `curl` commands (bash and Windows cmd formats), auto-fill request parameters
- **Success/Failure Keyword Detection** — Configurable keyword lists to intelligently determine check-in results
- **Batch Check-in** — One-click check-in across multiple sites with configurable concurrency (1–10, default 2)
- **Failed Retry** — Retry only previously failed sites, avoiding duplicate requests
- **Script Export** — Generate standalone Node.js check-in script with configurable cron schedules (daily / every 8h / weekly / custom)

### ⚙️ System Settings

- **Concurrency Control** — Adjust concurrent check-in request count (1–10)
- **Data Export** — Export all configuration as a JSON backup file (endpoints, check-in sites, categories, settings)
- **Data Import** — Restore configuration from a JSON file
- **Clear All Data** — Permanently erase all local data after confirmation
- **Form Draft Persistence** — Edit forms auto-save; previous state is restored when the dialog reopens

### 🎨 Interface & Experience

- **Dual Display Modes** — Browser extension popup mode and standalone fullscreen window mode
- **Light/Dark Theme** — Supports light, dark, and system-following theme modes
- **100% Local Storage** — Extension mode uses `chrome.storage.local`, web mode uses `localStorage`, no server required, fully offline capable

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Vue 3 | 3.5 | Core framework (Composition API + `<script setup>`) |
| lucide-vue-next | 1.0 | Icon library |
| @vueuse/core | 14.2 | Utility functions (theme detection, etc.) |
| vuedraggable | 4.1 | Drag-and-drop sorting |
| Sass | 1.99 | Style preprocessing |
| Vite | 8.0 | Build tool |
| Chrome Manifest V3 | — | Browser extension specification |

---

## 📦 Project Structure

```
ai-endpoint-manager/
├── public/
│   ├── icon.png              # Extension icon
│   └── manifest.json         # Chrome Extension Manifest V3 config
├── src/
│   ├── main.js               # App entry (Vue init, mode detection)
│   ├── App.vue               # Main app component (layout & navigation)
│   ├── style.css             # Global styles & design tokens (CSS variables, light/dark themes)
│   ├── composables/
│   │   └── useManagerState.js # Core state management & business logic
│   ├── components/
│   │   ├── views/
│   │   │   ├── EndpointSection.vue   # Endpoint management view
│   │   │   ├── CheckinSection.vue    # Check-in automation view
│   │   │   └── SettingsSection.vue   # System settings view
│   │   ├── dialogs/
│   │   │   ├── EndpointDialog.vue    # Endpoint edit dialog
│   │   │   ├── CheckinDialog.vue     # Check-in site edit dialog
│   │   │   ├── ExportDialog.vue      # Qinglong script export dialog
│   │   │   ├── ModelsDialog.vue      # Model list dialog
│   │   │   ├── ModelTestDialog.vue   # Model test result dialog
│   │   │   ├── RemarkDialog.vue      # Remark viewer dialog
│   │   │   └── ConfirmDialog.vue     # Confirmation dialog
│   │   └── ui/
│   │       ├── AppModal.vue          # Generic modal component
│   │       ├── AppSelect.vue         # Custom select component
│   │       ├── AppCombobox.vue       # Custom combobox component
│   │       ├── ThemeSwitcher.vue     # Theme toggle component
│   │       └── ToastStack.vue        # Toast notification stack
│   └── utils/
│       └── viewMode.js       # View mode detection (popup vs standalone)
├── index.html                # Entry HTML
├── vite.config.js            # Vite build config
├── package.json              # Project dependencies & scripts
└── pnpm-lock.yaml            # Package manager lockfile
```

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) (recommended) or npm

### Install Dependencies

```bash
pnpm install
```

### Development Mode

```bash
pnpm dev
```

Starts the local dev server. Open in your browser to debug. The dev server defaults to the full standalone layout. To simulate the extension popup viewport, visit `http://localhost:5173/?mode=popup`.

### Production Build

```bash
pnpm build
```

Build output goes to the `dist/` directory.

### Install as Chrome Extension

1. Run `pnpm build` to generate the `dist/` directory
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the project's `dist/` folder
6. The extension icon will appear in the browser toolbar — click to use

### Preview Build Output Locally

```bash
pnpm preview
```

---

## 🔧 Extension Permissions

This extension requests the following Chrome permissions:

| Permission | Purpose |
|-----------|---------|
| `storage` | Store endpoint configs, check-in sites, categories, and settings locally |
| `clipboardWrite` | Copy BaseURLs and API keys to clipboard |
| `tabs` | Open the management page in a standalone window |
| `windows` | Create and manage standalone popup windows |
| `<all_urls>` (host) | Send test and check-in requests to external API endpoints |

All data is stored entirely in the local browser — **nothing is uploaded to any server**.

---

## 💾 Data Storage

All data in this tool is stored 100% locally in the browser:

- **Extension mode** — `chrome.storage.local`
- **Web mode** — `localStorage`

## 🤝 Contributing

Contributions are welcome! Here's how you can participate:

1. **Fork** this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Submit a **Pull Request**

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---

<div align="center">

**If this tool helps you, please give it a ⭐ Star to show your support!**

</div>
