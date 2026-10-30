import { useEffect, useState } from 'react'
import {
  ACHIEVEMENTS,
  levelInfo,
  type AchievementId,
  type RunOutcome,
  type RunResult,
} from '../lib/progress'
import { DIFFICULTIES } from '../lib/difficulty'

type RunSummaryProps = {
  result: RunResult
  bossName: string
  onRematch: () => void
  onLobby: () => void
}

const OUTCOME_COPY: Record<
  RunOutcome,
  { kicker: string; title: (boss: string) => string; body: string }
> = {
  won: {
    kicker: 'Victory',
    title: (boss) => `${boss} falls!`,
    body: 'Your answers cut true. The dungeon is quieter for it.',
  },
  escaped: {
    kicker: 'The boss escapes',
    title: (boss) => `${boss} slips away`,
    body: 'You survived, but the boss still had HP left. Try Easy mode, Focus Strike, or a cleaner run.',
  },
  defeated: {
    kicker: 'Defeat',
    title: () => 'You were defeated…',
    body: 'Your HP ran out before the boss fell. Take the explanations and run it again.',
  },
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-enter border-2 border-[var(--color-panel-edge)] bg-[#0d0b09]/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
        {label}
      </p>
      <p className="font-display text-[11px] leading-relaxed text-[var(--color-parchment)]">
        {value}
      </p>
    </div>
  )
}

function useCountUp(target: number, ms = 700) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const start = performance.now()
    let frame = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      setN(Math.round(target * p))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, ms])
  return n
}

export function RunSummary({ result, bossName, onRematch, onLobby }: RunSummaryProps) {
  const copy = OUTCOME_COPY[result.outcome]
  const level = levelInfo(result.progress.xp)
  const leveledUp = result.levelAfter > result.levelBefore
  const scoreAnim = useCountUp(result.score)
  const xpAnim = useCountUp(result.xpGained)

  return (
    <div className="mx-auto max-w-xl">
      <div className="panel summary-slam space-y-5 p-6 text-center sm:p-8">
        <p className="font-display text-[9px] text-[var(--color-ember)]">{copy.kicker}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{copy.title(bossName)}</h1>
        <p className="text-sm leading-relaxed text-[color-mix(in_srgb,var(--color-parchment)_70%,transparent)]">
          {copy.body}
        </p>
        <p className="font-display text-[8px] text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
          {DIFFICULTIES[result.difficulty].label} difficulty
        </p>

        <div className="flex items-baseline justify-center gap-3">
          <span className="font-display text-2xl text-[var(--color-parchment)]">
            {scoreAnim.toLocaleString()}
          </span>
          <span className="text-xs uppercase tracking-wider text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
            points
          </span>
          {result.newBest && (
            <span className="border-2 border-[var(--color-moss-bright)] px-2 py-1 font-display text-[7px] text-[var(--color-moss-bright)]">
              new best
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-left sm:grid-cols-3">
          <Stat label="XP earned" value={`+${xpAnim}`} />
          <Stat label="Accuracy" value={`${result.correct} / ${result.total}`} />
          <Stat label="Best streak" value={`${result.bestStreak}×`} />
        </div>

        {result.flawless && (
          <p className="border-2 border-[var(--color-ember)] bg-[color-mix(in_srgb,var(--color-ember)_14%,transparent)] px-3 py-2 font-display text-[8px] leading-relaxed text-[var(--color-ember-bright)]">
            flawless victory · +500 bonus
          </p>
        )}

        {result.newlyUnlocked.length > 0 && (
          <div className="space-y-2 text-left">
            <p className="font-display text-[8px] text-[var(--color-ember)]">New achievements</p>
            <ul className="space-y-1">
              {result.newlyUnlocked.map((id: AchievementId) => {
                const def = ACHIEVEMENTS.find((a) => a.id === id)
                return (
                  <li
                    key={id}
                    className="achievement-check border-2 border-[var(--color-moss)] px-2 py-1 text-xs"
                  >
                    {def?.label ?? id}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="space-y-2 text-left">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold">Level {level.level}</span>
            <span className="tabular-nums text-[color-mix(in_srgb,var(--color-parchment)_60%,transparent)]">
              {level.into} / {level.span} XP
            </span>
          </div>
          <div className="h-3 overflow-hidden border-2 border-[var(--color-panel-edge)] bg-[#0d0b09]">
            <div
              className="h-full bg-[var(--color-moss-bright)] transition-all duration-500"
              style={{ width: `${level.pct}%` }}
            />
          </div>
          {leveledUp && (
            <p className="combo-badge font-display text-[8px] text-[var(--color-moss-bright)]">
              level up — {result.levelBefore} → {result.levelAfter}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-center">
          <button type="button" className="btn-primary" onClick={onRematch}>
            Rematch
          </button>
          <button type="button" className="btn-secondary" onClick={onLobby}>
            Back to lobby
          </button>
        </div>

        <p className="text-[11px] text-[color-mix(in_srgb,var(--color-parchment)_50%,transparent)]">
          Personal best {result.progress.bestScore.toLocaleString()} · Runs {result.progress.runs} ·
          Wins {result.progress.wins}
        </p>
      </div>
    </div>
  )
}
