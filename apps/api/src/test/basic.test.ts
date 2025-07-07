import { describe, it, expect } from 'vitest'

describe('Backend Tests', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have Node.js environment', () => {
    expect(typeof process).toBe('object')
    expect(process.version).toBeDefined()
  })
}) 