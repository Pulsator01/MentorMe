import { describe, expect, it } from 'vitest'
import { DEFAULT_LIFECYCLE_STAGE, normalizeLifecycleStage } from './stageOptions'

describe('normalizeLifecycleStage', () => {
  it('keeps valid lifecycle stage values unchanged', () => {
    expect(normalizeLifecycleStage('MVP')).toBe('MVP')
    expect(normalizeLifecycleStage('Pilot')).toBe('Pilot')
  })

  it('maps legacy TRL-like stages to lifecycle stages', () => {
    expect(normalizeLifecycleStage('TRL 4')).toBe('Prototype')
    expect(normalizeLifecycleStage('TRL 5')).toBe('MVP')
    expect(normalizeLifecycleStage('TRL 6')).toBe('Pilot')
    expect(normalizeLifecycleStage('TRL 9+')).toBe('Scale')
  })

  it('falls back for empty or unknown stage values', () => {
    expect(normalizeLifecycleStage(null)).toBe(DEFAULT_LIFECYCLE_STAGE)
    expect(normalizeLifecycleStage('')).toBe(DEFAULT_LIFECYCLE_STAGE)
    expect(normalizeLifecycleStage('Early stage')).toBe(DEFAULT_LIFECYCLE_STAGE)
  })
})
