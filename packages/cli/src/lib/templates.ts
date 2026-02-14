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

export function createIosPodfileSnippet(): string {
  return `pod 'LynxNotificationsCore'
pod 'LynxNotificationsFCM'
`
}

export function createAndroidAppGradleSnippet(): string {
  return `dependencies {
  implementation("io.lynx.notifications:core:0.1.0-alpha")
  implementation("io.lynx.notifications:fcm:0.1.0-alpha")
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

export function createIntegrationGuide(options: {
  missingNativeDirectories: string[]
  missingNativeFiles: string[]
}): string {
  const missingDirectoriesSection = options.missingNativeDirectories.length > 0
    ? options.missingNativeDirectories.map(item => `- ${item}`).join('\n')
    : '- None'

  const missingFilesSection = options.missingNativeFiles.length > 0
    ? options.missingNativeFiles.map(item => `- ${item}`).join('\n')
    : '- None'

  return `# Lynx Notifications Integration Guide

The CLI generated notifications bootstrap and attempted native setup.

## Missing native directories
${missingDirectoriesSection}

## Missing native files
${missingFilesSection}

## Apply snippets manually

- iOS Podfile snippet: \`.lynx-notifications/snippets/ios.podfile.snippet\`
- Android app Gradle snippet: \`.lynx-notifications/snippets/android.app.build.gradle.snippet\`
- Android root Gradle snippet: \`.lynx-notifications/snippets/android.root.build.gradle.snippet\`

## JS bootstrap

Import and call \`bootstrapNotifications\` from:

- \`src/notifications/bootstrap.ts\`

Typical usage:

\`const token = await Notifications.registerForPushNotificationsAsync();\`
\`Notifications.addNotificationReceivedListener(...)\`
`
}
