import { createSign } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

function printUsageAndExit(message) {
  if (message) {
    console.error(`[push:test:android] ${message}`)
  }
  console.error('Usage:')
  console.error(
    '  npm run push:test:android -- --token <FCM_TOKEN> --service-account </abs/path/service-account.json> [--title <title>] [--body <body>] [--data k=v] [--dry-run]'
  )
  process.exit(1)
}

function parseArgs(argv) {
  const parsed = {
    token: '',
    serviceAccount: '',
    title: 'Lynx Push Test',
    body: 'Remote push test from local script.',
    dryRun: false,
    data: {},
  }

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    const next = argv[index + 1]

    switch (flag) {
      case '--token':
        if (!next) {
          printUsageAndExit('Missing value for --token')
        }
        parsed.token = next.trim()
        index += 1
        break
      case '--service-account':
        if (!next) {
          printUsageAndExit('Missing value for --service-account')
        }
        parsed.serviceAccount = next.trim()
        index += 1
        break
      case '--title':
        if (!next) {
          printUsageAndExit('Missing value for --title')
        }
        parsed.title = next
        index += 1
        break
      case '--body':
        if (!next) {
          printUsageAndExit('Missing value for --body')
        }
        parsed.body = next
        index += 1
        break
      case '--data':
        if (!next) {
          printUsageAndExit('Missing value for --data')
        }
        if (!next.includes('=')) {
          printUsageAndExit('Expected --data in key=value format')
        }
        {
          const splitIndex = next.indexOf('=')
          const key = next.slice(0, splitIndex).trim()
          const value = next.slice(splitIndex + 1).trim()
          if (!key) {
            printUsageAndExit('Data key in --data cannot be empty')
          }
          parsed.data[key] = value
        }
        index += 1
        break
      case '--dry-run':
        parsed.dryRun = true
        break
      default:
        printUsageAndExit(`Unknown argument: ${flag}`)
    }
  }

  if (!parsed.token) {
    printUsageAndExit('Missing required --token')
  }

  if (!parsed.serviceAccount) {
    printUsageAndExit('Missing required --service-account')
  }

  return parsed
}

async function readServiceAccountFile(filePath) {
  const absolutePath = path.resolve(filePath)
  const source = await readFile(absolutePath, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(source)
  } catch (error) {
    throw new Error(`Invalid JSON in service account file: ${absolutePath}`)
  }

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error(
      `Service account file is missing required fields (project_id/client_email/private_key): ${absolutePath}`
    )
  }

  return parsed
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function signJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000)
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: serviceAccount.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encodedHeader = toBase64Url(JSON.stringify(header))
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  const signer = createSign('RSA-SHA256')
  signer.update(unsignedToken)
  signer.end()
  const signature = signer.sign(serviceAccount.private_key)
  const encodedSignature = signature
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

  return `${unsignedToken}.${encodedSignature}`
}

async function requestAccessToken(serviceAccount) {
  const assertion = signJwt(serviceAccount)
  const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token'
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  })

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const text = await response.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch (error) {
    throw new Error(`OAuth token response was not valid JSON (status=${response.status})`)
  }

  if (!response.ok) {
    throw new Error(
      `OAuth token request failed (status=${response.status}): ${payload.error_description || payload.error || text}`
    )
  }

  if (!payload.access_token) {
    throw new Error('OAuth token response did not contain access_token')
  }

  return payload.access_token
}

async function sendFcmMessage({ accessToken, projectId, message, dryRun }) {
  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      validate_only: dryRun,
      message,
    }),
  })

  const text = await response.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch (error) {
    throw new Error(`FCM response was not valid JSON (status=${response.status})`)
  }

  if (!response.ok) {
    const details = payload?.error?.message || text
    throw new Error(`FCM send failed (status=${response.status}): ${details}`)
  }

  return payload
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const serviceAccount = await readServiceAccountFile(args.serviceAccount)
  const accessToken = await requestAccessToken(serviceAccount)

  const message = {
    token: args.token,
    notification: {
      title: args.title,
      body: args.body,
    },
    data: args.data,
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
      },
    },
  }

  const response = await sendFcmMessage({
    accessToken,
    projectId: serviceAccount.project_id,
    message,
    dryRun: args.dryRun,
  })

  console.log('[push:test:android] OK')
  console.log(`[push:test:android] project_id=${serviceAccount.project_id}`)
  console.log(`[push:test:android] dry_run=${args.dryRun}`)
  console.log(`[push:test:android] message_id=${response.name || 'unknown'}`)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[push:test:android] Failed: ${message}`)
  process.exit(1)
})
