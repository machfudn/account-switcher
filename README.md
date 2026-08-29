<!-- prettier-ignore -->
<div align="center">

<img src="icons/icon128.png" width="96" alt="Account Switcher logo">

# Account Switcher

*Switch between multiple accounts for ChatGPT, Claude, Gemini, Canva, Perplexity, Poe, Copilot, Grok, DeepSeek, HuggingChat, Cursor, and NotebookLM*

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=flat-square)](https://developer.chrome.com/docs/extensions/develop/concepts/mv3-overview)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Backup & Restore](#backup--restore) • [Troubleshooting](#troubleshooting)

</div>

A lightweight browser extension that lets you save and switch between multiple accounts across ChatGPT, Claude, Google Gemini, Canva, Perplexity, Poe, Microsoft Copilot, Grok, DeepSeek, HuggingChat, Cursor, and NotebookLM — without logging out and back in. Sessions are stored locally in your browser and can be exported or imported as JSON files for backup or migration.

## Supported Apps

| App | Domains |
|-----|---------|
| ChatGPT | `chatgpt.com`, `openai.com` |
| Claude | `claude.ai` |
| Gemini | `gemini.google.com` |
| Canva | `canva.com` |
| Perplexity | `perplexity.ai` |
| Poe | `poe.com` |
| Microsoft Copilot | `copilot.microsoft.com` |
| Grok | `x.com`, `grok.com` |
| DeepSeek | `chat.deepseek.com` |
| HuggingChat | `huggingface.co` |
| Cursor | `cursor.com` |
| NotebookLM | `notebooklm.google.com` |

## Features

- **Multi-app support** — Manage accounts for 12 apps from one extension
- **One-click switching** — Instantly swap between saved sessions
- **Per-app tabs** — Clean tabbed UI to switch between apps
- **App search** — Filter the app list from the main menu to jump to any of the 12 apps fast
- **Themed interface** — Each app gets its own brand color
- **Session backup** — Export all or selected sessions to a JSON file
- **Import** — Restore sessions from an export file, on any machine
- **Account management** — Rename or delete saved accounts at any time
- **Zero dependencies** — Plain HTML, CSS and JavaScript, no build step required

## How it works

When you save a session, the extension captures all cookies for the selected app's domains — including partitioned cookies — and stores them in `chrome.storage.local` under an app-specific key. Switching accounts clears the current session cookies and restores the ones from the selected account, then reloads any open tabs for that app.

No data ever leaves your browser: everything stays in local storage unless you explicitly export it yourself.

## Project Structure

Per-app configuration is split into its own file so each supported app is maintained in isolation. The engine modules are fully generic and never reference an app by name.

```
account-switcher/
├── manifest.json          # MV3 manifest + host_permissions (domain allowlist)
├── popup.html             # loads config → apps → engine scripts in order
├── popup.css
├── background.js          # service worker
├── icons/
└── js/
    ├── config.js          # APPS = {} registry + shared state (currentApp, selectedNames)
    ├── apps/              # one file per supported app
    │   ├── chatgpt.js
    │   ├── claude.js
    │   ├── gemini.js
    │   └── canva.js
    ├── cookies.js         # capture / restore cookies for the active app
    ├── storage.js         # chrome.storage.local wrapper (per-app key)
    ├── modal.js           # shared confirm/prompt modal
    ├── ui.js              # render cards + account list
    ├── actions.js         # save / switch / rename / delete / clear
    ├── export.js          # export / import sessions as JSON
    └── app.js             # popup wiring + bootstrap
```

Each file under `js/apps/` registers itself by assigning to the shared `APPS` object, e.g.:

```js
// js/apps/chatgpt.js
APPS.chatgpt = {
  name: 'ChatGPT',
  color: '#10A37F',
  icon: `<svg …>`,
  domains: ['chatgpt.com', 'openai.com'],
  tabs: ['https://chatgpt.com/*', 'https://*.chatgpt.com/*', 'https://chat.openai.com/*']
};
```

## Adding a Supported App

Because the engine is app-agnostic, adding a service is pure data — no engine changes required.

1. **Create `js/apps/<id>.js`** registering the app on `APPS` (see the example above). Use a stable lowercase `id`.
2. **Add its domains** to `host_permissions` in `manifest.json` (e.g. `"https://perplexity.ai/*"`). This step is mandatory — the browser blocks cookie access to any domain not listed here.
3. **Load the script** in `popup.html` between `js/config.js` and `js/cookies.js`:
   ```html
   <script src="js/apps/<id>.js"></script>
   ```
4. Reload the extension from `chrome://extensions` and the new app appears as a card automatically.

> [!NOTE]
> `manifest.json` cannot be split per app, so the domain allowlist stays centralized there. Everything else about an app lives in its own `js/apps/<id>.js` file.

## Installation

The extension is not published yet — install it manually from the source:

1. Download or clone this repository:
   ```bash
   git clone https://github.com/machfudn/account-switcher.git
   ```
2. Open Chrome (or any Chromium-based browser) and go to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select the project folder.
5. Pin the extension to your toolbar for quick access.

> [!NOTE]
> The extension requests `storage`, `cookies` and `tabs` permissions, scoped to the supported app domains only. It cannot read cookies from any other website.

## Usage

### Save your first account

1. Log in to your account on any supported app.
2. Open the extension popup and select the app tab.
3. Enter a name under **Save Session** (for example, *work*) and click **Save**.
4. Repeat for each account you want to keep.

### Switch accounts

Open the popup, select the app tab, and click **Switch** next to the account you want to use. Your current session is replaced by the saved one and all open tabs for that app are reloaded automatically.

### Manage accounts

| Action | Description |
| --- | --- |
| **Rename** | Change the display name of a saved account |
| **Delete** | Remove a single saved session |
| **Clear All Sessions** | Wipe every saved account for the current app |

## Backup & Restore

In the popup's **Backup** section:

- Click **Export All** to download all saved sessions for the current app, or tick individual accounts and click **Export Selected**.
- Click **Import** to load sessions from an exported file. Accounts with the same name are overwritten.

> [!WARNING]
> Exported files contain full login session tokens. Anyone with access to the file can access those accounts without a password. Store exports securely and never share them.

## Troubleshooting

**Switching doesn't log me in**
Re-save the account while logged in, then try again. Expired sessions can't be restored — simply log in again and overwrite the saved account.

**Some cookies failed to restore**
If you see a warning message, some cookies were rejected by the browser. Reload the extension from `chrome://extensions`, re-save the affected account, and switch again.

**Exported file fails to import**
Only files exported by this extension are accepted, and they must contain at least one valid account entry.

## Disclaimer

This extension is not affiliated with, endorsed by, or connected to OpenAI, Anthropic, Google, or Canva. Use of multiple accounts must comply with each service's terms of service.
