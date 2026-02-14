#!/usr/bin/env node

import { runInitCommand } from './commands/init.js'

function printHelp(): void {
  console.log(`lynx-notifications

Usage:
  lynx-notifications init [--provider fcm] [--platform ios,android] [--skip-install]

Commands:
  init      Scaffold notifications bootstrap and native integration markers.
`)
}

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv

  if (!command || command === '--help' || command === '-h') {
    printHelp()
    return
  }

  if (command !== 'init') {
    throw new Error(`Unknown command "${command}".`)
  }

  await runInitCommand(args)
}

main().catch(error => {
  const message = error instanceof Error
    ? error.message
    : String(error)
  console.error(`[lynx-notifications] ${message}`)
  process.exitCode = 1
})
