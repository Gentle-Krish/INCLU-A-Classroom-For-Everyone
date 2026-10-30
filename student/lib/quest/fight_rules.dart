// Copyright (c) 2026 QuestSloth contributors
// Fight rules adapted from QuestSloth src/lib/difficulty.ts, src/lib/powers.ts,
// src/lib/progress.ts, and the answer resolution in src/pages/Dungeon.tsx.

enum DifficultyId { easy, normal, hard }

class DifficultyConfig {
  const DifficultyConfig({
    required this.id,
    required this.label,
    required this.playerHp,
    required this.bossHp,
    required this.damageToBoss,
    required this.damageToPlayer,
  });

  final DifficultyId id;
  final String label;
  final int playerHp;
  final int bossHp;
  final int damageToBoss;
  final int damageToPlayer;
}

const difficulties = <DifficultyId, DifficultyConfig>{
  DifficultyId.easy: DifficultyConfig(
    id: DifficultyId.easy,
    label: 'Easy',
    playerHp: 120,
    bossHp: 80,
    damageToBoss: 25,
    damageToPlayer: 15,
  ),
  DifficultyId.normal: DifficultyConfig(
    id: DifficultyId.normal,
    label: 'Normal',
    playerHp: 100,
    bossHp: 100,
    damageToBoss: 20,
    damageToPlayer: 20,
  ),
  DifficultyId.hard: DifficultyConfig(
    id: DifficultyId.hard,
    label: 'Hard',
    playerHp: 80,
    bossHp: 120,
    damageToBoss: 15,
    damageToPlayer: 25,
  ),
};

enum PowerId { hint, shield, focus }

class PowerDef {
  const PowerDef({
    required this.id,
    required this.label,
    required this.blurb,
    required this.minLevel,
  });

  final PowerId id;
  final String label;
  final String blurb;
  final int minLevel;
}

const powers = <PowerId, PowerDef>{
  PowerId.hint: PowerDef(
    id: PowerId.hint,
    label: 'Hint',
    blurb: 'Grey out one wrong option.',
    minLevel: 1,
  ),
  PowerId.shield: PowerDef(
    id: PowerId.shield,
    label: 'Shield',
    blurb: 'Block the next miss.',
    minLevel: 2,
  ),
  PowerId.focus: PowerDef(
    id: PowerId.focus,
    label: 'Focus',
    blurb: 'The next hit deals double damage.',
    minLevel: 2,
  ),
};

bool isPowerUnlocked(PowerId id, int level) => level >= powers[id]!.minLevel;

class LevelBonuses {
  const LevelBonuses({required this.bonusDamage, required this.bonusMaxHp});

  final int bonusDamage;
  final int bonusMaxHp;
}

LevelBonuses levelCombatBonuses(int level) {
  final safe = level < 1 ? 1 : level;
  final steps = safe - 1;
  return LevelBonuses(
    bonusDamage: steps * 2 > 10 ? 10 : steps * 2,
    bonusMaxHp: steps * 4 > 20 ? 20 : steps * 4,
  );
}

const scorePerHit = 100;
const comboBonus = 25;
const flawlessBonus = 500;

int scoreForHit(int streak) {
  final extra = streak - 1;
  return scorePerHit + comboBonus * (extra < 0 ? 0 : extra);
}

int pickWrongOption(int correct, {int optionCount = 4, int roll = 0}) {
  final wrong = <int>[for (var i = 0; i < optionCount; i++) if (i != correct) i];
  if (wrong.isEmpty) return 0;
  final index = roll < 0 ? 0 : roll % wrong.length;
  return wrong[index];
}

class PowerRuntime {
  const PowerRuntime({
    required this.selected,
    this.charges = 1,
    this.hintedWrongIndex,
    this.shieldArmed = false,
    this.focusArmed = false,
  });

  final PowerId selected;
  final int charges;
  final int? hintedWrongIndex;
  final bool shieldArmed;
  final bool focusArmed;

  PowerRuntime copy({
    int? charges,
    int? hintedWrongIndex,
    bool clearHint = false,
    bool? shieldArmed,
    bool? focusArmed,
  }) {
    return PowerRuntime(
      selected: selected,
      charges: charges ?? this.charges,
      hintedWrongIndex: clearHint ? null : hintedWrongIndex ?? this.hintedWrongIndex,
      shieldArmed: shieldArmed ?? this.shieldArmed,
      focusArmed: focusArmed ?? this.focusArmed,
    );
  }
}

enum RunOutcome { won, escaped, defeated }

class Duel {
  const Duel({
    required this.difficulty,
    required this.level,
    required this.questionCount,
    required this.playerHp,
    required this.playerMax,
    required this.bossHp,
    required this.bossMax,
    required this.score,
    required this.combo,
    required this.bestCombo,
    required this.correctCount,
    required this.index,
    required this.power,
    this.pending,
    this.outcome,
    this.locked = false,
    this.finished = false,
  });

  final DifficultyId difficulty;
  final int level;
  final int questionCount;
  final int playerHp;
  final int playerMax;
  final int bossHp;
  final int bossMax;
  final int score;
  final int combo;
  final int bestCombo;
  final int correctCount;
  final int index;
  final PowerRuntime power;
  final RunOutcome? pending;
  final RunOutcome? outcome;
  final bool locked;
  final bool finished;

  int get finalScore {
    final flawless = outcome == RunOutcome.won && correctCount == questionCount;
    return score + (flawless ? flawlessBonus : 0);
  }

