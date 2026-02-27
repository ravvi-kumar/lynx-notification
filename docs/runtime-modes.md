# Runtime Modes (What Works Where)

This package has two parts:

1. JS package (`@lynx-notifications/core`)
2. Native module (`LynxNotificationsModule`)

The JS package can be installed anywhere.
Real notifications require the native module to be present in the runtime.

## Mode A: Stock Lynx Explorer (no custom native build)

Use when:

- you only want to run JS/UI quickly

Behavior:

- `LynxNotificationsModule` is not present
- notifications APIs that require native will fail with:
  - `ERR_NOTIFICATIONS_UNAVAILABLE`

Conclusion:

- not suitable for real local/push validation

## Mode B: Custom-built Lynx Explorer (with module integration)

Use when:

- you want to validate on device before integrating into your own host app

Required:

1. clone/build Lynx Explorer from source
2. register `LynxNotificationsModule` in Explorer native code
3. add Firebase wiring for Android/iOS if testing remote push

Behavior:

- real permissions/local notifications/push token/push delivery can be tested

## Mode C: App's own native host (recommended for production)

Use when:

- you are shipping to users

Required:

1. install JS package via CLI:
   - `npx lynx-notifications init --provider fcm --platform ios,android`
2. integrate native host using templates in:
   - `examples/native-host/android/LynxNotificationsHostIntegration.java`
   - `examples/native-host/ios/LynxNotificationsHostIntegration.swift`
3. add platform push providers (FCM/APNs), permissions, and schedulers

Behavior:

- full production flow works in your app runtime

## What Other Developers Need To Know

When publishing this package, state this clearly:

1. installing npm package alone is not enough for real notifications
2. native integration is mandatory for real usage
3. stock Lynx Explorer cannot run custom native modules by default
4. for real validation, use custom Explorer build or your own native host app

## Recommended Onboarding Flow

1. run CLI init
2. verify JS wiring in app
3. complete native host wiring
4. run on physical device
5. verify permission -> token -> local -> remote push
