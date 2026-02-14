# Android Host Check

This module verifies host-side Gradle consumption of published native artifacts from `mavenLocal`:

- `io.lynx.notifications:core`
- `io.lynx.notifications:android-runtime`
- `io.lynx.notifications:fcm`

CI uses this project to catch dependency metadata and transitive packaging issues before release.
