import type { DifficultyId } from './difficulty'

export const SCORE_PER_HIT = 100
export const COMBO_BONUS = 25
export const FLAWLESS_BONUS = 500
export const WIN_XP_BONUS = 50
export const XP_PER_LEVEL = 500

const STORAGE_KEY = 'questsloth.progress.v1'

export type RunOutcome = 'won' | 'escaped' | 'defeated'

export type AchievementId =
  | 'first_blood'
  | 'flawless'
  | 'combo_3'
  | 'combo_5'
  | 'hard_clear'
  | 'escape_artist'
  | 'scholar'

export type AchievementDef = {
  id: AchievementId
  label: string
  blurb: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_blood', label: 'First Blood', blurb: 'Win your first boss fight.' },
  { id: 'flawless', label: 'Flawless', blurb: 'Clear a run with no misses.' },
  { id: 'combo_3', label: 'On a Roll', blurb: 'Hit a 3× combo in a run.' },
  { id: 'combo_5', label: 'Unstoppable', blurb: 'Hit a 5× combo in a run.' },
  { id: 'hard_clear', label: 'Hard Mode', blurb: 'Win on Hard difficulty.' },
  { id: 'escape_artist', label: 'Escape Artist', blurb: 'Finish a run as escaped.' },
  { id: 'scholar', label: 'Scholar', blurb: 'Complete 5 dungeon runs.' },
]

export type Progress = {
  version: 2
  xp: number
  bestScore: number
  bestStreak: number
  runs: number
  wins: number
  achievements: AchievementId[]
}

export const EMPTY_PROGRESS: Progress = {
  version: 2,
  xp: 0,
  bestScore: 0,
  bestStreak: 0,
  runs: 0,
  wins: 0,
  achievements: [],
}

export type LevelInfo = {
  level: number
  into: number
  span: number
  pct: number
}

export type RunInput = {
  outcome: RunOutcome
  score: number
  correct: number
  total: number
  bestStreak: number
  flawless: boolean
  difficulty: DifficultyId
}

export type RunResult = RunInput & {
  xpGained: number
  newBest: boolean
  levelBefore: number
  levelAfter: number
  progress: Progress
  newlyUnlocked: AchievementId[]
}

/** Points for a correct answer; `streak` includes the hit being scored. */
export function scoreForHit(streak: number) {
  return SCORE_PER_HIT + COMBO_BONUS * Math.max(0, Math.floor(streak) - 1)
}

export function xpForRun(score: number, outcome: RunOutcome) {
  const base = Math.round(Math.max(0, score) / 10)
  return base + (outcome === 'won' ? WIN_XP_BONUS : 0)
}

export function levelInfo(xp: number): LevelInfo {
  const safe = Math.max(0, Math.floor(xp))
  const into = safe % XP_PER_LEVEL
  return {
    level: 1 + Math.floor(safe / XP_PER_LEVEL),
    into,
    span: XP_PER_LEVEL,
    pct: Math.round((into / XP_PER_LEVEL) * 100),
  }
}

function evaluateAchievements(
  before: Progress,
  after: Progress,
  run: RunInput,
): AchievementId[] {
  const owned = new Set(before.achievements)
  const unlocked: AchievementId[] = []

  const tryUnlock = (id: AchievementId, ok: boolean) => {
    if (ok && !owned.has(id)) {
      unlocked.push(id)
      owned.add(id)
    }
  }

  tryUnlock('first_blood', run.outcome === 'won' && before.wins === 0)
  tryUnlock('flawless', run.flawless && run.outcome === 'won')
  tryUnlock('combo_3', run.bestStreak >= 3)
  tryUnlock('combo_5', run.bestStreak >= 5)
  tryUnlock('hard_clear', run.outcome === 'won' && run.difficulty === 'hard')
  tryUnlock('escape_artist', run.outcome === 'escaped')
  tryUnlock('scholar', after.runs >= 5)

  return unlocked
}

export function recordRun(progress: Progress, run: RunInput): RunResult {
  const xpGained = xpForRun(run.score, run.outcome)
  const nextBase: Progress = {
    version: 2,
    xp: progress.xp + xpGained,
    bestScore: Math.max(progress.bestScore, run.score),
    bestStreak: Math.max(progress.bestStreak, run.bestStreak),
    runs: progress.runs + 1,
    wins: progress.wins + (run.outcome === 'won' ? 1 : 0),
    achievements: [...progress.achievements],
  }
  const newlyUnlocked = evaluateAchievements(progress, nextBase, run)
  const next: Progress = {
    ...nextBase,
    achievements: [...nextBase.achievements, ...newlyUnlocked],
  }
  return {
    ...run,
    xpGained,
    newBest: run.score > progress.bestScore,
    levelBefore: levelInfo(progress.xp).level,
    levelAfter: levelInfo(next.xp).level,
    progress: next,
    newlyUnlocked,
  }
}

function toCount(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

const ACH_IDS = new Set(ACHIEVEMENTS.map((a) => a.id))

function parseAchievements(value: unknown): AchievementId[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is AchievementId => typeof id === 'string' && ACH_IDS.has(id as AchievementId))
}

export function loadProgress(): Progress {
  if (typeof window === 'undefined') return { ...EMPTY_PROGRESS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_PROGRESS }
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object') return { ...EMPTY_PROGRESS }
    const obj = data as Record<string, unknown>
    return {
      version: 2,
      xp: toCount(obj.xp),
      bestScore: toCount(obj.bestScore),
      bestStreak: toCount(obj.bestStreak),
      runs: toCount(obj.runs),
      wins: toCount(obj.wins),
      achievements: parseAchievements(obj.achievements),
    }
  } catch {
    return { ...EMPTY_PROGRESS }
  }
}

export function saveProgress(progress: Progress) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage can be blocked (private mode, quotas).
  }
}

export function achievementLabel(id: AchievementId) {
  return ACHIEVEMENTS.find((a) => a.id === id)?.label ?? id
}
