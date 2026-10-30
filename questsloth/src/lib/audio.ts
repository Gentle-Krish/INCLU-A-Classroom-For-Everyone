/**
 * All audio is synthesized at runtime with the Web Audio API: no audio files,
 * no downloads, no licensing. The audio context is created lazily on the first
 * user gesture so browsers that block autoplay stay quiet until then.
 */

export type SfxName =
  | 'hit'
  | 'crit'
  | 'miss'
  | 'block'
  | 'power'
  | 'enrage'
  | 'victory'
  | 'defeat'
  | 'escape'
  | 'levelup'
  | 'achievement'
  | 'forge'
  | 'ui'

export type MusicMode = 'off' | 'lobby' | 'battle' | 'enrage'

type SfxOptions = {
  combo?: number
  delaySeconds?: number
}

type ToneSpec = {
  freq: number
  duration: number
  type?: OscillatorType
  gain?: number
  when?: number
  slideTo?: number
}

const PREF_KEY = 'questsloth.audio.v1'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let sfxBus: GainNode | null = null
let musicBus: GainNode | null = null
let noiseCache: AudioBuffer | null = null
let muted = readMuted()
const muteListeners = new Set<() => void>()

let musicMode: MusicMode = 'off'
let schedulerId: number | null = null
let musicStep = 0
let nextNoteTime = 0

const BPM_BATTLE = 92
const BPM_ENRAGE = 118
const BPM_LOBBY = 72

/** Am – F – C – G lead loop for battle. */
const BATTLE_LEAD = [
  440, 523.25, 659.25, 880, 659.25, 523.25, 440, 523.25,
  349.23, 440, 523.25, 698.46, 523.25, 440, 349.23, 440,
  523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 659.25,
  493.88, 587.33, 783.99, 987.77, 783.99, 587.33, 493.88, 587.33,
]

const BATTLE_BASS = [110, 87.31, 130.81, 98]

/** Soft pad arpeggio for lobby (Em). */
const LOBBY_PAD = [164.81, 196, 246.94, 329.63, 246.94, 196, 164.81, 196]

function readMuted() {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(PREF_KEY)
    if (!raw) return false
    const data: unknown = JSON.parse(raw)
    return Boolean(data && typeof data === 'object' && (data as { muted?: unknown }).muted)
  } catch {
    return false
  }
}

function persistMuted() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify({ muted }))
  } catch {
    // ignore
  }
}

export function audioMuted() {
  return muted
}

export function subscribeAudioMuted(listener: () => void) {
  muteListeners.add(listener)
  return () => {
    muteListeners.delete(listener)
  }
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try {
      ctx = new AudioContext()
    } catch {
      return null
    }
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)

    sfxBus = ctx.createGain()
    sfxBus.gain.value = 0.55
    sfxBus.connect(master)

    musicBus = ctx.createGain()
    musicBus.gain.value = 0.22
    musicBus.connect(master)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Call from any click so Chrome unlocks AudioContext. */
export function unlockAudio() {
  ensureContext()
}

function getNoiseBuffer(context: AudioContext) {
  if (noiseCache) return noiseCache
  const length = Math.floor(context.sampleRate * 0.4)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1
  }
  noiseCache = buffer
  return buffer
}

function sfxTone({
  freq,
  duration,
  type = 'square',
  gain = 0.15,
  when = 0,
  slideTo,
}: ToneSpec) {
  const context = ensureContext()
  if (!context || !sfxBus) return
  const start = context.currentTime + when
  const osc = context.createOscillator()
  const envelope = context.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(Math.max(20, freq), start)
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration)
  }

  envelope.gain.setValueAtTime(0.0001, start)
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008)
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(envelope)
  envelope.connect(sfxBus)
  osc.start(start)
  osc.stop(start + duration + 0.03)
}

function sfxNoise({
  duration,
  gain,
  when = 0,
  cutoff = 1400,
}: {
  duration: number
  gain: number
  when?: number
  cutoff?: number
}) {
  const context = ensureContext()
  if (!context || !sfxBus) return
  const start = context.currentTime + when
  const source = context.createBufferSource()
  source.buffer = getNoiseBuffer(context)

  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = cutoff

  const envelope = context.createGain()
  envelope.gain.setValueAtTime(0.0001, start)
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.005)
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  source.connect(filter)
  filter.connect(envelope)
  envelope.connect(sfxBus)
  source.start(start)
  source.stop(start + duration + 0.03)
}

