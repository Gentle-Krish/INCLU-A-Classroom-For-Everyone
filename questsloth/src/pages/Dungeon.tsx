import { useEffect, useMemo, useRef, useState } from 'react'
import { AchievementToast } from '../components/AchievementToast'
import { BattleStage, type HitFx } from '../components/BattleStage'
import { PowerBar, PowerPicker } from '../components/PowerBar'
import { RunSummary } from '../components/RunSummary'
import { readQuestFile } from '../lib/download'
import {
  DIFFICULTIES,
  DIFFICULTY_LIST,
  levelCombatBonuses,
  type DifficultyId,
} from '../lib/difficulty'
import {
  createPowerRuntime,
  isPowerUnlocked,
  pickWrongOption,
  type PowerId,
  type PowerRuntime,
} from '../lib/powers'
import {
  ACHIEVEMENTS,
  FLAWLESS_BONUS,
  levelInfo,
  loadProgress,
  recordRun,
  saveProgress,
  scoreForHit,
  type Progress,
  type RunOutcome,
  type RunResult,
} from '../lib/progress'
import { parseQuestPack } from '../lib/questSchema'
import {
  consumePendingQuest,
  loadStash,
  peekPendingQuest,
  pushStash,
  type StashEntry,
} from '../lib/questStash'
import {
  audioMuted,
  playSfx,
  setAudioMuted,
  setBattleMusicEnraged,
  startBattleMusic,
  startLobbyMusic,
  stopAllMusic,
  stopBattleMusic,
  subscribeAudioMuted,
  unlockAudio,
} from '../lib/audio'
import sampleQuest from '../data/sample-quest.json'
import type { QuestPack } from '../types/quest'

type Stage = 'lobby' | 'battle' | 'ended'

type Feedback = {
  correct: boolean
  explanation: string
  points: number
  comboAfter: number
  damageDealt: number
  damageTaken: number
  blocked?: boolean
} | null

