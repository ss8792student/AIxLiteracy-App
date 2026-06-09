# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important

Before writing any Expo or React Native code, read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ — Expo APIs change significantly between versions and training data may be outdated.

## Commands

```bash
npm start          # Start Expo dev server (scan QR with Expo Go)
npm run ios        # Start with iOS simulator
npm run android    # Start with Android emulator
npm run web        # Start in browser
```

No test runner or linter is configured yet.

## Architecture

This is a fresh **Expo SDK 56 / React Native 0.85** app using the minimal `blank-typescript` template.

- `index.ts` — entry point; calls `registerRootComponent(App)` to wire Expo Go and native builds
- `App.tsx` — root component; start building here
- `app.json` — Expo config (name, icons, orientation, platform-specific settings)
- TypeScript strict mode is enabled (`tsconfig.json` extends `expo/tsconfig.base`)

No navigation, state management, or styling library is installed yet.
