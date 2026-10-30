import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/chalk_theme.dart';
import '../widgets/clay_bot.dart';
import '../widgets/clay_button.dart';
import '../widgets/cream_scaffold.dart';
import 'fight_rules.dart';
import 'quest_mouth.dart';
import 'quest_pack.dart';
import 'spoken_option.dart';
import '../screens/ask_board_screen.dart';

enum QuestMode { fight, listen }

class QuestAnswerReport {
  const QuestAnswerReport({
    required this.questId,
    required this.runId,
    required this.questionIndex,
    required this.optionIndex,
    required this.mode,
    required this.score,
    required this.finished,
  });

  final String questId;
  final String runId;
  final int questionIndex;
  final int optionIndex;
  final String mode;
  final int score;
  final bool finished;
}

class QuestPlayScreen extends StatefulWidget {
  const QuestPlayScreen({
    super.key,
    required this.quest,
    required this.mode,
    required this.onAnswer,
    this.onAsk,
    this.mouth,
    this.level = 1,
    this.buzz,
  });

  final QuestPack quest;
  final QuestMode mode;
  final Future<void> Function(QuestAnswerReport report) onAnswer;
  final Future<void> Function(String text, String lessonPart)? onAsk;
  final QuestMouth? mouth;
  final int level;
  final Future<void> Function(bool correct)? buzz;

  @override
  State<QuestPlayScreen> createState() => _QuestPlayScreenState();
}

class _QuestPlayScreenState extends State<QuestPlayScreen> {
  late final String _runId = 'run_${DateTime.now().microsecondsSinceEpoch}';
  late final QuestMouth _mouth = widget.mouth ?? DeviceQuestMouth();
  DifficultyId _difficulty = DifficultyId.normal;
  PowerId _power = PowerId.hint;
  Duel? _duel;
  String? _feedback;
  bool _correct = false;
  bool _busy = false;
  int _listenGeneration = 0;

  bool get _setup => widget.mode == QuestMode.fight && _duel == null;