export function playSfx(name: SfxName, options: SfxOptions = {}) {
  if (muted) return
  if (!ensureContext()) return
  const when = Math.max(0, options.delaySeconds ?? 0)

  switch (name) {
    case 'hit': {
      const combo = Math.max(1, options.combo ?? 1)
      sfxTone({ freq: 260 + combo * 40, duration: 0.13, gain: 0.16, when })
      sfxNoise({ duration: 0.07, gain: 0.1, when, cutoff: 1800 })
      if (combo >= 3) {
        sfxTone({ freq: 880, duration: 0.07, type: 'triangle', gain: 0.07, when: when + 0.02 })
        sfxTone({ freq: 1174.66, duration: 0.09, type: 'triangle', gain: 0.06, when: when + 0.07 })
      }
      break
    }
    case 'crit':
      sfxTone({ freq: 220, duration: 0.12, type: 'sawtooth', gain: 0.12, when })
      sfxTone({ freq: 440, duration: 0.14, type: 'square', gain: 0.1, when: when + 0.05 })
      sfxTone({ freq: 880, duration: 0.2, type: 'triangle', gain: 0.08, when: when + 0.12 })
      sfxNoise({ duration: 0.12, gain: 0.1, when: when + 0.02, cutoff: 2400 })
      break
    case 'miss':
      sfxTone({ freq: 200, duration: 0.3, type: 'sawtooth', gain: 0.14, when, slideTo: 70 })
      sfxNoise({ duration: 0.18, gain: 0.12, when, cutoff: 520 })
      break
    case 'block':
      sfxTone({ freq: 640, duration: 0.08, type: 'triangle', gain: 0.1, when })
      sfxTone({ freq: 960, duration: 0.14, type: 'sine', gain: 0.08, when: when + 0.04 })
      sfxNoise({ duration: 0.06, gain: 0.06, when, cutoff: 3000 })
      break
    case 'power':
      sfxTone({ freq: 500, duration: 0.08, type: 'sine', gain: 0.08, when })
      sfxTone({ freq: 750, duration: 0.14, type: 'sine', gain: 0.07, when: when + 0.06 })
      sfxTone({ freq: 1000, duration: 0.1, type: 'triangle', gain: 0.05, when: when + 0.12 })
      break
    case 'enrage':
      sfxTone({ freq: 110, duration: 0.5, type: 'sawtooth', gain: 0.12, when, slideTo: 55 })
      sfxTone({
        freq: 82.41,
        duration: 0.55,
        gain: 0.08,
        when: when + 0.05,
        slideTo: 41.2,
      })
      sfxNoise({ duration: 0.25, gain: 0.08, when: when + 0.05, cutoff: 400 })
      break
    case 'victory': {
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((freq, index) => {
        sfxTone({
          freq,
          duration: index === notes.length - 1 ? 0.5 : 0.16,
          gain: 0.12,
          when: when + index * 0.13,
        })
      })
      sfxTone({ freq: 1567.98, duration: 0.6, type: 'triangle', gain: 0.07, when: when + 0.52 })
      break
    }
    case 'defeat': {
      const notes = [392, 329.63, 261.63, 196]
      notes.forEach((freq, index) => {
        sfxTone({
          freq,
          duration: 0.4,
          type: 'sawtooth',
          gain: 0.1,
          when: when + index * 0.18,
          slideTo: freq * 0.96,
        })
      })
      break
    }
    case 'escape':
      sfxTone({ freq: 330, duration: 0.2, type: 'triangle', gain: 0.08, when, slideTo: 220 })
      sfxTone({ freq: 247, duration: 0.28, type: 'sine', gain: 0.07, when: when + 0.15, slideTo: 165 })
      break
    case 'levelup': {
      const notes = [659.25, 783.99, 987.77, 1318.51]
      notes.forEach((freq, index) => {
        sfxTone({
          freq,
          duration: 0.22,
          type: 'triangle',
          gain: 0.1,
          when: when + index * 0.1,
        })
      })
      break
    }
    case 'achievement':
      sfxTone({ freq: 587.33, duration: 0.1, type: 'triangle', gain: 0.09, when })
      sfxTone({ freq: 783.99, duration: 0.12, type: 'triangle', gain: 0.09, when: when + 0.08 })
      sfxTone({ freq: 1174.66, duration: 0.28, type: 'sine', gain: 0.08, when: when + 0.16 })
      break
    case 'forge':
      sfxTone({ freq: 523.25, duration: 0.18, type: 'triangle', gain: 0.09, when })
      sfxTone({ freq: 783.99, duration: 0.3, type: 'triangle', gain: 0.08, when: when + 0.12 })
      sfxNoise({ duration: 0.08, gain: 0.05, when: when + 0.05, cutoff: 2000 })
      break
    case 'ui':
      sfxTone({ freq: 520, duration: 0.05, type: 'triangle', gain: 0.06, when })
      break
  }
}

function musicTone(freq: number, at: number, duration: number, type: OscillatorType, gainValue: number) {
  if (!ctx || !musicBus) return
  const osc = ctx.createOscillator()
  const envelope = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  envelope.gain.setValueAtTime(0.0001, at)
  envelope.gain.exponentialRampToValueAtTime(gainValue, at + 0.02)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration)

  osc.connect(envelope)
  envelope.connect(musicBus)
  osc.start(at)
  osc.stop(at + duration + 0.05)
}

