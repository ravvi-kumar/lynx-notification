import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const strict = process.argv.includes('--strict')
const rootDir = process.cwd()

const errors = []
const warnings = []

function addError(message) {
  errors.push(message)
}

function addWarning(message) {
  warnings.push(message)
}

function addIssue(message) {
  if (strict) {
    addError(message)
  } else {
    addWarning(message)
  }
}

async function readText(relativePath) {
  const absolutePath = path.join(rootDir, relativePath)
  return readFile(absolutePath, 'utf8')
}

function extractOrFail({ source, pattern, label, file }) {
  const match = source.match(pattern)
  if (!match) {
    addError(`${file}: missing ${label}`)
    return null
  }
  return match[1]
}

function assertEqualVersion({ file, label, actual, expected }) {
  if (actual !== expected) {
    addError(`${file}: ${label} "${actual}" does not match expected "${expected}"`)
  }
}

function printSummary() {
  if (warnings.length > 0) {
    console.warn('[validate-native-release] warnings:')
    for (const warning of warnings) {
      console.warn(`- ${warning}`)
    }
  }

  if (errors.length > 0) {
    console.error('[validate-native-release] errors:')
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    process.exitCode = 1
    return
  }

  console.log(`[validate-native-release] OK (${strict ? 'strict' : 'standard'} mode)`)
}

async function validate() {
  const corePackageJsonPath = 'packages/core/package.json'
  const cliPackageJsonPath = 'packages/cli/package.json'
  const templatesPath = 'packages/cli/src/lib/templates.ts'

  const androidCoreGradlePath = 'native/android/core/build.gradle'
  const androidRuntimeGradlePath = 'native/android/runtime/build.gradle'
  const androidFcmGradlePath = 'native/android/fcm/build.gradle'
  const androidHostCheckGradlePath = 'native/android/host-check/build.gradle'

  const iosCorePodspecPath = 'native/ios/LynxNotificationsCore.podspec'
  const iosFcmPodspecPath = 'native/ios/LynxNotificationsFCM.podspec'

  const corePackageJson = JSON.parse(await readText(corePackageJsonPath))
  const cliPackageJson = JSON.parse(await readText(cliPackageJsonPath))
  const templatesSource = await readText(templatesPath)

  const androidCoreGradle = await readText(androidCoreGradlePath)
  const androidRuntimeGradle = await readText(androidRuntimeGradlePath)
  const androidFcmGradle = await readText(androidFcmGradlePath)
  const androidHostCheckGradle = await readText(androidHostCheckGradlePath)

  const iosCorePodspec = await readText(iosCorePodspecPath)
  const iosFcmPodspec = await readText(iosFcmPodspecPath)

  const expectedVersion = corePackageJson.version
  if (!expectedVersion) {
    addError(`${corePackageJsonPath}: missing version`)
    printSummary()
    return
  }

  const cliVersion = cliPackageJson.version
  if (!cliVersion) {
    addError(`${cliPackageJsonPath}: missing version`)
  } else {
    assertEqualVersion({
      file: cliPackageJsonPath,
      label: 'version',
      actual: cliVersion,
      expected: expectedVersion,
    })
  }

  const cliCoreVersionRange = extractOrFail({
    source: templatesSource,
    pattern: /CORE_VERSION_RANGE\s*=\s*['"]\^([^'"]+)['"]/,
    label: 'CORE_VERSION_RANGE',
    file: templatesPath,
  })
  if (cliCoreVersionRange) {
    assertEqualVersion({
      file: templatesPath,
      label: 'CORE_VERSION_RANGE',
      actual: cliCoreVersionRange,
      expected: expectedVersion,
    })
  }

  const androidCoreVersion = extractOrFail({
    source: androidCoreGradle,
    pattern: /^\s*version\s*=\s*['"]([^'"]+)['"]/m,
    label: 'version',
    file: androidCoreGradlePath,
  })
  if (androidCoreVersion) {
    assertEqualVersion({
      file: androidCoreGradlePath,
      label: 'version',
      actual: androidCoreVersion,
      expected: expectedVersion,
    })
  }

  const androidRuntimeVersion = extractOrFail({
    source: androidRuntimeGradle,
    pattern: /^\s*version\s*=\s*['"]([^'"]+)['"]/m,
    label: 'version',
    file: androidRuntimeGradlePath,
  })
  if (androidRuntimeVersion) {
    assertEqualVersion({
      file: androidRuntimeGradlePath,
      label: 'version',
      actual: androidRuntimeVersion,
      expected: expectedVersion,
    })
  }

  const androidFcmVersion = extractOrFail({
    source: androidFcmGradle,
    pattern: /^\s*version\s*=\s*['"]([^'"]+)['"]/m,
    label: 'version',
    file: androidFcmGradlePath,
  })
  if (androidFcmVersion) {
    assertEqualVersion({
      file: androidFcmGradlePath,
      label: 'version',
      actual: androidFcmVersion,
      expected: expectedVersion,
    })
  }

  const hostCheckDefaultVersion = extractOrFail({
    source: androidHostCheckGradle,
    pattern: /def notificationsVersion =[\s\S]*?\?:\s*['"]([^'"]+)['"]/m,
    label: 'notificationsVersion default',
    file: androidHostCheckGradlePath,
  })
  if (hostCheckDefaultVersion) {
    assertEqualVersion({
      file: androidHostCheckGradlePath,
      label: 'notificationsVersion default',
      actual: hostCheckDefaultVersion,
      expected: expectedVersion,
    })
  }

  const iosCoreVersion = extractOrFail({
    source: iosCorePodspec,
    pattern: /spec\.version\s*=\s*['"]([^'"]+)['"]/,
    label: 'spec.version',
    file: iosCorePodspecPath,
  })
  if (iosCoreVersion) {
    assertEqualVersion({
      file: iosCorePodspecPath,
      label: 'spec.version',
      actual: iosCoreVersion,
      expected: expectedVersion,
    })
  }

  const iosFcmVersion = extractOrFail({
    source: iosFcmPodspec,
    pattern: /spec\.version\s*=\s*['"]([^'"]+)['"]/,
    label: 'spec.version',
    file: iosFcmPodspecPath,
  })
  if (iosFcmVersion) {
    assertEqualVersion({
      file: iosFcmPodspecPath,
      label: 'spec.version',
      actual: iosFcmVersion,
      expected: expectedVersion,
    })
  }

  if (!templatesSource.includes(`io.lynx.notifications:core:${expectedVersion}`)) {
    addError(`${templatesPath}: missing expected core artifact version ${expectedVersion}`)
  }
  if (!templatesSource.includes(`io.lynx.notifications:fcm:${expectedVersion}`)) {
    addError(`${templatesPath}: missing expected fcm artifact version ${expectedVersion}`)
  }
  if (!templatesSource.includes(`io.lynx.notifications:android-runtime:${expectedVersion}`)) {
    addError(`${templatesPath}: missing expected android-runtime artifact version ${expectedVersion}`)
  }

  const placeholderPatterns = [
    /example\.com/i,
    /github\.com\/example\//i,
    /dev@example\.com/i,
  ]

  for (const pattern of placeholderPatterns) {
    if (pattern.test(iosCorePodspec)) {
      addIssue(`${iosCorePodspecPath}: placeholder metadata pattern "${pattern}" must be replaced before release`)
    }

    if (pattern.test(iosFcmPodspec)) {
      addIssue(`${iosFcmPodspecPath}: placeholder metadata pattern "${pattern}" must be replaced before release`)
    }
  }

  printSummary()
}

await validate()