export function Dungeon() {
  const [stage, setStage] = useState<Stage>('lobby')
  const [quest, setQuest] = useState<QuestPack | null>(null)
  const [index, setIndex] = useState(0)
  const [playerHp, setPlayerHp] = useState(100)
  const [bossHp, setBossHp] = useState(100)
  const [playerMaxHp, setPlayerMaxHp] = useState(100)
  const [bossMaxHp, setBossMaxHp] = useState(100)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [hit, setHit] = useState<HitFx | null>(null)
  const [pendingEnd, setPendingEnd] = useState<RunOutcome | null>(null)
  const [summary, setSummary] = useState<RunResult | null>(null)
  const [profile, setProfile] = useState<Progress>(() => loadProgress())
  const [error, setError] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<DifficultyId>('normal')
  const [powerId, setPowerId] = useState<PowerId>('hint')
  const [power, setPower] = useState<PowerRuntime | null>(null)
  const [focusWindup, setFocusWindup] = useState(false)
  const [mute, setMute] = useState(() => audioMuted())
  const [pending, setPending] = useState<QuestPack | null>(() => peekPendingQuest())
  const [stash, setStash] = useState<StashEntry[]>(() => loadStash())
  const [shakeOptions, setShakeOptions] = useState(false)
  const [enrageLatched, setEnrageLatched] = useState(false)
  const fxId = useRef(0)

  // Soft pad in the lobby; battle BGM is started in startQuest (not here),
  // so we must not stop music on every stage change.
  useEffect(() => {
    if (stage === 'lobby') startLobbyMusic()
  }, [stage])

  useEffect(() => () => stopAllMusic(), [])

  useEffect(() => subscribeAudioMuted(() => setMute(audioMuted())), [])

  const question = useMemo(
    () => (quest ? quest.questions[index] : null),
    [quest, index],
  )
  const level = levelInfo(profile.xp)

  useEffect(() => {
    if (!isPowerUnlocked(powerId, level.level)) {
      setPowerId('hint')
    }
  }, [level.level, powerId])

  function startQuest(pack: QuestPack) {
    unlockAudio()
    pushStash(pack)
    setStash(loadStash())
    setEnrageLatched(false)
    startBattleMusic()

    const diff = DIFFICULTIES[difficulty]
    const bonuses = levelCombatBonuses(level.level)
    const pMax = diff.playerHp + bonuses.bonusMaxHp
    const bMax = diff.bossHp

    setQuest(pack)
    setIndex(0)
    setPlayerMaxHp(pMax)
    setBossMaxHp(bMax)
    setPlayerHp(pMax)
    setBossHp(bMax)
    setFeedback(null)
    setSelected(null)
    setScore(0)
    setCombo(0)
    setBestCombo(0)
    setCorrectCount(0)
    setHit(null)
    setPendingEnd(null)
    setSummary(null)
    setError(null)
    setPower(createPowerRuntime(powerId))
    setFocusWindup(false)
    setShakeOptions(false)
    setStage('battle')
  }

  function playPending() {
    const pack = consumePendingQuest()
    setPending(null)
    if (pack) startQuest(pack)
  }

  async function handleUpload(file: File | null) {
    if (!file) return
    setError(null)
    try {
      const text = await readQuestFile(file)
      const pack = parseQuestPack(text)
      startQuest(pack)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read quest file')
    }
  }

  function activatePower() {
    if (!power || !question || power.charges <= 0 || feedback) return
    playSfx('power')

    if (power.selected === 'hint') {
      const wrong = pickWrongOption(question.correctAnswerIndex)
      setPower({
        ...power,
        charges: 0,
        hintedWrongIndex: wrong,
      })
      return
    }

    if (power.selected === 'shield') {
      setPower({ ...power, charges: 0, shieldArmed: true })
      setHit({
        id: ++fxId.current,
        side: 'player',
        amount: 0,
        scoreGained: 0,
        killing: false,
        kind: 'shield',
        combo: 0,
      })
      return
    }

    if (power.selected === 'focus') {
      setFocusWindup(true)
      setPower({ ...power, charges: 0, focusArmed: true })
      window.setTimeout(() => setFocusWindup(false), 450)
    }
  }

  function handleAnswer(optionIndex: number) {
    if (!quest || !question || feedback || !power) return
    setSelected(optionIndex)
    const correct = optionIndex === question.correctAnswerIndex
    fxId.current += 1

    const diff = DIFFICULTIES[difficulty]
    const bonuses = levelCombatBonuses(level.level)
    const baseBossDmg = diff.damageToBoss + bonuses.bonusDamage

    if (correct) {
      const comboAfter = combo + 1
      const points = scoreForHit(comboAfter)
      const focused = power.focusArmed
      const dmg = focused ? baseBossDmg * 2 : baseBossDmg
      const nextBossHp = Math.max(0, bossHp - dmg)
      const kind = nextBossHp <= 0 ? 'crit' : focused ? 'focus' : 'hit'

      setCombo(comboAfter)
      setBestCombo(Math.max(bestCombo, comboAfter))
      setScore(score + points)
      setCorrectCount(correctCount + 1)
      setBossHp(nextBossHp)
      setPower({ ...power, focusArmed: false })
      setHit({
        id: fxId.current,
        side: 'boss',
        amount: dmg,
        scoreGained: points,
        killing: nextBossHp <= 0,
        kind,
        combo: comboAfter,
      })
      setFeedback({
        correct: true,
        explanation: question.explanation,
        points,
        comboAfter,
        damageDealt: dmg,
        damageTaken: 0,
      })
      setPendingEnd(nextBossHp <= 0 ? 'won' : null)

      if (nextBossHp <= 0) {
        playSfx('crit')
      } else {
        playSfx('hit', { combo: comboAfter })
        const enrageThreshold = bossMaxHp * 0.4
        if (!enrageLatched && nextBossHp <= enrageThreshold && nextBossHp > 0) {
          setEnrageLatched(true)
          setBattleMusicEnraged(true)
          playSfx('enrage', { delaySeconds: 0.05 })
        }
      }
    } else {
      const blocked = power.shieldArmed
      const taken = blocked ? 0 : diff.damageToPlayer
      const nextPlayerHp = Math.max(0, playerHp - taken)

      setCombo(0)
      setPlayerHp(nextPlayerHp)
      setPower({ ...power, shieldArmed: false })
      setShakeOptions(true)
      window.setTimeout(() => setShakeOptions(false), 400)
      setHit({
        id: fxId.current,
        side: 'player',
        amount: taken,
        scoreGained: 0,
        killing: nextPlayerHp <= 0,
        kind: blocked ? 'shield' : 'miss',
        combo: 0,
      })
      setFeedback({
        correct: false,
        explanation: question.explanation,
        points: 0,
        comboAfter: 0,
        damageDealt: 0,
        damageTaken: taken,
        blocked,
      })
      setPendingEnd(nextPlayerHp <= 0 ? 'defeated' : null)
      playSfx(blocked ? 'block' : 'miss')
    }
  }

  function finishRun(outcome: RunOutcome) {
    if (!quest) return
    stopBattleMusic()
    const flawless = outcome === 'won' && correctCount === quest.questions.length
    const finalScore = score + (flawless ? FLAWLESS_BONUS : 0)
    const result = recordRun(profile, {
      outcome,
      score: finalScore,
      correct: correctCount,
      total: quest.questions.length,
      bestStreak: bestCombo,
      flawless,
      difficulty,
    })
    saveProgress(result.progress)
    setProfile(result.progress)
    setSummary(result)
    setStage('ended')
    if (outcome === 'won') {
      playSfx('victory')
      if (result.levelAfter > result.levelBefore) {
        playSfx('levelup', { delaySeconds: 0.45 })
      }
      if (result.newlyUnlocked.length > 0) {
        playSfx('achievement', { delaySeconds: 0.7 })
      }
    } else if (outcome === 'defeated') {
      playSfx('defeat')
    } else {
      playSfx('escape')
    }
  }

  function handleNext() {
    if (!quest || !feedback) return
    if (pendingEnd) {
      finishRun(pendingEnd)
      return
    }
    if (index >= quest.questions.length - 1) {
      finishRun('escaped')
      return
    }
    setIndex(index + 1)
    setFeedback(null)
    setSelected(null)
    setHit(null)
    if (power) {
      setPower({ ...power, hintedWrongIndex: null })
    }
  }

  function resetToLobby() {
    stopBattleMusic()
    setEnrageLatched(false)
    setStage('lobby')
    setQuest(null)
    setFeedback(null)
    setSelected(null)
    setHit(null)
    setPendingEnd(null)
    setSummary(null)
    setError(null)
    setPower(null)
    setPending(peekPendingQuest())
    setStash(loadStash())
  }

  function toggleMute() {
    unlockAudio()
    const next = !mute
    setAudioMuted(next)
    setMute(next)
    if (!next) playSfx('ui')
  }

  if (stage === 'lobby') {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-3 text-center">
          <p className="font-display text-[9px] text-[var(--color-ember)]">
            Student Dungeon
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">Upload a quest. Defeat the boss.</h1>
          <p className="text-sm leading-relaxed text-[color-mix(in_srgb,var(--color-parchment)_70%,transparent)]">
            Pick a difficulty and a power, then fight. Combos, XP, and achievements —
            zero AI on this path.
          </p>
        </header>

        <div className="panel space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[8px] text-[var(--color-ember)]">
              Delver record
            </span>
            <span className="font-display text-[8px] text-[var(--color-moss-bright)]">
              Level {level.level}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden border-2 border-[var(--color-panel-edge)] bg-[#0d0b09]">
            <div
              className="h-full bg-[var(--color-moss-bright)] transition-all duration-500"
              style={{ width: `${level.pct}%` }}
            />
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[11px] text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
            <span>
              {level.into} / {level.span} XP
            </span>
            <span className="tabular-nums">
              Best {profile.bestScore.toLocaleString()} · Streak {profile.bestStreak}× · Runs{' '}
              {profile.runs}
            </span>
          </div>
          <button type="button" className="btn-secondary w-full text-sm" onClick={toggleMute}>
            Sound: {mute ? 'Off' : 'On'}
          </button>
        </div>

        <div className="panel space-y-3 p-4">
          <p className="text-sm font-semibold">Difficulty</p>
          <div className="grid gap-2">
            {DIFFICULTY_LIST.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                className={`border-3 px-3 py-2 text-left text-sm ${
                  difficulty === d.id
                    ? 'border-[var(--color-moss)] bg-[color-mix(in_srgb,var(--color-moss)_18%,transparent)]'
                    : 'border-[var(--color-panel-edge)]'
                }`}
              >
                <span className="font-semibold">{d.label}</span>
                <span className="mt-0.5 block text-xs text-[color-mix(in_srgb,var(--color-parchment)_60%,transparent)]">
                  {d.blurb}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel space-y-3 p-4">
          <PowerPicker level={level.level} selected={powerId} onSelect={setPowerId} />
        </div>

        {profile.achievements.length > 0 && (
          <div className="panel space-y-2 p-4">
            <p className="font-display text-[8px] text-[var(--color-ember)]">Achievements</p>
            <ul className="grid gap-1 text-xs sm:grid-cols-2">
              {ACHIEVEMENTS.map((a) => {
                const owned = profile.achievements.includes(a.id)
                return (
                  <li
                    key={a.id}
                    className={`border px-2 py-1 ${
                      owned
                        ? 'border-[var(--color-moss)] text-[var(--color-parchment)]'
                        : 'border-[var(--color-panel-edge)] opacity-40'
                    }`}
                  >
                    {owned ? '✓ ' : ''}
                    {a.label}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="panel space-y-5 p-6">
          {pending && (
            <button type="button" className="btn-ember w-full" onClick={playPending}>
              Play forged quest — {pending.questTitle}
            </button>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-semibold">Quest file</span>
            <input
              type="file"
              accept="application/json,.json"
              className="block w-full text-sm file:mr-3 file:border-0 file:bg-[var(--color-moss)] file:px-3 file:py-2 file:font-semibold file:text-[var(--color-parchment)]"
              onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="relative text-center text-xs text-[color-mix(in_srgb,var(--color-parchment)_45%,transparent)]">
            <span className="bg-[var(--color-panel)] px-2">or</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-[var(--color-panel-edge)]" />
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => startQuest(sampleQuest as QuestPack)}
          >
            Play sample quest
          </button>

          {stash.length > 0 && (
            <div className="space-y-2 border-t border-[var(--color-panel-edge)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
                Recent quests
              </p>
              {stash.map((entry) => (
                <button
                  key={`${entry.title}-${entry.savedAt}`}
                  type="button"
                  className="btn-secondary w-full text-left text-sm"
                  onClick={() => startQuest(entry.pack)}
                >
                  {entry.title}
                  <span className="mt-0.5 block text-[11px] opacity-70">vs {entry.bossName}</span>
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-[#f0c0c0]">{error}</p>}
        </div>
      </div>
    )
  }

  if (stage === 'ended' && summary) {
    return (
      <>
        <AchievementToast ids={summary.newlyUnlocked} />
        <RunSummary
          result={summary}
          bossName={quest?.bossName ?? 'The boss'}
          onRematch={() => quest && startQuest(quest)}
          onLobby={resetToLobby}
        />
      </>
    )
  }

  if (!quest || !question || !power) return null

  const isLastQuestion = index >= quest.questions.length - 1
  const ctaLabel =
    pendingEnd === 'won'
      ? 'Claim victory'
      : pendingEnd === 'defeated'
        ? 'Accept defeat'
        : isLastQuestion
          ? 'See results'
          : 'Next question'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="space-y-1 text-center">
        <p className="font-display text-[9px] text-[var(--color-ember)]">
          {quest.questTitle}
        </p>
        <h1 className="text-xl font-bold sm:text-2xl">vs {quest.bossName}</h1>
        <p className="text-xs text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
          Question {index + 1} / {quest.questions.length}
        </p>
      </header>

      <BattleStage
        bossName={quest.bossName}
        playerHp={playerHp}
        bossHp={bossHp}
        playerMaxHp={playerMaxHp}
        bossMaxHp={bossMaxHp}
        score={score}
        combo={combo}
        hit={hit}
        difficulty={difficulty}
        shieldActive={power.shieldArmed}
        focusWindup={focusWindup}
      />

      <div className="panel space-y-5 p-5 sm:p-6">
        {!feedback && (
          <PowerBar runtime={power} disabled={Boolean(feedback)} onActivate={activatePower} />
        )}

        <h2 className="text-lg font-semibold leading-snug">{question.question}</h2>
        <div className={`grid gap-3 ${shakeOptions ? 'options-shake' : ''}`}>
          {question.options.map((opt, oi) => {
            const isSelected = selected === oi
            const showResult = Boolean(feedback)
            const isCorrect = oi === question.correctAnswerIndex
            const hintedAway = power.hintedWrongIndex === oi && !feedback
            let extra = 'border-[var(--color-panel-edge)] hover:border-[var(--color-moss)]'
            if (hintedAway) {
              extra =
                'hint-fade border-[var(--color-panel-edge)] opacity-35 line-through pointer-events-none'
            } else if (showResult && isCorrect) {
              extra =
                'border-[var(--color-moss-bright)] bg-[color-mix(in_srgb,var(--color-moss)_25%,transparent)]'
            } else if (showResult && isSelected && !isCorrect) {
              extra =
                'border-[var(--color-blood)] bg-[color-mix(in_srgb,var(--color-blood)_25%,transparent)]'
            }

            return (
              <button
                key={oi}
                type="button"
                disabled={Boolean(feedback) || hintedAway}
                onClick={() => handleAnswer(oi)}
                className={`w-full border-3 px-4 py-3 text-left text-sm transition ${extra} disabled:cursor-default`}
                style={
                  hintedAway
                    ? { animationDelay: `${oi * 60}ms` }
                    : undefined
                }
              >
                <span className="mr-2 font-semibold text-[var(--color-ember)]">
                  {String.fromCharCode(65 + oi)}.
                </span>
                {opt}
              </button>
            )
          })}
        </div>

        {feedback && (
          <div
            className={`space-y-3 border-t border-[var(--color-panel-edge)] pt-4 ${
              feedback.correct ? 'text-[var(--color-moss-bright)]' : 'text-[#f0c0c0]'
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-semibold">
                {feedback.correct
                  ? `Hit! −${feedback.damageDealt} boss HP`
                  : feedback.blocked
                    ? 'Shield held! No damage'
                    : `Miss! −${feedback.damageTaken} your HP`}
              </p>
              {feedback.correct && feedback.comboAfter >= 2 && (
                <p className="font-display text-[8px] text-[var(--color-ember-bright)]">
                  {feedback.comboAfter}× combo · +{feedback.points} pts
                </p>
              )}
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-parchment)]">
              {feedback.explanation}
            </p>
            <button type="button" className="btn-primary" onClick={handleNext}>
              {ctaLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
