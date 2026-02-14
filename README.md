## Lynx Notifications Workspace

This repository contains:

- A Lynx starter app at `/src`
- `@lynx-notifications/core` at `/packages/core`
- `lynx-notifications` CLI at `/packages/cli`
- Demo workspace package at `/examples/lynx-notifications-demo`
- Native host examples at `/examples/native-host`
- Native artifact scaffolding at `/native`

## Quick Start

```bash
npx lynx-notifications init --provider fcm --platform ios,android
```

## Docs

- `/docs/quick-start.md`
- `/docs/native-integration.md`
- `/docs/testing-on-device.md`
- `/docs/release-readiness.md`

## Commands

```bash
npm run dev
npm run build
npm run test
npm run lint
npm run build:packages
npm run test:packages
npm run typecheck:packages
npm run validate:release-config
npm run test:native:ios
npm run test:native:android:unit
```
