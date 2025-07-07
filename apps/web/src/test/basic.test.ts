import { describe, it, expect } from 'vitest'

describe('Frontend Tests', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have proper environment', () => {
    expect(typeof window).toBe('object') // jsdom environment for React testing
  })
}) 