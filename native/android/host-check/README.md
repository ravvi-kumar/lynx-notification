# Android Host Check

This module verifies host-side Gradle consumption of published native artifacts from `mavenLocal` or a remote Maven repository:

- `io.lynx.notifications:core`
- `io.lynx.notifications:android-runtime`
- `io.lynx.notifications:fcm`

CI uses this project to catch dependency metadata and transitive packaging issues before release.

## Local Maven verification

```bash
gradle -p native/android/host-check assembleDebug
```

## Remote Maven verification

```bash
gradle -p native/android/host-check \
  -PlynxNotificationsUseMavenLocal=false \
  -PlynxNotificationsMavenUrl=https://your.maven.repo/repository/releases \
  -PlynxNotificationsMavenUsername=... \
  -PlynxNotificationsMavenPassword=... \
  -PlynxNotificationsVersion=0.1.0-alpha \
  assembleDebug
```
