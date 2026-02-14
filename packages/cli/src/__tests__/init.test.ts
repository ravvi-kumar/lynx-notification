import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { runInitCommand } from '../commands/init.js'

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
}

const tempDirs: string[] = []

async function makeTempProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'lynx-notifications-cli-'))
  tempDirs.push(dir)
  return dir
}

async function writeLynxPackageJson(cwd: string): Promise<void> {
  await writeFile(
    path.join(cwd, 'package.json'),
    `${JSON.stringify({
      name: 'sample',
      private: true,
      dependencies: {
        '@lynx-js/react': '^0.116.2',
      },
    }, null, 2)}\n`,
    'utf8',
  )
}

afterEach(async () => {
  await Promise.all(tempDirs.map(dir => rm(dir, { recursive: true, force: true })))
  tempDirs.length = 0
})

describe('lynx-notifications init', () => {
  it('creates bootstrap, wires entry, and integration guide when native folders are missing', async () => {
    const cwd = await makeTempProject()
    await mkdir(path.join(cwd, 'src'), { recursive: true })
    await writeFile(path.join(cwd, 'src', 'index.tsx'), 'console.info("entry")\n', 'utf8')
    await writeLynxPackageJson(cwd)

    const result = await runInitCommand(['--skip-install'], cwd, silentLogger)

    expect(result.bootstrapPath).toContain(path.join('src', 'notifications', 'bootstrap.ts'))
    expect(result.entryWired).toBe(true)
    expect(result.entryFilePath).toContain(path.join('src', 'index.tsx'))
    expect(result.integrationGuidePath).toBeDefined()

    const packageJson = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }

    expect(packageJson.dependencies['@lynx-notifications/core']).toBe('^0.1.0-alpha')

    const bootstrap = await readFile(path.join(cwd, 'src', 'notifications', 'bootstrap.ts'), 'utf8')
    expect(bootstrap).toContain('registerForPushNotificationsAsync')

    const entry = await readFile(path.join(cwd, 'src', 'index.tsx'), 'utf8')
    expect(entry).toContain('lynx-notifications-bootstrap')
    expect(entry).toContain("import('./notifications/bootstrap')")

    const appGradleSnippet = await readFile(
      path.join(cwd, '.lynx-notifications', 'snippets', 'android.app.build.gradle.snippet'),
      'utf8',
    )
    expect(appGradleSnippet).toContain('io.lynx.notifications:android-runtime:0.1.0-alpha')

    const manifestPermissionSnippet = await readFile(
      path.join(cwd, '.lynx-notifications', 'snippets', 'android.manifest.permission.snippet'),
      'utf8',
    )
    expect(manifestPermissionSnippet).toContain('android.permission.POST_NOTIFICATIONS')

    const manifestReceiverSnippet = await readFile(
      path.join(cwd, '.lynx-notifications', 'snippets', 'android.manifest.receiver.snippet'),
      'utf8',
    )
    expect(manifestReceiverSnippet).toContain('io.lynx.notifications.android.AndroidNotificationPublisherReceiver')
  })

  it('patches native files and entry idempotently without duplicating marker blocks', async () => {
    const cwd = await makeTempProject()

    await writeLynxPackageJson(cwd)
    await mkdir(path.join(cwd, 'src'), { recursive: true })
    await writeFile(path.join(cwd, 'src', 'index.tsx'), 'console.info("entry")\n', 'utf8')
    await mkdir(path.join(cwd, 'ios'), { recursive: true })
    await mkdir(path.join(cwd, 'android', 'app', 'src', 'main'), { recursive: true })
    await writeFile(path.join(cwd, 'ios', 'Podfile'), 'platform :ios, "16.0"\n', 'utf8')
    await writeFile(path.join(cwd, 'android', 'app', 'build.gradle'), 'plugins {}\n', 'utf8')
    await writeFile(path.join(cwd, 'android', 'build.gradle'), 'allprojects {}\n', 'utf8')
    await writeFile(
      path.join(cwd, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
      `<manifest package="com.example.app">
  <application>
  </application>
</manifest>
`,
      'utf8',
    )

    await runInitCommand(['--skip-install'], cwd, silentLogger)
    await runInitCommand(['--skip-install'], cwd, silentLogger)

    const podfile = await readFile(path.join(cwd, 'ios', 'Podfile'), 'utf8')
    const appGradle = await readFile(path.join(cwd, 'android', 'app', 'build.gradle'), 'utf8')
    const rootGradle = await readFile(path.join(cwd, 'android', 'build.gradle'), 'utf8')
    const manifest = await readFile(path.join(cwd, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8')
    const entry = await readFile(path.join(cwd, 'src', 'index.tsx'), 'utf8')

    expect((podfile.match(/# >>> lynx-notifications-pods/g) ?? []).length).toBe(1)
    expect((appGradle.match(/\/\/ >>> lynx-notifications-dependencies/g) ?? []).length).toBe(1)
    expect((rootGradle.match(/\/\/ >>> lynx-notifications-repositories/g) ?? []).length).toBe(1)
    expect((manifest.match(/<!-- >>> lynx-notifications-permission -->/g) ?? []).length).toBe(1)
    expect((manifest.match(/<!-- >>> lynx-notifications-receiver -->/g) ?? []).length).toBe(1)
    expect((entry.match(/\/\/ >>> lynx-notifications-bootstrap/g) ?? []).length).toBe(1)
    expect(appGradle).toContain('io.lynx.notifications:android-runtime:0.1.0-alpha')
    expect(manifest).toContain('io.lynx.notifications.android.AndroidNotificationPublisherReceiver')
  })

  it('supports --no-wire-entry', async () => {
    const cwd = await makeTempProject()
    await mkdir(path.join(cwd, 'src'), { recursive: true })
    await writeFile(path.join(cwd, 'src', 'index.tsx'), 'console.info("entry")\n', 'utf8')
    await writeLynxPackageJson(cwd)

    const result = await runInitCommand(['--skip-install', '--no-wire-entry'], cwd, silentLogger)
    const entry = await readFile(path.join(cwd, 'src', 'index.tsx'), 'utf8')

    expect(result.entryWired).toBe(false)
    expect(result.entryFilePath).toBeUndefined()
    expect(entry).not.toContain('lynx-notifications-bootstrap')
  })

  it('does not duplicate existing manifest permission or receiver entries without markers', async () => {
    const cwd = await makeTempProject()

    await writeLynxPackageJson(cwd)
    await mkdir(path.join(cwd, 'src'), { recursive: true })
    await writeFile(path.join(cwd, 'src', 'index.tsx'), 'console.info("entry")\n', 'utf8')
    await mkdir(path.join(cwd, 'android', 'app', 'src', 'main'), { recursive: true })
    await writeFile(path.join(cwd, 'android', 'app', 'build.gradle'), 'plugins {}\n', 'utf8')
    await writeFile(path.join(cwd, 'android', 'build.gradle'), 'allprojects {}\n', 'utf8')
    await writeFile(
      path.join(cwd, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
      `<manifest package="com.example.app">
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <application>
    <receiver
      android:name="io.lynx.notifications.android.AndroidNotificationPublisherReceiver"
      android:exported="false" />
  </application>
</manifest>
`,
      'utf8',
    )

    await runInitCommand(['--skip-install', '--platform', 'android'], cwd, silentLogger)
    await runInitCommand(['--skip-install', '--platform', 'android'], cwd, silentLogger)

    const manifest = await readFile(path.join(cwd, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8')
    expect((manifest.match(/android\.permission\.POST_NOTIFICATIONS/g) ?? []).length).toBe(1)
    expect((manifest.match(/io\.lynx\.notifications\.android\.AndroidNotificationPublisherReceiver/g) ?? []).length).toBe(1)
  })

  it('creates manual guidance when --entry path is not found', async () => {
    const cwd = await makeTempProject()
    await mkdir(path.join(cwd, 'src'), { recursive: true })
    await writeLynxPackageJson(cwd)

    const result = await runInitCommand(
      ['--skip-install', '--entry', 'src/custom-entry.tsx'],
      cwd,
      silentLogger,
    )

    expect(result.entryWired).toBe(false)
    expect(result.integrationGuidePath).toBeDefined()

    const guide = await readFile(path.join(cwd, '.lynx-notifications', 'integration-guide.md'), 'utf8')
    expect(guide).toContain('src/custom-entry.tsx')
    expect(guide).toContain('Manual follow-ups')
  })

  it('wires a custom nested entry path with correct relative bootstrap import', async () => {
    const cwd = await makeTempProject()
    await mkdir(path.join(cwd, 'src', 'main'), { recursive: true })
    await writeFile(path.join(cwd, 'src', 'main', 'index.tsx'), 'console.info("entry")\n', 'utf8')
    await writeLynxPackageJson(cwd)

    const result = await runInitCommand(
      ['--skip-install', '--entry', 'src/main/index.tsx'],
      cwd,
      silentLogger,
    )

    expect(result.entryWired).toBe(true)
    expect(result.entryFilePath).toContain(path.join('src', 'main', 'index.tsx'))

    const entry = await readFile(path.join(cwd, 'src', 'main', 'index.tsx'), 'utf8')
    expect(entry).toContain("import('../notifications/bootstrap')")
  })

  it('rejects non-lynx projects', async () => {
    const cwd = await makeTempProject()
    await writeFile(
      path.join(cwd, 'package.json'),
      `${JSON.stringify({
        name: 'not-lynx',
        private: true,
      }, null, 2)}\n`,
      'utf8',
    )

    await expect(runInitCommand(['--skip-install'], cwd, silentLogger)).rejects.toThrow(
      'Missing @lynx-js/react dependency',
    )
  })
})
