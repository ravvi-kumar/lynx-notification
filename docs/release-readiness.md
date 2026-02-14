# Release Readiness

Current target: `0.1.0-alpha`

## Status By Phase

1. Phase 1 (JS core package): Complete
2. Phase 2 (Android native core + FCM): In progress
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

## Remaining Before “Real Release”

1. Android runtime artifact:
   - stabilize and validate `android-runtime` Gradle publish pipeline end-to-end on CI runs
   - verify host consumption from published remote Maven coordinates (non-local repo)
2. iOS host production adapters:
   - integration testing of `UNUserNotificationCenter` adapters on physical devices
3. End-to-end native test execution in CI:
   - Android Gradle/JUnit/instrumentation runners
   - iOS XCTest runner
4. Device matrix verification:
   - Android 13+ physical devices
   - iOS 16+ physical devices
5. Artifact publishing setup:
   - CocoaPods spec publishing validation
   - Maven publishing validation

## Release Gate

Do not promote beyond alpha until all items in “Remaining Before Real Release” are complete and verified on real devices.

## Release Workflow Controls

`Release Alpha` workflow (`.github/workflows/release-alpha.yml`) now supports:

1. `release_mode`: `dry-run` or `publish`
2. `publish_js`: publish npm packages toggle
3. `publish_native`: publish native artifacts toggle

Required secrets for real publish mode:

1. `NPM_TOKEN` (JS npm publish)
2. `MAVEN_PUBLISH_URL`
3. `MAVEN_PUBLISH_USERNAME`
4. `MAVEN_PUBLISH_PASSWORD`
5. `COCOAPODS_TRUNK_TOKEN`

Strict mode also enforces:

1. iOS podspec placeholder metadata removal (`example` URLs/emails)
2. JS/native artifact version consistency
