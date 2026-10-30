export type DifficultyId = 'easy' | 'normal' | 'hard'

export type DifficultyConfig = {
  id: DifficultyId
  label: string
  blurb: string
  playerHp: number
  bossHp: number
  damageToBoss: number
  damageToPlayer: number
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    blurb: 'More HP, harder hits — forgiving for first clears.',
    playerHp: 120,
    bossHp: 80,
    damageToBoss: 25,
    damageToPlayer: 15,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    blurb: 'Classic duel. A perfect run still drops the boss.',
    playerHp: 100,
    bossHp: 100,
    damageToBoss: 20,
    damageToPlayer: 20,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    blurb: 'Glass cannon. Powers and level bonuses matter.',
    playerHp: 80,
    bossHp: 120,
    damageToBoss: 15,
    damageToPlayer: 25,
  },
}

export const DIFFICULTY_LIST: DifficultyConfig[] = [
  DIFFICULTIES.easy,
  DIFFICULTIES.normal,
  DIFFICULTIES.hard,
]

/** Mild combat bonuses from delver level. */
export function levelCombatBonuses(level: number) {
  const safe = Math.max(1, Math.floor(level))
  return {
    bonusDamage: Math.min(10, (safe - 1) * 2),
    bonusMaxHp: Math.min(20, (safe - 1) * 4),
  }
}
