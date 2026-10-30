export type PowerId = 'hint' | 'shield' | 'focus'

export type PowerDef = {
  id: PowerId
  label: string
  blurb: string
  /** Minimum delver level required (1 = always). */
  minLevel: number
}

export const POWERS: Record<PowerId, PowerDef> = {
  hint: {
    id: 'hint',
    label: 'Hint',
    blurb: 'Grey out one wrong option on the current question.',
    minLevel: 1,
  },
  shield: {
    id: 'shield',
    label: 'Shield',
    blurb: 'Block damage from your next miss.',
    minLevel: 2,
  },
  focus: {
    id: 'focus',
    label: 'Focus Strike',
    blurb: 'Next correct hit deals double boss damage.',
    minLevel: 2,
  },
}

export const POWER_LIST: PowerDef[] = [POWERS.hint, POWERS.shield, POWERS.focus]

export function isPowerUnlocked(id: PowerId, level: number) {
  return level >= POWERS[id].minLevel
}

export type PowerRuntime = {
  selected: PowerId
  charges: number
  /** Hint: index of option to grey out, or null until activated */
  hintedWrongIndex: number | null
  /** Shield armed for next miss */
  shieldArmed: boolean
  /** Focus armed for next hit */
  focusArmed: boolean
}

export function createPowerRuntime(selected: PowerId): PowerRuntime {
  return {
    selected,
    charges: 1,
    hintedWrongIndex: null,
    shieldArmed: false,
    focusArmed: false,
  }
}

/** Pick a wrong option index for Hint. */
export function pickWrongOption(
  correctAnswerIndex: number,
  optionCount = 4,
): number {
  const wrong: number[] = []
  for (let i = 0; i < optionCount; i++) {
    if (i !== correctAnswerIndex) wrong.push(i)
  }
  return wrong[Math.floor(Math.random() * wrong.length)] ?? 0
}
