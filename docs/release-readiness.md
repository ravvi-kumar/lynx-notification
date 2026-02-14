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

## Remaining Before “Real Release”

1. Android host production adapters:
   - concrete runtime permission requester using Activity Result APIs
   - concrete local scheduler implementation backed by platform notifications APIs
2. iOS host production adapters:
   - concrete permission requester using `UNUserNotificationCenter`
   - concrete local scheduler implementation backed by `UNUserNotificationCenter`
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