  @override
  void initState() {
    super.initState();
    if (widget.mode == QuestMode.listen) {
      _duel = Duel.start(
        difficulty: DifficultyId.normal,
        power: PowerId.hint,
        level: widget.level,
        questionCount: widget.quest.questions.length,
      );
      WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_listen()));
    }
  }

  QuestQuestion? get _question {
    final duel = _duel;
    if (duel == null || duel.finished || duel.index >= widget.quest.questions.length) return null;
    return widget.quest.questions[duel.index];
  }

  Future<void> _buzz(bool correct) async {
    final custom = widget.buzz;
    if (custom != null) {
      await custom(correct);
      return;
    }
    await HapticFeedback.mediumImpact();
    if (!correct) {
      await Future<void>.delayed(const Duration(milliseconds: 280));
      await HapticFeedback.mediumImpact();
    }
  }

  void _startFight() {
    setState(() {
      _duel = Duel.start(
        difficulty: _difficulty,
        power: _power,
        level: widget.level,
        questionCount: widget.quest.questions.length,
      );
      _feedback = null;
    });
  }

  Future<void> _choose(int optionIndex) async {
    final duel = _duel;
    final question = _question;
    if (duel == null || question == null || _busy || duel.locked) return;
    final result = answerQuestion(
      duel,
      optionIndex: optionIndex,
      correctIndex: question.correctAnswerIndex,
    );
    if (!result.applied) return;
    final finished = result.duel.pending != null || result.duel.index >= result.duel.questionCount - 1;
    final score = finished ? _finishedScore(result.duel) : result.duel.score;
    setState(() {
      _duel = result.duel;
      _feedback = result.correct
          ? 'Hit. ${question.explanation}'
          : (result.blocked ? 'Shield held. ${question.explanation}' : 'Miss. ${question.explanation}');
      _correct = result.correct;
    });
    if (widget.mode == QuestMode.fight && result.correct) {
      SystemSound.play(SystemSoundType.click);
    }
    if (widget.mode == QuestMode.listen) await _buzz(result.correct);
    await widget.onAnswer(
      QuestAnswerReport(
        questId: widget.quest.id,
        runId: _runId,
        questionIndex: result.duel.index,
        optionIndex: optionIndex,
        mode: widget.mode == QuestMode.listen ? 'listen' : 'fight',
        score: score,
        finished: finished,
      ),
    );
    if (!mounted) return;
    if (widget.mode == QuestMode.listen) {
      await _mouth.speak(result.correct ? 'Right. ${question.explanation}' : 'Wrong. ${question.explanation}');
      if (!mounted) return;
      _advance();
      await _listen();
    }
  }

  int _finishedScore(Duel duel) {
    final wonAll = duel.pending == RunOutcome.won && duel.correctCount == duel.questionCount;
    return duel.score + (wonAll ? flawlessBonus : 0);
  }

  void _advance() {
    final duel = _duel;
    if (duel == null) return;
    setState(() {
      _duel = releaseDuel(duel);
      _feedback = null;
    });
  }

  Future<void> _listen() async {
    if (widget.mode != QuestMode.listen || !mounted) return;
    final question = _question;
    final duel = _duel;
    if (question == null || duel == null || duel.finished) return;
    final generation = ++_listenGeneration;
    setState(() => _busy = true);
    await _mouth.speak(
      spokenQuestion(
        question: question.question,
        options: question.options,
        skipIndex: duel.power.hintedWrongIndex,
      ),
    );
    if (!mounted || generation != _listenGeneration) return;
    var index = optionFromSpeech(await _mouth.listenOnce());
    if (index == null) {
      await _mouth.speak('Say one, two, three, or four');
      if (!mounted || generation != _listenGeneration) return;
      index = optionFromSpeech(await _mouth.listenOnce());
    }
    if (!mounted || generation != _listenGeneration) return;
    setState(() => _busy = false);
    if (index == null) return;
    await _choose(index);
  }

  void _usePower() {
    final duel = _duel;
    final question = _question;
    if (duel == null || question == null) return;
    setState(() {
      _duel = duel.activate(
        correctIndex: question.correctAnswerIndex,
        roll: Random().nextInt(3),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_setup) return _setupScreen();
    final duel = _duel;
    if (duel != null && duel.finished) return _summary(duel);
    return _play(duel!);
  }

  Widget _setupScreen() {
    return CreamScaffold(
      child: CenteredClayBody(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ClayBot(size: 120),
            const SizedBox(height: 12),
            Text(widget.quest.questTitle, style: chalkTitle, textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text('vs ${widget.quest.bossName}', style: chalkSubtitle, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            for (final difficulty in DifficultyId.values)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ClayButton(
                  label: difficulties[difficulty]!.label,
                  color: _difficulty == difficulty ? ChalkColors.peach : ChalkColors.creamButton,
                  lip: _difficulty == difficulty ? ChalkColors.peachLip : ChalkColors.creamLip,
                  foreground: _difficulty == difficulty ? Colors.white : ChalkColors.ink,
                  onPressed: () => setState(() => _difficulty = difficulty),
                ),
              ),
            const SizedBox(height: 8),
            for (final power in PowerId.values)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ClayButton(
                  label: isPowerUnlocked(power, widget.level)
                      ? powers[power]!.label
                      : '${powers[power]!.label} locked',
                  color: _power == power ? ChalkColors.green : ChalkColors.creamButton,
                  lip: _power == power ? ChalkColors.greenLip : ChalkColors.creamLip,
                  foreground: _power == power ? Colors.white : ChalkColors.ink,
                  onPressed: isPowerUnlocked(power, widget.level)
                      ? () => setState(() => _power = power)
                      : null,
                ),
              ),
            const SizedBox(height: 8),
            ClayButton(label: 'Start', onPressed: _startFight),
          ],
        ),
      ),
    );
  }

  Widget _play(Duel duel) {
    final question = _question;
    final canTap = widget.mode == QuestMode.fight && _feedback == null && !_busy;
    return CreamScaffold(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
        child: Column(
          children: [
            const ClayBot(size: 112),
            const SizedBox(height: 8),
            Text(widget.quest.questTitle, style: chalkSubtitle, textAlign: TextAlign.center),
            Text('vs ${widget.quest.bossName}', style: chalkTitle, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            _bar('You', duel.playerHp, duel.playerMax, ChalkColors.green),
            const SizedBox(height: 8),
            _bar(widget.quest.bossName, duel.bossHp, duel.bossMax, ChalkColors.peach),
            const SizedBox(height: 16),
            if (question != null) ...[
              Text(
                'Question ${duel.index + 1} of ${widget.quest.questions.length}',
                style: chalkSubtitle,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(question.question, style: chalkTitle, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              for (var i = 0; i < question.options.length; i++)
                _option(
                  label: question.options[i],
                  enabled: canTap && duel.power.hintedWrongIndex != i,
                  dimmed: duel.power.hintedWrongIndex == i,
                  onTap: () => unawaited(_choose(i)),
                ),
            ],
            if (_feedback != null) ...[
              const SizedBox(height: 8),
              Text(_feedback!, style: chalkSubtitle, textAlign: TextAlign.center),
              if (widget.mode == QuestMode.fight) ...[
                const SizedBox(height: 12),
                ClayButton(label: 'Next', onPressed: _advance),
              ],
            ],
            if (widget.mode == QuestMode.fight && _feedback == null && duel.power.charges > 0) ...[
              const SizedBox(height: 8),
              ClayButton(
                label: powers[duel.power.selected]!.label,
                color: ChalkColors.creamButton,
                lip: ChalkColors.creamLip,
                foreground: ChalkColors.ink,
                onPressed: _usePower,
              ),
            ],
            const SizedBox(height: 8),
            ClayButton(
              label: 'Ask the board',
              color: ChalkColors.creamButton,
              lip: ChalkColors.creamLip,
              foreground: ChalkColors.ink,
              onPressed: question == null
                  ? null
                  : () {
                      final part = question.lessonPart;
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => AskBoardScreen(
                            lessonPart: part,
                            onSend: (text) async {
                              await widget.onAsk?.call(text, part);
                            },
                          ),
                        ),
                      );
                    },
            ),
          ],
        ),
      ),
    );
  }

  Widget _summary(Duel duel) {
    final title = switch (duel.outcome) {
      RunOutcome.won => 'You did it',
      RunOutcome.defeated => 'The clay boss is still standing',
      _ => 'You finished the questions',
    };
    return CreamScaffold(
      child: CenteredClayBody(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ClayBot(size: 140),
            const SizedBox(height: 12),
            Text(title, style: chalkTitle, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text('Score ${duel.finalScore}', style: chalkSubtitle, textAlign: TextAlign.center),
            const SizedBox(height: 18),
            ClayButton(label: 'Back to class', onPressed: () => Navigator.of(context).pop(duel.finalScore)),
          ],
        ),
      ),
    );
  }

  Widget _bar(String label, int hp, int max, Color color) {
    final value = max <= 0 ? 0.0 : (hp / max).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('$label  $hp', style: const TextStyle(fontWeight: FontWeight.w800, color: ChalkColors.ink)),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: LinearProgressIndicator(
            value: value,
            minHeight: 14,
            backgroundColor: ChalkColors.box,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _option({
    required String label,
    required bool enabled,
    required bool dimmed,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Opacity(
        opacity: dimmed ? 0.45 : 1,
        child: Material(
          color: ChalkColors.field,
          borderRadius: BorderRadius.circular(28),
          child: InkWell(
            onTap: enabled ? onTap : null,
            borderRadius: BorderRadius.circular(28),
            child: Container(
              width: double.infinity,
              constraints: const BoxConstraints(minHeight: 64),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: ChalkColors.peach, width: 2),
              ),
              alignment: Alignment.center,
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: ChalkColors.ink,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
