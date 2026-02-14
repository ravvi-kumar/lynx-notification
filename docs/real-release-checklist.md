# Real Release Checklist

Use this checklist before promoting beyond `0.1.0-alpha`.

## 1) Repo + CI prerequisites

1. Configure repository secrets:
   - `NPM_TOKEN`
   - `MAVEN_PUBLISH_URL`
   - `MAVEN_PUBLISH_USERNAME`
   - `MAVEN_PUBLISH_PASSWORD`
   - `COCOAPODS_TRUNK_TOKEN`
2. Configure optional repository variables for iOS podspec metadata:
   - `LYNX_NOTIFICATIONS_HOMEPAGE`
   - `LYNX_NOTIFICATIONS_IOS_SOURCE_GIT`
   - `LYNX_NOTIFICATIONS_AUTHOR_NAME`
   - `LYNX_NOTIFICATIONS_AUTHOR_EMAIL`
3. Run baseline checks:
   - `npm run ci:all`
   - `npm run validate:release-config:strict`
   - `npm run release:preflight:publish`

## 2) Native publish dry run

Run `Release Alpha` workflow with:

1. `release_mode=dry-run`
2. `publish_js=true`
3. `publish_native=true`

Expected:

1. Android unit + instrumentation + host-check jobs pass.
2. iOS SwiftPM build/tests pass.
3. CocoaPods lint dry-run passes.
4. npm dry-run publish passes.

## 3) Native real publish

Run `Release Alpha` workflow with:

1. `release_mode=publish`
2. `publish_js=true`
3. `publish_native=true`

Expected:

1. Android artifacts publish to remote Maven.
2. Post-publish remote host-consumption verification passes.
3. iOS pods publish via trunk.
4. npm packages publish with `alpha` tag.

## 4) Device matrix validation

Validate on physical devices:

1. Android 13+ device
2. iOS 16+ device

For each device verify:

1. `requestPermissionsAsync` mapping (`granted` / `denied` / `undetermined`)
2. `registerForPushNotificationsAsync` returns token
3. local notification schedule + receive + tap response
4. cold-start tap path in `getLastNotificationResponseAsync`
5. listener callback fires exactly once per event

Enable native diagnostics during QA with host `InstallationOptions.debugLoggingEnabled=true`.

## 5) Exit criteria

Promote from alpha only when:

1. publish-mode workflow passes end-to-end with production credentials
2. Android + iOS device matrix results are recorded and clean
3. no unresolved severity-1 or severity-2 notification flow issues remain
