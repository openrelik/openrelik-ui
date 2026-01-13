// src/test/setup.js
import { beforeEach, vi } from 'vitest'

// Mock localStorage if needed, though happy-dom usually handles it.
// This is to ensure we have a clean state or specific behavior if required.
// Currently just a placeholder or for specific global mocks.

beforeEach(() => {
  // Clear mocks if any
  vi.clearAllMocks()
})

// Suppress known noisy warnings if they cannot be fixed via config
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('--localstorage-file')) {
    return
  }
  originalConsoleWarn(...args)
}

const originalConsoleError = console.error
console.error = (...args) => {
  if (args[0] && args[0].name === 'AbortError') return
  if (args[0] && typeof args[0] === 'string' && args[0].includes('AbortError')) return
  originalConsoleError(...args)
}

// Suppress unhandled rejections from AbortError during teardown
// Suppress noisy AbortError logs from happy-dom/vitest by intercepting stderr
if (typeof process !== 'undefined') {
  const originalStderrWrite = process.stderr.write
  process.stderr.write = (chunk, encoding, callback) => {
    if (typeof chunk === 'string') {
      if (chunk.includes('AbortError') || chunk.includes('The operation was aborted')) {
        return true
      }
      if (chunk.includes('SSE request failed: Unauthorized')) {
        return true
      }
    }
    return originalStderrWrite.call(process.stderr, chunk, encoding, callback)
  }
}


if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.name === 'AbortError') {
      event.preventDefault()
    }
  })
}
