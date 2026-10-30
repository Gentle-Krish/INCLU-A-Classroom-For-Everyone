import 'package:flutter/material.dart';

import '../quest/quest_pack.dart';
import '../quest/quest_play_screen.dart';
import '../theme/chalk_theme.dart';
import '../widgets/clay_bot.dart';
import '../widgets/clay_button.dart';
import '../widgets/cream_scaffold.dart';
import 'revise_notes_screen.dart';
import 'class_notes_screen.dart';

class ConnectedScreen extends StatelessWidget {
  const ConnectedScreen({
    super.key,
    required this.room,
    required this.name,
    this.started = false,
    this.quests = const [],
    this.liveQuestId,
    this.liveClosed = false,
    this.notes = '',
    this.scores = const {},
    this.onPlay,
    this.onAsk,
  });

  final String room;
  final String name;
  final bool started;
  final List<QuestPack> quests;
  final String? liveQuestId;
  final bool liveClosed;
  final String notes;
  final Map<String, int> scores;
  final void Function(QuestPack quest, QuestMode mode)? onPlay;
  final VoidCallback? onAsk;

  @override
  Widget build(BuildContext context) {
    final status = started
        ? 'Class started. Waiting for the teacher.'
        : 'Waiting for the teacher';
    return CreamScaffold(
      resizeToAvoidBottomInset: false,
      child: CenteredClayBody(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const ClayBot(size: 168),
            const SizedBox(height: 18),
            const Text("You're in", style: chalkTitle, textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text(status, style: chalkSubtitle, textAlign: TextAlign.center),
            const SizedBox(height: 22),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 20),
              decoration: BoxDecoration(
                color: ChalkColors.creamDeep,
                borderRadius: BorderRadius.circular(40),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x12000000),
                    blurRadius: 18,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                children: [
                  const Text(
                    'CLASS CODE',
                    style: TextStyle(
                      color: ChalkColors.brown,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      letterSpacing: 1.4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    room,
                    style: const TextStyle(
                      color: ChalkColors.brownDeep,
                      fontSize: 48,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.fromLTRB(6, 6, 16, 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x12000000),
                    blurRadius: 12,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: const BoxDecoration(
                      color: ChalkColors.green,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.star, color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    name,
                    style: const TextStyle(
                      color: ChalkColors.ink,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            _QuestEntry(
              quests: quests,
              liveQuestId: liveQuestId,
              liveClosed: liveClosed,
              scores: scores,
              onPlay: onPlay,
            ),
            const SizedBox(height: 12),
            ClayButton(
              label: 'Ask the board',
              color: ChalkColors.creamButton,
              lip: ChalkColors.creamLip,
              foreground: ChalkColors.ink,
              onPressed: onAsk,
            ),
            const SizedBox(height: 12),
            ClayButton(
              label: 'Class notes',
              color: ChalkColors.green,
              lip: ChalkColors.greenLip,
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => ClassNotesScreen(notes: notes),
                  ),
                );
              },
            ),
            const SizedBox(height: 12),
            ClayButton(
              label: 'Revise notes',
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const ReviseNotesScreen(),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _QuestEntry extends StatelessWidget {
  const _QuestEntry({
    required this.quests,
    required this.liveQuestId,
    required this.liveClosed,
    required this.scores,
    required this.onPlay,
  });

  final List<QuestPack> quests;
  final String? liveQuestId;
  final bool liveClosed;
  final Map<String, int> scores;
  final void Function(QuestPack quest, QuestMode mode)? onPlay;

  @override
  Widget build(BuildContext context) {
    final live = liveClosed || liveQuestId == null
        ? null
        : quests.cast<QuestPack?>().firstWhere(
            (quest) => quest?.id == liveQuestId,
            orElse: () => null,
          );
    return Column(
      children: [
        const Text('Quest', style: chalkTitle, textAlign: TextAlign.center),
        const SizedBox(height: 8),
        if (live == null)
          const Text(
            'Waiting for the teacher to open a quest.',
            style: chalkSubtitle,
            textAlign: TextAlign.center,
          )
        else ...[
          Text(live.questTitle, style: chalkSubtitle, textAlign: TextAlign.center),
          if (scores[live.id] != null)
            Text('Score ${scores[live.id]}', style: chalkSubtitle, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          ClayButton(label: 'Fight', onPressed: onPlay == null ? null : () => onPlay!(live, QuestMode.fight)),
          const SizedBox(height: 10),
          ClayButton(
            label: 'Listen',
            color: ChalkColors.green,
            lip: ChalkColors.greenLip,
            onPressed: onPlay == null ? null : () => onPlay!(live, QuestMode.listen),
          ),
        ],
      ],
    );
  }
}
