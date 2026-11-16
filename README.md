# Handover

A mobile-first React JS application built with **Vite**, **PWA**, and **Capacitor** so the exact same React JS codebase runs as both a **Web App** (including installable PWA) and a **Native iOS / Android App**.

## Run as a Web App

```bash
npm install
npm run dev
```

Build production web bundle (`dist/`):

```bash
npm run build
npm run preview
```

## Run as a Native App (iOS & Android via Capacitor)

1. Build the web assets and add the native platform(s):

```bash
npm run build
npx cap add android
npx cap add ios
```

2. Sync the React JS bundle and native plugins (`@capacitor/status-bar`, `@capacitor/haptics`):

```bash
npm run cap:sync
```

3. Open in Android Studio or Xcode:

```bash
npm run cap:android
npm run cap:ios
```

