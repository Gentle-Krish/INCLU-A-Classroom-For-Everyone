import { POWERS, type PowerId, type PowerRuntime } from '../lib/powers'

type PowerBarProps = {
  runtime: PowerRuntime
  disabled?: boolean
  onActivate: () => void
}

export function PowerBar({ runtime, disabled, onActivate }: PowerBarProps) {
  const def = POWERS[runtime.selected]
  const ready = runtime.charges > 0 && !disabled

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className={`btn-ember text-sm ${runtime.shieldArmed || runtime.focusArmed ? 'power-armed' : ''}`}
        disabled={!ready}
        onClick={onActivate}
      >
        Use {def.label}
        {runtime.charges > 0 ? ` (${runtime.charges})` : ' (spent)'}
      </button>
      <p className="text-xs text-[color-mix(in_srgb,var(--color-parchment)_60%,transparent)]">
        {def.blurb}
      </p>
    </div>
  )
}

export function PowerPicker({
  level,
  selected,
  onSelect,
}: {
  level: number
  selected: PowerId
  onSelect: (id: PowerId) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Loadout (pick one)</p>
      <div className="grid gap-2">
        {(Object.keys(POWERS) as PowerId[]).map((id) => {
          const def = POWERS[id]
          const unlocked = level >= def.minLevel
          const active = selected === id
          return (
            <button
              key={id}
              type="button"
              disabled={!unlocked}
              onClick={() => onSelect(id)}
              className={`border-3 px-3 py-2 text-left text-sm transition ${
                active
                  ? 'border-[var(--color-ember)] bg-[color-mix(in_srgb,var(--color-ember)_18%,transparent)]'
                  : 'border-[var(--color-panel-edge)]'
              } ${!unlocked ? 'opacity-45' : ''}`}
            >
              <span className="font-semibold">{def.label}</span>
              {!unlocked && (
                <span className="ml-2 text-[10px] text-[var(--color-ember)]">
                  Lv {def.minLevel}+
                </span>
              )}
              <span className="mt-0.5 block text-xs text-[color-mix(in_srgb,var(--color-parchment)_60%,transparent)]">
                {def.blurb}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
