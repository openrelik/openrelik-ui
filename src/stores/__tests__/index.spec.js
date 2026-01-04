
import { describe, it, expect } from 'vitest'
import { createPinia, Pinia } from 'pinia'
import pinia from '../index'

describe('Store Index', () => {
  it('exports a pinia instance', () => {
    expect(pinia).toBeDefined()
    // We can't easily instanceof Pinia because the class isn't exported directly in the same way usually, 
    // but we can check if it has the install method which plugins/instances have.
    expect(typeof pinia.install).toBe('function')
    expect(pinia.state).toBeDefined()
  })
})
