import 'package:chalk_student/quest/fight_rules.dart';
import 'package:chalk_student/quest/spoken_option.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('a hit, a combo, a miss, a shield, and a focus strike follow the quest rules', () {
    var duel = Duel.start(
      difficulty: DifficultyId.normal,
      power: PowerId.hint,
      level: 1,
      questionCount: 5,
    );
    final first = answerQuestion(duel, optionIndex: 1, correctIndex: 1);
    expect(first.correct, isTrue);
    expect(first.points, 100);
    expect(first.damageDealt, 20);
    expect(first.duel.bossHp, 80);

    final second = answerQuestion(
      first.duel.copy(locked: false),
      optionIndex: 1,
      correctIndex: 1,
    );
    expect(second.points, 125);
    expect(second.duel.combo, 2);

    final miss = answerQuestion(duel, optionIndex: 0, correctIndex: 1);
    expect(miss.correct, isFalse);
    expect(miss.damageTaken, 20);
    expect(miss.duel.playerHp, 80);
    expect(miss.duel.combo, 0);

    final shielded = answerQuestion(
      duel.activate(correctIndex: 1).copy(power: const PowerRuntime(selected: PowerId.shield, charges: 0, shieldArmed: true)),
      optionIndex: 0,
      correctIndex: 1,
    );
    expect(shielded.blocked, isTrue);
    expect(shielded.damageTaken, 0);
    expect(shielded.duel.playerHp, 100);

    final focused = answerQuestion(
      duel.copy(power: const PowerRuntime(selected: PowerId.focus, charges: 0, focusArmed: true)),
      optionIndex: 1,
      correctIndex: 1,
    );
    expect(focused.damageDealt, 40);

    expect(isPowerUnlocked(PowerId.shield, 1), isFalse);
    expect(isPowerUnlocked(PowerId.hint, 1), isTrue);
    expect(duel.activate(correctIndex: 1, roll: 0).power.hintedWrongIndex, isNot(1));
    expect(scoreForHit(1), 100);
    expect(scoreForHit(3), 150);
  });

  test('spoken one two three and four choose an option', () {
    expect(optionFromSpeech('two'), 1);
    expect(optionFromSpeech('I mean four'), 3);
    expect(optionFromSpeech('one two'), 1);
    expect(optionFromSpeech('hello'), isNull);
    expect(spokenQuestion(question: 'What pumps blood?', options: ['Leaves', 'Heart', 'Roots', 'Flower']), contains('two. Heart'));
  });
}
