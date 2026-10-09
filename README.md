# Deedar ISR — Android app

Android app for Field Salesman ISRs, built with Expo (React Native + TypeScript, Expo Router).
It talks to the existing web portal in `../deedar-drive` (via `/api/mobile/*` routes) and to
the realtime location service in `../ws-server`.

## Setup

```bash
npm install
cp .env.example .env.local   # then set the server addresses
npm start                    # scan the QR code with Expo Go, or press "a" for an emulator
```

Point `.env.local` at a local or test server while developing — never production.

## Checks

```bash
npm run lint
npm run typecheck
npx expo-doctor
```

## Notes

- Install packages with `npx expo install <package>` so versions match the Expo SDK.
- `android/` is generated — configure native behaviour in `app.json`, never by hand.
- Background location needs a development build (`npx expo run:android` or
  `npx eas-cli@latest build --profile development`); Expo Go can't do it.