  factory Duel.start({
    required DifficultyId difficulty,
    required PowerId power,
    required int level,
    required int questionCount,
  }) {
    final diff = difficulties[difficulty]!;
    final bonus = levelCombatBonuses(level);
    final playerMax = diff.playerHp + bonus.bonusMaxHp;
    return Duel(
      difficulty: difficulty,
      level: level < 1 ? 1 : level,
      questionCount: questionCount,
      playerHp: playerMax,
      playerMax: playerMax,
      bossHp: diff.bossHp,
      bossMax: diff.bossHp,
      score: 0,
      combo: 0,
      bestCombo: 0,
      correctCount: 0,
      index: 0,
      power: PowerRuntime(selected: isPowerUnlocked(power, level) ? power : PowerId.hint),
    );
  }

  Duel copy({
    int? playerHp,
    int? bossHp,
    int? score,
    int? combo,
    int? bestCombo,
    int? correctCount,
    int? index,
    PowerRuntime? power,
    RunOutcome? pending,
    bool clearPending = false,
    RunOutcome? outcome,
    bool? locked,
    bool? finished,
  }) {
    return Duel(
      difficulty: difficulty,
      level: level,
      questionCount: questionCount,
      playerHp: playerHp ?? this.playerHp,
      playerMax: playerMax,
      bossHp: bossHp ?? this.bossHp,
      bossMax: bossMax,
      score: score ?? this.score,
      combo: combo ?? this.combo,
      bestCombo: bestCombo ?? this.bestCombo,
      correctCount: correctCount ?? this.correctCount,
      index: index ?? this.index,
      power: power ?? this.power,
      pending: clearPending ? null : pending ?? this.pending,
      outcome: outcome ?? this.outcome,
      locked: locked ?? this.locked,
      finished: finished ?? this.finished,
    );
  }

  Duel activate({int roll = 0, required int correctIndex}) {
    if (locked || finished || power.charges <= 0) return this;
    if (power.selected == PowerId.hint) {
      return copy(
        power: power.copy(
          charges: 0,
          hintedWrongIndex: pickWrongOption(correctIndex, roll: roll),
        ),
      );
    }
    if (power.selected == PowerId.shield) {
      return copy(power: power.copy(charges: 0, shieldArmed: true));
    }
    return copy(power: power.copy(charges: 0, focusArmed: true));
  }
}

class AnswerResult {
  const AnswerResult({
    required this.duel,
    required this.applied,
    required this.correct,
    required this.points,
    required this.damageDealt,
    required this.damageTaken,
    required this.blocked,
  });

  final Duel duel;
  final bool applied;
  final bool correct;
  final int points;
  final int damageDealt;
  final int damageTaken;
  final bool blocked;
}

AnswerResult answerQuestion(Duel duel, {required int optionIndex, required int correctIndex}) {
  if (duel.locked || duel.finished || optionIndex < 0 || optionIndex > 3) {
    return AnswerResult(
      duel: duel,
      applied: false,
      correct: false,
      points: 0,
      damageDealt: 0,
      damageTaken: 0,
      blocked: false,
    );
  }
  final diff = difficulties[duel.difficulty]!;
  final bonus = levelCombatBonuses(duel.level);
  final correct = optionIndex == correctIndex;
  if (correct) {
    final comboAfter = duel.combo + 1;
    final points = scoreForHit(comboAfter);
    final damage = (diff.damageToBoss + bonus.bonusDamage) * (duel.power.focusArmed ? 2 : 1);
    final nextBoss = (duel.bossHp - damage) < 0 ? 0 : duel.bossHp - damage;
    return AnswerResult(
      applied: true,
      correct: true,
      points: points,
      damageDealt: damage,
      damageTaken: 0,
      blocked: false,
      duel: duel.copy(
        combo: comboAfter,
        bestCombo: comboAfter > duel.bestCombo ? comboAfter : duel.bestCombo,
        score: duel.score + points,
        correctCount: duel.correctCount + 1,
        bossHp: nextBoss,
        pending: nextBoss <= 0 ? RunOutcome.won : null,
        clearPending: nextBoss > 0,
        locked: true,
        power: duel.power.copy(focusArmed: false),
      ),
    );
  }
  final blocked = duel.power.shieldArmed;
  final taken = blocked ? 0 : diff.damageToPlayer;
  final nextPlayer = (duel.playerHp - taken) < 0 ? 0 : duel.playerHp - taken;
  return AnswerResult(
    applied: true,
    correct: false,
    points: 0,
    damageDealt: 0,
    damageTaken: taken,
    blocked: blocked,
    duel: duel.copy(
      combo: 0,
      playerHp: nextPlayer,
      pending: nextPlayer <= 0 ? RunOutcome.defeated : null,
      clearPending: nextPlayer > 0,
      locked: true,
      power: duel.power.copy(shieldArmed: false),
    ),
  );
}

Duel releaseDuel(Duel duel) {
  if (!duel.locked || duel.finished) return duel;
  if (duel.pending != null) {
    return duel.copy(outcome: duel.pending, finished: true, locked: true);
  }
  if (duel.index >= duel.questionCount - 1) {
    return duel.copy(outcome: RunOutcome.escaped, finished: true, locked: true);
  }
  return duel.copy(
    index: duel.index + 1,
    locked: false,
    power: duel.power.copy(clearHint: true),
  );
}
