# Release Readiness

Current target: `0.1.0-alpha`

Execution checklist: `docs/real-release-checklist.md`

## Status By Phase

1. Phase 1 (JS core package): Complete
2. Phase 2 (Android native core + FCM): Complete (physical-device validated)
3. Phase 3 (iOS native core + FCM): In progress
4. Phase 4 (CLI init + patching): Complete for v1 scope
5. Phase 5 (demo/docs/release pipeline): In progress

## Done

1. Expo-like JS API in `@lynx-notifications/core`
2. Typed native bridge envelope + normalized error model
3. Listener lifecycle and idempotent subscription removal
4. Workspace packages (`core`, `cli`, demo)
5. `lynx-notifications init` with repeat-safe patch blocks
6. Native contract docs and host integration templates
7. FCM provider templates for Android and iOS
8. JS unit tests + CLI unit tests + CI scripts
9. iOS production adapter implementations:
   - `UNUserNotificationCenterPermissionProvider`
   - `UNUserNotificationCenterLocalNotificationScheduler`
10. Android production adapter module:
   - runtime permission bridge
   - AlarmManager scheduler + publish receiver
   - publishable artifact scaffold at `native/android/runtime`
11. CLI Android manifest patching for:
    - `android.permission.POST_NOTIFICATIONS`
    - local notification receiver block
12. Native CI workflow scaffolding:
    - `.github/workflows/native-artifacts.yml`
    - native Android publish-to-local checks
    - native iOS Swift parse checks
    - host-consumption assemble check from Maven local artifacts
13. Android native multi-project build setup:
    - `native/android/settings.gradle`
    - `native/android/build.gradle`
    - `native/android/host-check`
14. Automated release-config validation:
    - `scripts/validate-native-release.mjs`
    - `npm run validate:release-config`
    - `npm run validate:release-config:strict`
15. CI native test runners:
    - Android instrumentation job (`:runtime:connectedDebugAndroidTest` on emulator)
    - iOS XCTest runner (`swift test --package-path native/ios`)
16. Remote Maven host-consumption verification in release workflow:
    - post-publish `host-check` assemble against remote repository coordinates
17. Debug-gated native diagnostics:
    - Android and iOS logging hooks for permission/token/event failure paths
    - host `InstallationOptions.debugLoggingEnabled` toggle for QA runs
18. Local release preflight script:
    - `npm run release:preflight`
    - `npm run release:preflight:publish`
19. Android end-to-end physical-device validation (custom Lynx Explorer host):
    - module registration confirmed
    - permission flow confirmed
    - local notification scheduling + delivery confirmed
    - FCM token registration confirmed
    - remote push delivery confirmed (including app inactive/background case)

## Remaining Before “Real Release”

1. iOS remote push path:
   - complete APNs/FCM wiring and validate push token + remote delivery on physical iOS device
2. Android artifact publishing:
   - execute and validate publish-mode workflow against real remote Maven credentials
3. iOS artifact publishing:
   - validate CocoaPods trunk publish flow with production credentials
4. Device matrix verification:
   - re-run Android 13+ verification on at least one additional physical device
   - complete iOS 16+ physical-device matrix including cold-start response path

## Release Gate

Do not promote beyond alpha until all items in “Remaining Before Real Release” are complete and verified on real devices.

## Release Workflow Controls

`Release Alpha` workflow (`.github/workflows/release-alpha.yml`) now supports:

1. `release_mode`: `dry-run` or `publish`
2. `publish_js`: publish npm packages toggle
3. `publish_native`: publish native artifacts toggle
4. remote Android host-consumption verification after native publish (publish mode)

Required secrets for real publish mode:

1. `NPM_TOKEN` (JS npm publish)
2. `MAVEN_PUBLISH_URL`
3. `MAVEN_PUBLISH_USERNAME`
4. `MAVEN_PUBLISH_PASSWORD`
5. `COCOAPODS_TRUNK_TOKEN`

Strict mode also enforces:

1. iOS podspec placeholder metadata removal (`example` URLs/emails)
2. JS/native artifact version consistency

Optional repository variables for podspec metadata override:

1. `LYNX_NOTIFICATIONS_HOMEPAGE`
2. `LYNX_NOTIFICATIONS_IOS_SOURCE_GIT`
3. `LYNX_NOTIFICATIONS_AUTHOR_NAME`
4. `LYNX_NOTIFICATIONS_AUTHOR_EMAIL`
