import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ModelProgress } from '../components/ModelProgress'
import { QuestPreview } from '../components/QuestPreview'
import { downloadQuestPack } from '../lib/download'
import { playSfx, unlockAudio } from '../lib/audio'
import { setPendingQuest } from '../lib/questStash'
import {
  generateQuestPack,
  getModelLabel,
  hasWebGPU,
  isEngineReady,
  loadEngine,
  type LoadProgress,
} from '../lib/webllm'
import type { QuestPack } from '../types/quest'
import { MAX_NOTES_CHARS } from '../types/quest'
import sampleQuest from '../data/sample-quest.json'

type Phase = 'idle' | 'loading' | 'ready' | 'generating' | 'done' | 'error'

const SAMPLE_NOTES = `E-commerce basics:
A payment gateway securely transmits transaction data between the customer and the payment processor.
Cart abandonment rate measures how often shoppers leave without buying.
SKU means Stock Keeping Unit — a unique product identifier.
HTTPS encrypts checkout traffic so payment details are harder to intercept.
Order fulfillment typically starts after a paid order is confirmed, then pick, pack, and ship.`

export function Forge() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState(SAMPLE_NOTES)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState<LoadProgress>({ progress: 0, text: '' })
  const [quest, setQuest] = useState<QuestPack | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [webgpu, setWebgpu] = useState<boolean | null>(null)
  const [modelLabel, setModelLabel] = useState(getModelLabel())

  function playInDungeon(pack: QuestPack) {
    setPendingQuest(pack)
    navigate('/dungeon')
  }

  useEffect(() => {
    void hasWebGPU().then((ok) => {
      setWebgpu(ok)
      if (isEngineReady()) setPhase('ready')
    })
  }, [])

  async function handleLoadModel() {
    setError(null)
    setPhase('loading')
    try {
      await loadEngine((report) => setProgress(report))
      setModelLabel(getModelLabel())
      setPhase('ready')
    } catch (err) {
      setPhase('error')
      const msg = err instanceof Error ? err.message : 'Failed to load model'
      setError(
        /shader-f16/i.test(msg)
          ? 'WebGPU shader-f16 is unavailable and the q4f32 fallback also failed. Use latest Chrome or Edge with WebGPU enabled, and enough VRAM (~2.5GB free for q4f32).'
          : msg,
      )
    }
  }

  async function handleGenerate() {
    setError(null)
    setQuest(null)
    setPhase('generating')
    try {
      const pack = await generateQuestPack(notes, (report) => {
        setPhase('loading')
        setProgress(report)
      })
      setModelLabel(getModelLabel())
      setQuest(pack)
      setPendingQuest(pack)
      setPhase('done')
      unlockAudio()
      playSfx('forge')
    } catch (err) {
      setPhase(isEngineReady() ? 'ready' : 'error')
      setError(err instanceof Error ? err.message : 'Generation failed')
    }
  }

  function handleUseSample() {
    const pack = sampleQuest as QuestPack
    setQuest(pack)
    setPendingQuest(pack)
    setPhase('done')
    setError(null)
    unlockAudio()
    playSfx('ui')
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="font-display text-[9px] text-[var(--color-moss-bright)]">
          Teacher Forge
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">Paste notes. Forge a quest.</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[color-mix(in_srgb,var(--color-parchment)_70%,transparent)]">
          Runs <strong>{modelLabel}</strong> entirely in your browser via WebLLM.
          Temperature is locked low so the model emits strict quiz JSON your dungeon can
          play. If your GPU lacks <code>shader-f16</code>, Forge auto-falls back to the
          q4f32 Gemma build.
        </p>
      </header>

      {webgpu === false && (
        <div className="panel border-[var(--color-blood)] p-4 text-sm">
          WebGPU not available. Forge needs Chrome or Edge with WebGPU. You can still{' '}
          <button type="button" className="underline" onClick={handleUseSample}>
            load the sample quest
          </button>{' '}
          and play it in the{' '}
          <Link to="/dungeon" className="underline">
            Dungeon
          </Link>
          .
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Lecture notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_CHARS))}
              rows={14}
              className="w-full resize-y border-3 border-[var(--color-panel-edge)] bg-[#0d0b09] p-3 font-mono text-sm leading-relaxed text-[var(--color-parchment)] outline-none focus:border-[var(--color-moss)]"
              placeholder="Paste syllabus notes, bullet points, or a short chapter summary…"
            />
            <span className="block text-right text-xs text-[color-mix(in_srgb,var(--color-parchment)_50%,transparent)]">
              {notes.length} / {MAX_NOTES_CHARS}
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            {phase !== 'ready' &&
              phase !== 'generating' &&
              phase !== 'done' &&
              phase !== 'loading' && (
                <button
                  type="button"
                  className="btn-ember"
                  onClick={handleLoadModel}
                  disabled={webgpu === false}
                >
                  Load Gemma (~1.5GB once)
                </button>
              )}
            {(phase === 'ready' || phase === 'done') && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleGenerate}
                disabled={!notes.trim()}
              >
                Forge Quest
              </button>
            )}
            {phase === 'generating' && (
              <button type="button" className="btn-primary" disabled>
                Forging…
              </button>
            )}
            {quest && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => downloadQuestPack(quest)}
              >
                Download Quest
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={handleUseSample}>
              Use sample pack
            </button>
          </div>

          {phase === 'loading' && (
            <ModelProgress progress={progress.progress} text={progress.text} />
          )}

          {phase === 'generating' && (
            <div className="panel p-4 text-sm">
              Gemma is reading your notes and forging five boss-battle questions…
            </div>
          )}

          {error && (
            <div className="panel border-[var(--color-blood)] p-4 text-sm text-[#f0c0c0]">
              {error}
            </div>
          )}
        </div>

        <div>
          {quest ? (
            <div className="space-y-4">
              <QuestPreview quest={quest} />
              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                onClick={() => playInDungeon(quest)}
              >
                Play in Dungeon →
              </button>
              <p className="text-xs text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
                Hands the pack straight to the Dungeon (and keeps a local stash). Or
                download JSON to share with students.
              </p>
            </div>
          ) : (
            <div className="panel flex h-full min-h-64 items-center justify-center p-8 text-center text-sm text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
              Quest preview appears here after forging.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
