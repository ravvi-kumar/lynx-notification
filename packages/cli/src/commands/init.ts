import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  ANDROID_APP_DEPS_MARKERS,
  ANDROID_MANIFEST_PERMISSION_MARKERS,
  ANDROID_MANIFEST_RECEIVER_MARKERS,
  ANDROID_ROOT_REPO_MARKERS,
  CORE_PACKAGE_NAME,
  CORE_VERSION_RANGE,
  ENTRY_BOOTSTRAP_MARKERS,
  IOS_PODFILE_MARKERS,
  createAndroidAppGradleSnippet,
  createAndroidManifestPermissionSnippet,
  createAndroidManifestReceiverSnippet,
  createAndroidRootGradleSnippet,
  createBootstrapTemplate,
  createEntryBootstrapSnippet,
  createIntegrationGuide,
  createIosPodfileSnippet,
} from '../lib/templates.js'
import { upsertManagedBlock } from '../lib/markers.js'

export type Platform = 'ios' | 'android'

export interface Logger {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

export interface InitResult {
  bootstrapPath: string
  entryFilePath?: string
  entryWired: boolean
  dependencyInstalled: boolean
  patchedFiles: string[]
  integrationGuidePath?: string
}

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

type PackageJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

function parsePlatforms(raw?: string): Platform[] {
  if (!raw) {
    return ['ios', 'android']
  }

  const entries = raw
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean)

  const unique = new Set<Platform>()

  for (const entry of entries) {
    if (entry === 'ios' || entry === 'android') {
      unique.add(entry)
      continue
    }

    throw new Error(`Unsupported platform "${entry}". Supported platforms are ios,android.`)
  }

  if (unique.size === 0) {
    throw new Error('At least one platform must be selected.')
  }

  return [...unique]
}

function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(path.join(cwd, 'bun.lock')) || existsSync(path.join(cwd, 'bun.lockb'))) {
    return 'bun'
  }

  if (existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }

  if (existsSync(path.join(cwd, 'yarn.lock'))) {
    return 'yarn'
  }

  return 'npm'
}

function getInstallCommand(packageManager: PackageManager, target: string): {
  command: string
  args: string[]
} {
  if (packageManager === 'pnpm') {
    return {
      command: 'pnpm',
      args: ['add', target],
    }
  }

  if (packageManager === 'yarn') {
    return {
      command: 'yarn',
      args: ['add', target],
    }
  }

  if (packageManager === 'bun') {
    return {
      command: 'bun',
      args: ['add', target],
    }
  }

  return {
    command: 'npm',
    args: ['install', target],
  }
}

async function writeFileIfChanged(filePath: string, content: string): Promise<boolean> {
  const normalized = content.endsWith('\n')
    ? content
    : `${content}\n`

  const existing = existsSync(filePath)
    ? await readFile(filePath, 'utf8')
    : null

  if (existing === normalized) {
    return false
  }

  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, normalized, 'utf8')
  return true
}

async function readPackageJson(packageJsonPath: string): Promise<PackageJson> {
  const raw = await readFile(packageJsonPath, 'utf8')
  return JSON.parse(raw) as PackageJson
}

function isLynxProject(packageJson: PackageJson): boolean {
  return Boolean(
    packageJson.dependencies?.['@lynx-js/react']
    || packageJson.devDependencies?.['@lynx-js/react'],
  )
}

