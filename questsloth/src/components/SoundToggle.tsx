import { useEffect, useState } from 'react'
import {
  audioMuted,
  playSfx,
  setAudioMuted,
  subscribeAudioMuted,
  unlockAudio,
} from '../lib/audio'

export function SoundToggle() {
  const [muted, setMuted] = useState(() => audioMuted())

  useEffect(() => subscribeAudioMuted(() => setMuted(audioMuted())), [])

  function toggle() {
    unlockAudio()
    const next = !muted
    setAudioMuted(next)
    setMuted(next)
    if (!next) playSfx('ui')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      aria-pressed={!muted}
      title={muted ? 'Sound off — click to unmute' : 'Sound on — click to mute'}
      className="border-2 border-[var(--color-panel-edge)] p-1.5 text-[color-mix(in_srgb,var(--color-parchment)_65%,transparent)] transition hover:border-[var(--color-ember)] hover:text-[var(--color-parchment)]"
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M2.5 6h2l3-2.5v9l-3-2.5h-2z" fill="currentColor" />
        {muted ? (
          <path
            d="M10.5 6.5l4 4m0-4l-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ) : (
          <>
            <path
              d="M10.5 5.5a3.5 3.5 0 010 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M12.5 4a6 6 0 010 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </button>
  )
}
