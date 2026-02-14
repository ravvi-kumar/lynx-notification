export const CORE_PACKAGE_NAME = '@lynx-notifications/core'
export const CORE_VERSION_RANGE = '^0.1.0-alpha'

export const IOS_PODFILE_MARKERS = {
  start: '# >>> lynx-notifications-pods',
  end: '# <<< lynx-notifications-pods',
}

export const ANDROID_APP_DEPS_MARKERS = {
  start: '// >>> lynx-notifications-dependencies',
  end: '// <<< lynx-notifications-dependencies',
}

export const ANDROID_ROOT_REPO_MARKERS = {
  start: '// >>> lynx-notifications-repositories',
  end: '// <<< lynx-notifications-repositories',
}

export const ANDROID_MANIFEST_RECEIVER_MARKERS = {
  start: '<!-- >>> lynx-notifications-receiver -->',
  end: '<!-- <<< lynx-notifications-receiver -->',
}

export const ANDROID_MANIFEST_PERMISSION_MARKERS = {
  start: '<!-- >>> lynx-notifications-permission -->',
  end: '<!-- <<< lynx-notifications-permission -->',
}

export const ENTRY_BOOTSTRAP_MARKERS = {
  start: '// >>> lynx-notifications-bootstrap',
  end: '// <<< lynx-notifications-bootstrap',
}

export function createBootstrapTemplate(): string {
  return `import * as Notifications from '${CORE_PACKAGE_NAME}'

export async function bootstrapNotifications(): Promise<() => void> {
  const token = await Notifications.registerForPushNotificationsAsync()
  console.info('[lynx-notifications] push token', token.data)

  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.info('[lynx-notifications] notification received', notification)
  })

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.info('[lynx-notifications] notification response', response)
  })

  return () => {
    receivedSubscription.remove()
    responseSubscription.remove()
  }
}
`
}

export function createEntryBootstrapSnippet(bootstrapImportPath: string): string {
  return `void (async () => {
  const { bootstrapNotifications } = await import('${bootstrapImportPath}')
  await bootstrapNotifications()
})().catch(error => {
  console.warn('[lynx-notifications] bootstrap failed', error)
})`
}

export function createIosPodfileSnippet(): string {
  return `pod 'LynxNotificationsCore'
pod 'LynxNotificationsFCM'
`
}

export function createAndroidAppGradleSnippet(): string {
  return `dependencies {
  implementation("io.lynx.notifications:core:0.1.0-alpha")
  implementation("io.lynx.notifications:fcm:0.1.0-alpha")
  implementation("io.lynx.notifications:android-runtime:0.1.0-alpha")
}
`
}

export function createAndroidRootGradleSnippet(): string {
  return `allprojects {
  repositories {
    maven { url "https://maven.lynx.dev/releases" }
  }
}
`
}

export function createAndroidManifestReceiverSnippet(): string {
  return `<!-- Receiver for local notifications scheduled by LynxNotificationsModule -->
<receiver
    android:name="io.lynx.notifications.android.AndroidNotificationPublisherReceiver"
    android:exported="false" />`
}

export function createAndroidManifestPermissionSnippet(): string {
  return `<!-- Runtime notification permission required on Android 13+ -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`
}

export function createIntegrationGuide(options: {
  missingNativeDirectories: string[]
  missingNativeFiles: string[]
  manualSteps?: string[]
}): string {
  const missingDirectoriesSection = options.missingNativeDirectories.length > 0
    ? options.missingNativeDirectories.map(item => `- ${item}`).join('\n')
    : '- None'

  const missingFilesSection = options.missingNativeFiles.length > 0
    ? options.missingNativeFiles.map(item => `- ${item}`).join('\n')
    : '- None'

  const manualStepsSection = options.manualSteps && options.manualSteps.length > 0
    ? options.manualSteps.map(item => `- ${item}`).join('\n')
    : '- None'

  return `# Lynx Notifications Integration Guide

The CLI generated notifications bootstrap and attempted native setup.

## Missing native directories
${missingDirectoriesSection}

## Missing native files
${missingFilesSection}

## Manual follow-ups
${manualStepsSection}

## Apply snippets manually

- iOS Podfile snippet: \`.lynx-notifications/snippets/ios.podfile.snippet\`
- Android app Gradle snippet: \`.lynx-notifications/snippets/android.app.build.gradle.snippet\`
- Android root Gradle snippet: \`.lynx-notifications/snippets/android.root.build.gradle.snippet\`
- Android manifest permission snippet: \`.lynx-notifications/snippets/android.manifest.permission.snippet\`
- Android manifest receiver snippet: \`.lynx-notifications/snippets/android.manifest.receiver.snippet\`

## JS bootstrap

Import and call \`bootstrapNotifications\` from:

- \`src/notifications/bootstrap.ts\`

## Native diagnostics (optional)

- Enable \`debugLoggingEnabled\` in host native \`InstallationOptions\` during QA runs to print permission/token/event failure logs.
- Keep \`debugLoggingEnabled\` disabled in production unless diagnosing an issue.

Typical usage:

\`const token = await Notifications.registerForPushNotificationsAsync();\`
\`Notifications.addNotificationReceivedListener(...)\`
`
}