function musicKick(at: number, gain = 0.16) {
  if (!ctx || !musicBus) return
  const osc = ctx.createOscillator()
  const envelope = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(92, at)
  osc.frequency.exponentialRampToValueAtTime(44, at + 0.12)
  envelope.gain.setValueAtTime(0.0001, at)
  envelope.gain.exponentialRampToValueAtTime(gain, at + 0.006)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.17)

  osc.connect(envelope)
  envelope.connect(musicBus)
  osc.start(at)
  osc.stop(at + 0.2)
}

function stepSeconds() {
  if (musicMode === 'lobby') return 60 / BPM_LOBBY / 2
  if (musicMode === 'enrage') return 60 / BPM_ENRAGE / 2
  return 60 / BPM_BATTLE / 2
}

function scheduleMusicStep(step: number, at: number) {
  if (musicMode === 'lobby') {
    const note = LOBBY_PAD[step % LOBBY_PAD.length]
    musicTone(note, at, 0.55, 'sine', 0.045)
    if (step % 8 === 0) musicTone(note / 2, at, 0.7, 'triangle', 0.03)
    return
  }

  const leadGain = musicMode === 'enrage' ? 0.09 : 0.07
  const bassGain = musicMode === 'enrage' ? 0.1 : 0.08
  const kickGain = musicMode === 'enrage' ? 0.2 : 0.15

  const stepInBar = step % 8
  const bar = Math.floor(step / 8) % BATTLE_BASS.length

  musicTone(BATTLE_LEAD[step % BATTLE_LEAD.length], at, 0.22, 'triangle', leadGain)
  if (stepInBar === 0 || stepInBar === 4) {
    musicTone(BATTLE_BASS[bar], at, 0.5, 'square', bassGain)
    musicKick(at, kickGain)
  }
  if (musicMode === 'enrage' && (stepInBar === 2 || stepInBar === 6)) {
    musicKick(at, 0.08)
  }
}

function schedulerTick() {
  if (!ctx || musicMode === 'off') return
  // After a backgrounded tab, skip missed steps instead of firing a burst.
  if (nextNoteTime < ctx.currentTime - 0.1) {
    nextNoteTime = ctx.currentTime + 0.05
  }
  const stepLen = stepSeconds()
  while (nextNoteTime < ctx.currentTime + 0.12) {
    scheduleMusicStep(musicStep, nextNoteTime)
    musicStep += 1
    nextNoteTime += stepLen
  }
}

function startScheduler() {
  const context = ensureContext()
  if (!context || schedulerId !== null || muted || musicMode === 'off') return
  musicStep = 0
  nextNoteTime = context.currentTime + 0.08
  if (musicBus) {
    musicBus.gain.cancelScheduledValues(context.currentTime)
    musicBus.gain.setValueAtTime(0.0001, context.currentTime)
    musicBus.gain.exponentialRampToValueAtTime(
      musicMode === 'lobby' ? 0.14 : 0.22,
      context.currentTime + 0.4,
    )
  }
  schedulerTick()
  schedulerId = window.setInterval(schedulerTick, 40)
}

function stopScheduler(fade = true) {
  if (ctx && musicBus && fade) {
    const now = ctx.currentTime
    musicBus.gain.cancelScheduledValues(now)
    musicBus.gain.setValueAtTime(Math.max(0.0001, musicBus.gain.value), now)
    musicBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
  }
  if (schedulerId !== null) {
    window.clearInterval(schedulerId)
    schedulerId = null
  }
}

function setMusicMode(mode: MusicMode) {
  if (musicMode === mode) {
    if (mode !== 'off' && !muted && schedulerId === null) startScheduler()
    return
  }
  const prev = musicMode
  musicMode = mode
  if (mode === 'off') {
    stopScheduler(true)
    return
  }
  if (prev !== 'off') {
    stopScheduler(false)
  }
  if (!muted) startScheduler()
}

export function startLobbyMusic() {
  setMusicMode('lobby')
}

export function startBattleMusic() {
  setMusicMode('battle')
}

export function setBattleMusicEnraged(enraged: boolean) {
  if (musicMode === 'off' || musicMode === 'lobby') return
  setMusicMode(enraged ? 'enrage' : 'battle')
}

export function stopBattleMusic() {
  setMusicMode('off')
}

export function stopAllMusic() {
  setMusicMode('off')
}

export function setAudioMuted(next: boolean) {
  if (muted === next) return
  muted = next
  persistMuted()
  muteListeners.forEach((listener) => listener())

  if (muted) {
    stopScheduler(true)
    if (ctx && master) {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.02)
    }
    return
  }

  const context = ensureContext()
  if (context && master) {
    master.gain.setTargetAtTime(0.9, context.currentTime, 0.02)
  }
  if (musicMode !== 'off') startScheduler()
}
