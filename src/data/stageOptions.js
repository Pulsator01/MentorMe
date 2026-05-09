export const DEFAULT_LIFECYCLE_STAGE = 'Prototype'

export const lifecycleStageOptions = [
  { value: 'Idea', label: 'Idea / discovery' },
  { value: 'Prototype', label: 'Prototype build' },
  { value: 'MVP', label: 'MVP / early validation' },
  { value: 'Pilot', label: 'Pilot in progress' },
  { value: 'Scale', label: 'Scaling commercial deployment' },
]

export const lifecycleStageValues = lifecycleStageOptions.map((option) => option.value)

const validLifecycleStages = new Set(lifecycleStageValues)

const stageForReadinessLevel = (level) => {
  if (level <= 2) {
    return 'Idea'
  }

  if (level <= 4) {
    return 'Prototype'
  }

  if (level <= 5) {
    return 'MVP'
  }

  if (level <= 7) {
    return 'Pilot'
  }

  return 'Scale'
}

export const normalizeLifecycleStage = (stage) => {
  const value = String(stage || '').trim()

  if (!value) {
    return DEFAULT_LIFECYCLE_STAGE
  }

  const trlMatch = value.match(/^TRL\s*([1-9])(?:\+)?$/i)

  if (trlMatch) {
    return stageForReadinessLevel(Number(trlMatch[1]))
  }

  if (validLifecycleStages.has(value)) {
    return value
  }

  return DEFAULT_LIFECYCLE_STAGE
}
