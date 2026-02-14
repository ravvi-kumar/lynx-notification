function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function upsertManagedBlock(source: string, options: {
  startMarker: string
  endMarker: string
  content: string
}): string {
  const normalizedSource = source.replace(/\s+$/, '')
  const managedBlock = `${options.startMarker}\n${options.content.trimEnd()}\n${options.endMarker}`

  if (normalizedSource.includes(options.startMarker) && normalizedSource.includes(options.endMarker)) {
    const matcher = new RegExp(
      `${escapeRegExp(options.startMarker)}[\\s\\S]*?${escapeRegExp(options.endMarker)}`,
      'g',
    )
    return `${normalizedSource.replace(matcher, managedBlock)}\n`
  }

  return `${normalizedSource}\n\n${managedBlock}\n`
}
