import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'

function usageAndExit(message) {
  if (message) {
    console.error(`[workspace-runner] ${message}`)
  }
  console.error('Usage: node scripts/run-workspace-script.mjs <script> <workspaceDir> [workspaceDir...]')
  process.exit(1)
}

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent ?? ''
  const execPath = process.env.npm_execpath ?? ''

  if (userAgent.startsWith('bun/') || execPath.includes('bun')) {
    return 'bun'
  }
  if (userAgent.startsWith('pnpm/') || execPath.includes('pnpm')) {
    return 'pnpm'
  }
  if (userAgent.startsWith('yarn/') || execPath.includes('yarn')) {
    return 'yarn'
  }
  return 'npm'
}

function commandForScript(packageManager, scriptName) {
  switch (packageManager) {
    case 'bun':
      return { command: 'bun', args: ['run', scriptName] }
    case 'pnpm':
      return { command: 'pnpm', args: ['run', scriptName] }
    case 'yarn':
      return { command: 'yarn', args: [scriptName] }
    default:
      return { command: 'npm', args: ['run', scriptName] }
  }
}

async function run() {
  const [scriptName, ...workspaceArgs] = process.argv.slice(2)

  if (!scriptName) {
    usageAndExit('Missing <script> argument.')
  }
  if (workspaceArgs.length === 0) {
    usageAndExit('Missing <workspaceDir> arguments.')
  }

  const packageManager = detectPackageManager()

  for (const workspaceArg of workspaceArgs) {
    const workspaceDir = path.resolve(process.cwd(), workspaceArg)

    await new Promise((resolve, reject) => {
      const packageJsonPath = path.join(workspaceDir, 'package.json')
      if (!existsSync(packageJsonPath)) {
        reject(new Error(`No package.json found in workspace: ${workspaceDir}`))
        return
      }

      let packageJson
      try {
        packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
      } catch {
        reject(new Error(`Could not parse package.json: ${packageJsonPath}`))
        return
      }

      const scripts = packageJson?.scripts ?? {}
      if (!Object.prototype.hasOwnProperty.call(scripts, scriptName)) {
        console.log(`[workspace-runner] Skipping ${workspaceArg} (missing script "${scriptName}")`)
        resolve()
        return
      }

      const { command, args } = commandForScript(packageManager, scriptName)
      console.log(`[workspace-runner] ${workspaceArg}: ${command} ${args.join(' ')}`)

      const child = spawn(command, args, {
        cwd: workspaceDir,
        stdio: 'inherit',
        env: process.env,
        shell: process.platform === 'win32',
      })

      child.on('exit', code => {
        if (code === 0) {
          resolve()
          return
        }
        reject(new Error(`Script "${scriptName}" failed in ${workspaceArg} with exit code ${code ?? 1}`))
      })
    }).catch(error => {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[workspace-runner] ${message}`)
      process.exit(1)
    })
  }
}

void run()
