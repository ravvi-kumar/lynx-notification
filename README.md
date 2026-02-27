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
bun install
```

```bash
bunx lynx-notifications init --provider fcm --platform ios,android
```

`npm`/`npx` also work, but this repo is maintained primarily with Bun.

## Docs

- `/docs/quick-start.md`
- `/docs/runtime-modes.md`
- `/docs/native-integration.md`
- `/docs/testing-on-device.md`
- `/docs/release-readiness.md`
- `/docs/real-release-checklist.md`

## Commands

```bash
bun run dev
bun run build
bun run test
bun run lint
bun run build:packages
bun run test:packages
bun run typecheck:packages
bun run validate:release-config
bun run release:preflight
bun run release:preflight:publish
bun run test:native:ios
bun run test:native:android:unit
```

Important:

- Use `bun run test` (Vitest).
- Do not use `bun test` in this repository. `bun test` runs Bun's built-in runner and bypasses Vitest/Lynx test setup.
