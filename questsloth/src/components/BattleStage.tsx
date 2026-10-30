import { HpBar } from './HpBar'
import { PixelSprite } from './PixelSprite'
import {
  BOSS_PALETTE,
  BOSS_PALETTE_ENRAGED,
  BOSS_SPRITE,
  HERO_PALETTE,
  HERO_SPRITE,
} from '../lib/sprites'
import type { DifficultyId } from '../lib/difficulty'
import { DIFFICULTIES } from '../lib/difficulty'

export type FxKind = 'hit' | 'miss' | 'crit' | 'shield' | 'focus'

export type HitFx = {
  id: number
  side: 'player' | 'boss'
  amount: number
  scoreGained: number
  killing: boolean
  kind: FxKind
  combo: number
}

type BattleStageProps = {
  bossName: string
  playerHp: number
  bossHp: number
  playerMaxHp: number
  bossMaxHp: number
  score: number
  combo: number
  hit: HitFx | null
  difficulty: DifficultyId
  shieldActive?: boolean
  focusWindup?: boolean
}

export function BattleStage({
  bossName,
  playerHp,
  bossHp,
  playerMaxHp,
  bossMaxHp,
  score,
  combo,
  hit,
  difficulty,
  shieldActive = false,
  focusWindup = false,
}: BattleStageProps) {
  const bossFound = bossHp <= 0
  const heroFound = playerHp <= 0
  const enraged = !bossFound && bossHp <= bossMaxHp * 0.4
  const bossHit = hit?.side === 'boss' ? hit : null
  const heroHit = hit?.side === 'player' ? hit : null
  const stageClass = [
    'relative h-56 overflow-hidden bg-[linear-gradient(180deg,#161225_0%,#1d1826_48%,#141a15_100%)] sm:h-72',
    bossHit && bossHit.kind !== 'miss' ? 'stage-punch' : '',
    heroHit ? 'stage-shake-hard' : '',
    bossHit?.killing ? 'stage-flash' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const showParticles = Boolean(bossHit && bossHit.combo >= 3)

  return (
    <section className="panel battle-enter overflow-hidden">
      <div className={stageClass} key={hit ? `stage-${hit.id}` : 'stage-idle'}>
        <div aria-hidden className="stage-starfield absolute inset-0" />
        <div
          aria-hidden
          className="absolute inset-x-0 top-[18%] h-24 bg-[radial-gradient(ellipse_at_78%_50%,color-mix(in_srgb,var(--color-boss)_45%,transparent),transparent_68%)]"
        />
        <div aria-hidden className="stage-ground absolute inset-x-0 bottom-0 h-[34%]" />

        <div className="absolute left-3 top-3 z-20 flex items-baseline gap-2 border-2 border-[var(--color-panel-edge)] bg-[#0d0b09]/80 px-2 py-1">
          <span className="font-display text-[7px] text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
            score
          </span>
          <span
            key={score}
            className={`font-display text-[10px] tabular-nums text-[var(--color-parchment)] ${
              score > 0 ? 'score-pop' : ''
            }`}
          >
            {score.toLocaleString()}
          </span>
        </div>

        <div className="absolute right-3 top-3 z-20 border-2 border-[var(--color-panel-edge)] bg-[#0d0b09]/80 px-2 py-1 font-display text-[7px] text-[var(--color-parchment)]">
          {DIFFICULTIES[difficulty].label}
        </div>

        {combo >= 2 && (
          <div
            key={`combo-${combo}`}
            className={`combo-badge absolute left-1/2 top-2 z-20 -translate-x-1/2 border-2 border-[var(--color-ember)] bg-[color-mix(in_srgb,var(--color-ember)_22%,transparent)] px-2 py-1 font-display text-[8px] text-[var(--color-ember-bright)] ${
              combo >= 3 ? 'combo-surge' : ''
            }`}
          >
            {combo}× combo
          </div>
        )}

        {enraged && (
          <div className="absolute right-3 top-10 z-20 border-2 border-[var(--color-blood)] bg-[color-mix(in_srgb,var(--color-blood)_18%,transparent)] px-2 py-1 font-display text-[7px] text-[#ff9b9b]">
            enraged
          </div>
        )}

        <div className="absolute bottom-[33%] left-3 z-10 sm:left-9">
          {shieldActive && (
            <span
              aria-hidden
              className="shield-bubble pointer-events-none absolute inset-[-20%] rounded-full border-4 border-cyan-300/80"
            />
          )}
          <div className={heroFound ? 'hero-fall' : 'sprite-idle'}>
            <div
              key={
                focusWindup
                  ? `focus-${hit?.id ?? 0}`
                  : heroHit
                    ? `hero-hit-${heroHit.id}`
                    : bossHit
                      ? `hero-strike-${bossHit.id}`
                      : 'hero-idle'
              }
              className={
                focusWindup
                  ? 'sprite-focus-windup'
                  : heroHit
                    ? 'sprite-knockback'
                    : bossHit
                      ? bossHit.kind === 'focus' || bossHit.kind === 'crit'
                        ? 'sprite-strike-heavy'
                        : 'sprite-strike'
                      : ''
              }
            >
              {bossHit && (
                <span aria-hidden className="slash-arc pointer-events-none absolute inset-0" />
              )}
              <PixelSprite
                grid={HERO_SPRITE}
                palette={HERO_PALETTE}
                className="h-24 w-24 drop-shadow-[0_6px_0_rgba(0,0,0,0.35)] sm:h-32 sm:w-32"
              />
            </div>
          </div>

          {heroHit && (
            <>
              <span
                key={`hero-dmg-${heroHit.id}`}
                className={`damage-number absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-full flex-col items-center whitespace-nowrap font-display text-[#ff9b9b] ${
                  heroHit.killing ? 'text-base' : 'text-xs'
                }`}
              >
                {heroHit.amount === 0 ? 'BLOCKED' : `−${heroHit.amount}`}
              </span>
              <span
                key={`hero-ring-${heroHit.id}`}
                className="impact-ring absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[var(--color-blood)]"
              />
            </>
          )}
        </div>

        <div className="absolute bottom-[33%] right-3 z-10 sm:right-9">
          {enraged && (
            <div
              aria-hidden
              className="enrage-aura enrage-breathe pointer-events-none absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-blood)_55%,transparent),transparent_70%)]"
            />
          )}
          <div className={bossFound ? 'boss-fall' : 'sprite-idle-slow'}>
            <div
              key={bossHit ? `boss-hit-${bossHit.id}` : 'boss-idle'}
              className={bossHit ? 'sprite-recoil boss-hit-stun' : ''}
            >
              <PixelSprite
                grid={BOSS_SPRITE}
                palette={enraged ? BOSS_PALETTE_ENRAGED : BOSS_PALETTE}
                className="relative h-28 w-28 drop-shadow-[0_8px_0_rgba(0,0,0,0.4)] sm:h-36 sm:w-36"
              />
            </div>
          </div>

          {bossHit && (
            <>
              <span
                key={`boss-dmg-${bossHit.id}`}
                className={`damage-number absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-full flex-col items-center whitespace-nowrap font-display ${
                  bossHit.killing || bossHit.kind === 'crit'
                    ? 'crit-bloom text-base text-[#ffd75e]'
                    : 'text-xs text-[var(--color-ember-bright)]'
                }`}
              >
                −{bossHit.amount}
                {bossHit.scoreGained > 0 && (
                  <span className="mt-1 text-[8px] text-[var(--color-moss-bright)]">
                    +{bossHit.scoreGained}
                  </span>
                )}
              </span>
              <span
                key={`boss-ring-${bossHit.id}`}
                className={`impact-ring absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 ${
                  bossHit.killing
                    ? 'border-[#ffd75e]'
                    : 'border-[var(--color-ember-bright)]'
                }`}
              />
            </>
          )}

          {showParticles && (
            <div aria-hidden className="combo-particles pointer-events-none absolute inset-0">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={`${bossHit?.id}-p-${i}`} className={`ember-dot ember-dot-${i + 1}`} />
              ))}
            </div>
          )}
        </div>

        {heroHit && <div aria-hidden className="stage-vignette absolute inset-0 z-10" />}
      </div>

      <div className="space-y-3 border-t-3 border-[var(--color-panel-edge)] bg-[color-mix(in_srgb,var(--color-panel)_92%,transparent)] p-4">
        <HpBar
          label="You"
          hp={playerHp}
          maxHp={playerMaxHp}
          variant="player"
          flash={Boolean(heroHit)}
        />
        <HpBar
          label={bossName}
          hp={bossHp}
          maxHp={bossMaxHp}
          variant="boss"
          flash={Boolean(bossHit)}
        />
      </div>
    </section>
  )
}
