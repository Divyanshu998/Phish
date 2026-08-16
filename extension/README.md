# 🕷️ PhishGuard AI — Chromium Browser Extension

A Manifest V3 Chromium browser extension compatible with **Google Chrome** and **Microsoft Edge**.

## Features
- Active Tab URL detection & safety guard against `chrome://`, `edge://`, and internal system pages.
- One-click threat scan executing real ML & Heuristic analysis on FastAPI backend (`POST /api/extension/scan`).
- 0-100 Risk Score meter with classification (`SAFE`, `SUSPICIOUS`, `HIGH RISK`, `CRITICAL`).
- ML Prediction confidence & primary risk factor explanations.
- Local scan history persistence via `chrome.storage.local`.
- Direct single-click navigation to web SOC dashboard (`/dashboard/scan/{scan_id}`).
- Health connection status check (`/api/health`).

## Build Instructions

```bash
cd extension
npm install
npm run build
```

The output unpackaged extension will be generated in `extension/dist/`.

## How to Install in Chrome / Edge
1. Open Chrome and navigate to `chrome://extensions` (or Edge `edge://extensions`).
2. Enable **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select the `extension/dist/` directory.
5. Pin the **PhishGuard AI** extension to your browser bar.
