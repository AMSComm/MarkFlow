import { describe, it, expect } from 'vitest'
import { compareVersions } from '../utils/updater'

describe('Updater - compareVersions', () => {
  it('identifies newer versions correctly', () => {
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1)
    expect(compareVersions('1.1.0', '1.0.9')).toBe(1)
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1)
    expect(compareVersions('v1.0.1', '1.0.0')).toBe(1)
  })

  it('identifies older versions correctly', () => {
    expect(compareVersions('0.9.9', '1.0.0')).toBe(-1)
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
    expect(compareVersions('1.0.0', 'v1.1.0')).toBe(-1)
  })

  it('identifies equal versions correctly', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.2.3', 'v1.2.3')).toBe(0)
  })
})
