# Lynx Notifications Integration Guide

The CLI generated notifications bootstrap and attempted native setup.

## Missing native directories
- ios
- android

## Missing native files
- None

## Manual follow-ups
- None

## Apply snippets manually

- iOS Podfile snippet: `.lynx-notifications/snippets/ios.podfile.snippet`
- Android app Gradle snippet: `.lynx-notifications/snippets/android.app.build.gradle.snippet`
- Android root Gradle snippet: `.lynx-notifications/snippets/android.root.build.gradle.snippet`
- Android manifest permission snippet: `.lynx-notifications/snippets/android.manifest.permission.snippet`
- Android manifest receiver snippet: `.lynx-notifications/snippets/android.manifest.receiver.snippet`

## JS bootstrap

Import and call `bootstrapNotifications` from:

- `src/notifications/bootstrap.ts`

## Native diagnostics (optional)

- Enable `debugLoggingEnabled` in host native `InstallationOptions` during QA runs to print permission/token/event failure logs.
- Keep `debugLoggingEnabled` disabled in production unless diagnosing an issue.

Typical usage:

`const token = await Notifications.registerForPushNotificationsAsync();`
`Notifications.addNotificationReceivedListener(...)`
