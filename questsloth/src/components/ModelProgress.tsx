type ModelProgressProps = {
  progress: number
  text: string
}

export function ModelProgress({ progress, text }: ModelProgressProps) {
  const pct = Math.round(Math.min(100, Math.max(0, progress * 100)))

  return (
    <div className="panel space-y-3 p-4">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">Loading Gemma locally…</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-3 overflow-hidden border-2 border-[var(--color-panel-edge)] bg-[#0d0b09]">
        <div
          className="h-full bg-[var(--color-ember)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs leading-relaxed text-[color-mix(in_srgb,var(--color-parchment)_60%,transparent)]">
        {text || 'Preparing WebGPU engine…'} First download is ~1.5GB and caches in
        your browser. After that, loads from disk.
      </p>
    </div>
  )
}
