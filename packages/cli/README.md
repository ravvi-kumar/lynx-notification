# lynx-notifications CLI

Scaffold push + local notifications integration for Lynx projects.

## Usage

```bash
npx lynx-notifications init --provider fcm --platform ios,android
```

Flags:

- `--provider fcm` (required provider in v1)
- `--platform ios,android` (default is `ios,android`)
- `--entry src/index.tsx` to force a custom entry file path
- `--no-wire-entry` to skip auto-wiring bootstrap in the entry file
- `--skip-install` to skip package manager installation and only update `package.json`

When `--entry` is used, the CLI computes the correct relative import path to `src/notifications/bootstrap.ts`.
