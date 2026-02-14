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
  it('creates bootstrap and integration guide when native folders are missing', async () => {
    const cwd = await makeTempProject()
    await mkdir(path.join(cwd, 'src'), { recursive: true })
    await writeLynxPackageJson(cwd)

    const result = await runInitCommand(['--skip-install'], cwd, silentLogger)

    expect(result.bootstrapPath).toContain(path.join('src', 'notifications', 'bootstrap.ts'))
    expect(result.integrationGuidePath).toBeDefined()

    const packageJson = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }

    expect(packageJson.dependencies['@lynx-notifications/core']).toBe('^0.1.0-alpha')

    const bootstrap = await readFile(path.join(cwd, 'src', 'notifications', 'bootstrap.ts'), 'utf8')
    expect(bootstrap).toContain('registerForPushNotificationsAsync')
  })

  it('patches native files idempotently without duplicating marker blocks', async () => {
    const cwd = await makeTempProject()

    await writeLynxPackageJson(cwd)
    await mkdir(path.join(cwd, 'src'), { recursive: true })
    await mkdir(path.join(cwd, 'ios'), { recursive: true })
    await mkdir(path.join(cwd, 'android', 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'ios', 'Podfile'), 'platform :ios, "16.0"\n', 'utf8')
    await writeFile(path.join(cwd, 'android', 'app', 'build.gradle'), 'plugins {}\n', 'utf8')
    await writeFile(path.join(cwd, 'android', 'build.gradle'), 'allprojects {}\n', 'utf8')

    await runInitCommand(['--skip-install'], cwd, silentLogger)
    await runInitCommand(['--skip-install'], cwd, silentLogger)

    const podfile = await readFile(path.join(cwd, 'ios', 'Podfile'), 'utf8')
    const appGradle = await readFile(path.join(cwd, 'android', 'app', 'build.gradle'), 'utf8')
    const rootGradle = await readFile(path.join(cwd, 'android', 'build.gradle'), 'utf8')

    expect((podfile.match(/# >>> lynx-notifications-pods/g) ?? []).length).toBe(1)
    expect((appGradle.match(/\/\/ >>> lynx-notifications-dependencies/g) ?? []).length).toBe(1)
    expect((rootGradle.match(/\/\/ >>> lynx-notifications-repositories/g) ?? []).length).toBe(1)
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
