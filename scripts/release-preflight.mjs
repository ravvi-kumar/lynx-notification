import process from 'node:process'

const publishMode = process.argv.includes('--publish')

const requiredForPublish = [
  'NPM_TOKEN',
  'MAVEN_PUBLISH_URL',
  'MAVEN_PUBLISH_USERNAME',
  'MAVEN_PUBLISH_PASSWORD',
  'COCOAPODS_TRUNK_TOKEN',
]

const optionalMetadata = [
  'LYNX_NOTIFICATIONS_HOMEPAGE',
  'LYNX_NOTIFICATIONS_IOS_SOURCE_GIT',
  'LYNX_NOTIFICATIONS_AUTHOR_NAME',
  'LYNX_NOTIFICATIONS_AUTHOR_EMAIL',
]

function hasNonEmpty(name) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim().length > 0
}

const missingRequired = []
for (const name of requiredForPublish) {
  if (publishMode && !hasNonEmpty(name)) {
    missingRequired.push(name)
  }
}

const missingOptional = []
for (const name of optionalMetadata) {
  if (!hasNonEmpty(name)) {
    missingOptional.push(name)
  }
}

if (publishMode) {
  if (missingRequired.length > 0) {
    console.error('[release-preflight] Missing required publish variables:')
    for (const name of missingRequired) {
      console.error(`- ${name}`)
    }
    process.exitCode = 1
  } else {
    console.log('[release-preflight] Required publish variables are set.')
  }
} else {
  console.log('[release-preflight] Dry-run mode selected. Required publish variables are not enforced.')
}

if (missingOptional.length > 0) {
  console.warn('[release-preflight] Optional podspec metadata variables not set:')
  for (const name of missingOptional) {
    console.warn(`- ${name}`)
  }
  console.warn('[release-preflight] Defaults in podspec will be used.')
} else {
  console.log('[release-preflight] Optional podspec metadata variables are set.')
}

if (process.exitCode !== 1) {
  console.log('[release-preflight] OK')
}
