import { ACHIEVEMENTS, type AchievementId } from '../lib/progress'

type AchievementToastProps = {
  ids: AchievementId[]
}

export function AchievementToast({ ids }: AchievementToastProps) {
  if (ids.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(100%-2rem,20rem)] flex-col gap-2">
      {ids.map((id) => {
        const def = ACHIEVEMENTS.find((a) => a.id === id)
        if (!def) return null
        return (
          <div
            key={id}
            className="achievement-toast panel pointer-events-auto border-[var(--color-ember)] p-3 shadow-lg"
          >
            <p className="font-display text-[8px] text-[var(--color-ember-bright)]">
              Achievement unlocked
            </p>
            <p className="mt-1 text-sm font-semibold">{def.label}</p>
            <p className="mt-0.5 text-xs text-[color-mix(in_srgb,var(--color-parchment)_65%,transparent)]">
              {def.blurb}
            </p>
          </div>
        )
      })}
    </div>
  )
}
