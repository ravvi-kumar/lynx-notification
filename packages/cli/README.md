# lynx-notifications CLI

Scaffold push + local notifications integration for Lynx projects.

## Usage

```bash
npx lynx-notifications init --provider fcm --platform ios,android
```

Flags:

- `--provider fcm` (required provider in v1)
- `--platform ios,android` (default is `ios,android`)
- `--skip-install` to skip package manager installation and only update `package.json`
