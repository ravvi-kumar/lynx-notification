import { runOnBackground } from '@lynx-js/react'

declare const __MAIN_THREAD__: boolean | undefined

function isMainThreadRuntime(): boolean {
  return typeof __MAIN_THREAD__ !== 'undefined' && Boolean(__MAIN_THREAD__)
}

export async function runOnBackgroundIfNeeded<T>(task: () => Promise<T>): Promise<T> {
  if (!isMainThreadRuntime()) {
    return task()
  }

  try {
    const wrapped = runOnBackground<Promise<T>, () => Promise<T>>(() => {
      'background only'
      return task()
    })
    const nested = await wrapped()
    return await nested
  } catch {
    return task()
  }
}
