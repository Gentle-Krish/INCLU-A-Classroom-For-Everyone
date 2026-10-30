type HpBarProps = {
  label: string
  hp: number
  maxHp: number
  variant?: 'player' | 'boss'
  flash?: boolean
}

export function HpBar({
  label,
  hp,
  maxHp,
  variant = 'player',
  flash = false,
}: HpBarProps) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const fill =
    variant === 'boss'
      ? 'bg-[var(--color-boss)]'
      : hp <= maxHp * 0.3
        ? 'bg-[var(--color-blood)]'
        : 'bg-[var(--color-moss-bright)]'

  return (
    <div className={`w-full ${flash ? 'hp-flash' : ''}`}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold tracking-wide">{label}</span>
        <span className="tabular-nums text-[color-mix(in_srgb,var(--color-parchment)_75%,transparent)]">
          {Math.max(0, hp)} / {maxHp}
        </span>
      </div>
      <div className="h-4 overflow-hidden border-2 border-[var(--color-panel-edge)] bg-[#0d0b09]">
        <div
          className={`h-full transition-all duration-500 ease-out ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