async function ensureCoreDependencyInManifest(packageJsonPath: string): Promise<boolean> {
  const packageJson = await readPackageJson(packageJsonPath)
  const dependencies = {
    ...(packageJson.dependencies ?? {}),
  }

  if (dependencies[CORE_PACKAGE_NAME]) {
    return false
  }

  dependencies[CORE_PACKAGE_NAME] = CORE_VERSION_RANGE

  const sortedDependencies = Object.fromEntries(
    Object.entries(dependencies).sort(([left], [right]) => left.localeCompare(right)),
  )

  const updated = {
    ...packageJson,
    dependencies: sortedDependencies,
  }

  await writeFile(packageJsonPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8')
  return true
}

function installCoreDependency(cwd: string): void {
  const target = `${CORE_PACKAGE_NAME}@${CORE_VERSION_RANGE}`
  const packageManager = detectPackageManager(cwd)
  const command = getInstallCommand(packageManager, target)
  const result = spawnSync(command.command, command.args, {
    cwd,
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`Dependency installation failed with exit code ${result.status}.`)
  }
}

async function patchIosProject(cwd: string, patchedFiles: string[]): Promise<string[]> {
  const missingFiles: string[] = []
  const podfilePath = path.join(cwd, 'ios', 'Podfile')

  if (!existsSync(podfilePath)) {
    missingFiles.push('ios/Podfile')
    return missingFiles
  }

  const source = await readFile(podfilePath, 'utf8')
  const updated = upsertManagedBlock(source, {
    startMarker: IOS_PODFILE_MARKERS.start,
    endMarker: IOS_PODFILE_MARKERS.end,
    content: createIosPodfileSnippet().trimEnd(),
  })

  const changed = await writeFileIfChanged(podfilePath, updated)
  if (changed) {
    patchedFiles.push('ios/Podfile')
  }

  return missingFiles
}

async function patchAndroidProject(cwd: string, patchedFiles: string[]): Promise<string[]> {
  const missingFiles: string[] = []

  const appGradleCandidates = [
    path.join(cwd, 'android', 'app', 'build.gradle'),
    path.join(cwd, 'android', 'app', 'build.gradle.kts'),
  ]
  const rootGradleCandidates = [
    path.join(cwd, 'android', 'build.gradle'),
    path.join(cwd, 'android', 'build.gradle.kts'),
    path.join(cwd, 'android', 'settings.gradle'),
    path.join(cwd, 'android', 'settings.gradle.kts'),
  ]
  const manifestPath = path.join(cwd, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')

  const appGradlePath = appGradleCandidates.find(candidate => existsSync(candidate))
  const rootGradlePath = rootGradleCandidates.find(candidate => existsSync(candidate))

  if (!appGradlePath) {
    missingFiles.push('android/app/build.gradle(.kts)')
  } else {
    const appSource = await readFile(appGradlePath, 'utf8')
    const appUpdated = upsertManagedBlock(appSource, {
      startMarker: ANDROID_APP_DEPS_MARKERS.start,
      endMarker: ANDROID_APP_DEPS_MARKERS.end,
      content: createAndroidAppGradleSnippet().trimEnd(),
    })

    const changed = await writeFileIfChanged(appGradlePath, appUpdated)
    if (changed) {
      patchedFiles.push(path.relative(cwd, appGradlePath))
    }
  }

  if (!rootGradlePath) {
    missingFiles.push('android/build.gradle(.kts) or android/settings.gradle(.kts)')
  } else {
    const rootSource = await readFile(rootGradlePath, 'utf8')
    const rootUpdated = upsertManagedBlock(rootSource, {
      startMarker: ANDROID_ROOT_REPO_MARKERS.start,
      endMarker: ANDROID_ROOT_REPO_MARKERS.end,
      content: createAndroidRootGradleSnippet().trimEnd(),
    })

    const changed = await writeFileIfChanged(rootGradlePath, rootUpdated)
    if (changed) {
      patchedFiles.push(path.relative(cwd, rootGradlePath))
    }
  }

  if (!existsSync(manifestPath)) {
    missingFiles.push('android/app/src/main/AndroidManifest.xml')
  } else {
    const manifestSource = await readFile(manifestPath, 'utf8')
    const manifestUpdated = upsertAndroidManifest(manifestSource)

    const changed = await writeFileIfChanged(manifestPath, manifestUpdated)
    if (changed) {
      patchedFiles.push(path.relative(cwd, manifestPath))
    }
  }

  return missingFiles
}

function indentBlock(content: string, indent: string): string {
  return content
    .split('\n')
    .map(line => `${indent}${line}`)
    .join('\n')
}

function upsertAndroidManifest(source: string): string {
  const withPermission = upsertAndroidManifestPermission(source)
  return upsertAndroidManifestReceiver(withPermission)
}

function upsertAndroidManifestPermission(source: string): string {
  const normalizedSource = source.replace(/\s+$/, '')
  const permissionBlock = `${ANDROID_MANIFEST_PERMISSION_MARKERS.start}
${createAndroidManifestPermissionSnippet().trimEnd()}
${ANDROID_MANIFEST_PERMISSION_MARKERS.end}`

  if (
    normalizedSource.includes(ANDROID_MANIFEST_PERMISSION_MARKERS.start)
    && normalizedSource.includes(ANDROID_MANIFEST_PERMISSION_MARKERS.end)
  ) {
    return upsertManagedBlock(normalizedSource, {
      startMarker: ANDROID_MANIFEST_PERMISSION_MARKERS.start,
      endMarker: ANDROID_MANIFEST_PERMISSION_MARKERS.end,
      content: createAndroidManifestPermissionSnippet().trimEnd(),
    })
  }

  if (normalizedSource.includes('android.permission.POST_NOTIFICATIONS')) {
    return `${normalizedSource}\n`
  }

  const applicationOpenPattern = /^(\s*)<application(?:\s|>)/m
  const match = normalizedSource.match(applicationOpenPattern)
  if (match) {
    const childIndent = match[1]
    const indentedBlock = indentBlock(permissionBlock, childIndent)
    const updated = normalizedSource.replace(applicationOpenPattern, `${indentedBlock}\n${match[0]}`)
    return `${updated}\n`
  }

  return upsertManagedBlock(normalizedSource, {
    startMarker: ANDROID_MANIFEST_PERMISSION_MARKERS.start,
    endMarker: ANDROID_MANIFEST_PERMISSION_MARKERS.end,
    content: createAndroidManifestPermissionSnippet().trimEnd(),
  })
}

function upsertAndroidManifestReceiver(source: string): string {
  const normalizedSource = source.replace(/\s+$/, '')
  const receiverBlock = `${ANDROID_MANIFEST_RECEIVER_MARKERS.start}
${createAndroidManifestReceiverSnippet().trimEnd()}
${ANDROID_MANIFEST_RECEIVER_MARKERS.end}`

  if (
    normalizedSource.includes(ANDROID_MANIFEST_RECEIVER_MARKERS.start)
    && normalizedSource.includes(ANDROID_MANIFEST_RECEIVER_MARKERS.end)
  ) {
    return upsertManagedBlock(normalizedSource, {
      startMarker: ANDROID_MANIFEST_RECEIVER_MARKERS.start,
      endMarker: ANDROID_MANIFEST_RECEIVER_MARKERS.end,
      content: createAndroidManifestReceiverSnippet().trimEnd(),
    })
  }

  if (normalizedSource.includes('io.lynx.notifications.android.AndroidNotificationPublisherReceiver')) {
    return `${normalizedSource}\n`
  }

  const applicationClosePattern = /^(\s*)<\/application>/m
  const match = normalizedSource.match(applicationClosePattern)
  if (match) {
    const childIndent = `${match[1]}  `
    const indentedBlock = indentBlock(receiverBlock, childIndent)
    const updated = normalizedSource.replace(applicationClosePattern, `${indentedBlock}\n${match[1]}</application>`)
    return `${updated}\n`
  }

  return upsertManagedBlock(normalizedSource, {
    startMarker: ANDROID_MANIFEST_RECEIVER_MARKERS.start,
    endMarker: ANDROID_MANIFEST_RECEIVER_MARKERS.end,
    content: createAndroidManifestReceiverSnippet().trimEnd(),
  })
}

function findEntryFile(cwd: string, entryArg?: string): string | null {
  if (entryArg) {
    const resolved = path.isAbsolute(entryArg)
      ? entryArg
      : path.join(cwd, entryArg)

    return existsSync(resolved) ? resolved : null
  }

  const entryCandidates = [
    path.join(cwd, 'src', 'index.tsx'),
    path.join(cwd, 'src', 'index.ts'),
    path.join(cwd, 'src', 'index.jsx'),
    path.join(cwd, 'src', 'index.js'),
    path.join(cwd, 'src', 'main.tsx'),
    path.join(cwd, 'src', 'main.ts'),
    path.join(cwd, 'src', 'main.jsx'),
    path.join(cwd, 'src', 'main.js'),
  ]

  return entryCandidates.find(candidate => existsSync(candidate)) ?? null
}

async function wireEntryFile(
  cwd: string,
  entryFilePath: string,
  bootstrapPath: string,
  patchedFiles: string[],
): Promise<boolean> {
  const entryDirectory = path.dirname(entryFilePath)
  const relativeImportPath = path.relative(entryDirectory, bootstrapPath)
  const normalizedImportPath = relativeImportPath.split(path.sep).join('/')
  const bootstrapImportPath = normalizedImportPath.startsWith('.')
    ? normalizedImportPath
    : `./${normalizedImportPath}`
  const extensionlessImportPath = bootstrapImportPath.replace(/\.[jt]sx?$/i, '')

  const source = await readFile(entryFilePath, 'utf8')
  const updated = upsertManagedBlock(source, {
    startMarker: ENTRY_BOOTSTRAP_MARKERS.start,
    endMarker: ENTRY_BOOTSTRAP_MARKERS.end,
    content: createEntryBootstrapSnippet(extensionlessImportPath),
  })
  const changed = await writeFileIfChanged(entryFilePath, updated)
  if (changed) {
    patchedFiles.push(path.relative(cwd, entryFilePath))
  }

  return true
}

async function writeManualSnippets(cwd: string): Promise<void> {
  const snippetsRoot = path.join(cwd, '.lynx-notifications', 'snippets')
  await writeFileIfChanged(
    path.join(snippetsRoot, 'ios.podfile.snippet'),
    createIosPodfileSnippet(),
  )
  await writeFileIfChanged(
    path.join(snippetsRoot, 'android.app.build.gradle.snippet'),
    createAndroidAppGradleSnippet(),
  )
  await writeFileIfChanged(
    path.join(snippetsRoot, 'android.root.build.gradle.snippet'),
    createAndroidRootGradleSnippet(),
  )
  await writeFileIfChanged(
    path.join(snippetsRoot, 'android.manifest.permission.snippet'),
    createAndroidManifestPermissionSnippet(),
  )
  await writeFileIfChanged(
    path.join(snippetsRoot, 'android.manifest.receiver.snippet'),
    createAndroidManifestReceiverSnippet(),
  )
}

export async function runInitCommand(
  rawArgs: string[],
  cwd: string = process.cwd(),
  logger: Logger = console,
): Promise<InitResult> {
  let provider = 'fcm'
  let skipInstall = false
  let wireEntry = true
  let entryArg: string | undefined
  let platformArg: string | undefined

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (arg === '--provider') {
      provider = rawArgs[index + 1] ?? ''
      index += 1
      continue
    }

    if (arg.startsWith('--provider=')) {
      provider = arg.split('=')[1] ?? ''
      continue
    }

    if (arg === '--platform') {
      platformArg = rawArgs[index + 1]
      index += 1
      continue
    }

    if (arg.startsWith('--platform=')) {
      platformArg = arg.split('=')[1]
      continue
    }

    if (arg === '--skip-install') {
      skipInstall = true
      continue
    }

    if (arg === '--no-wire-entry') {
      wireEntry = false
      continue
    }

    if (arg === '--entry') {
      entryArg = rawArgs[index + 1]
      index += 1
      continue
    }

    if (arg.startsWith('--entry=')) {
      entryArg = arg.split('=')[1]
      continue
    }

    throw new Error(`Unknown option "${arg}".`)
  }

  if (provider !== 'fcm') {
    throw new Error(`Unsupported provider "${provider}". Only "fcm" is supported in v1.`)
  }

  const platforms = parsePlatforms(platformArg)
  const packageJsonPath = path.join(cwd, 'package.json')

  if (!existsSync(packageJsonPath)) {
    throw new Error('No package.json was found in the current directory.')
  }

  const packageJson = await readPackageJson(packageJsonPath)
  if (!isLynxProject(packageJson)) {
    throw new Error('This is not a Lynx project. Missing @lynx-js/react dependency.')
  }

  if (skipInstall) {
    await ensureCoreDependencyInManifest(packageJsonPath)
    logger.info(`Added ${CORE_PACKAGE_NAME} to package.json dependencies.`)
  } else {
    logger.info(`Installing ${CORE_PACKAGE_NAME}...`)
    installCoreDependency(cwd)
  }

  const bootstrapPath = path.join(cwd, 'src', 'notifications', 'bootstrap.ts')
  await writeFileIfChanged(bootstrapPath, createBootstrapTemplate())

  const patchedFiles: string[] = []
  const manualSteps: string[] = []
  const missingNativeDirectories: string[] = []
  const missingNativeFiles: string[] = []
  const entryFilePath = wireEntry ? findEntryFile(cwd, entryArg) : undefined
  let entryWired = false

  if (wireEntry) {
    if (entryFilePath) {
      entryWired = await wireEntryFile(cwd, entryFilePath, bootstrapPath, patchedFiles)
    } else {
      const entryLabel = entryArg
        ? entryArg
        : 'src/index.tsx'
      manualSteps.push(`Wire bootstrap manually in ${entryLabel}. Add and call bootstrapNotifications from src/notifications/bootstrap.ts.`)
      logger.warn('Could not find an entry file to auto-wire notifications bootstrap.')
    }
  }

  for (const platform of platforms) {
    const platformPath = path.join(cwd, platform)

    if (!existsSync(platformPath)) {
      missingNativeDirectories.push(platform)
      continue
    }

    if (platform === 'ios') {
      const missingFiles = await patchIosProject(cwd, patchedFiles)
      missingNativeFiles.push(...missingFiles)
      continue
    }

    const missingFiles = await patchAndroidProject(cwd, patchedFiles)
    missingNativeFiles.push(...missingFiles)
  }

  let integrationGuidePath: string | undefined
  if (
    missingNativeDirectories.length > 0
    || missingNativeFiles.length > 0
    || manualSteps.length > 0
  ) {
    await writeManualSnippets(cwd)

    integrationGuidePath = path.join(cwd, '.lynx-notifications', 'integration-guide.md')
    await writeFileIfChanged(
      integrationGuidePath,
      createIntegrationGuide({
        missingNativeDirectories,
        missingNativeFiles,
        manualSteps,
      }),
    )

    logger.warn('Native project setup requires manual steps. See .lynx-notifications/integration-guide.md.')
  }

  logger.info('Lynx notifications init completed.')

  return {
    bootstrapPath,
    entryFilePath: entryFilePath ?? undefined,
    entryWired,
    dependencyInstalled: !skipInstall,
    patchedFiles,
    integrationGuidePath,
  }
}
