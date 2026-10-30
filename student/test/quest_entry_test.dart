import 'package:chalk_student/quest/quest_mouth.dart';
import 'package:chalk_student/quest/quest_pack.dart';
import 'package:chalk_student/quest/quest_play_screen.dart';
import 'package:chalk_student/screens/ask_board_screen.dart';
import 'package:chalk_student/screens/connected_screen.dart';
import 'package:chalk_student/theme/chalk_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

QuestPack _pack() {
  return QuestPack(
    id: 'live',
    questTitle: 'Leaf quest',
    bossName: 'Clay sprout',
    questions: List.generate(
      5,
      (index) => QuestQuestion(
        question: 'Question ${index + 1}?',
        options: ['Leaves', 'Heart', 'Roots', 'Flower'],
        correctAnswerIndex: 1,
        explanation: 'The heart pumps blood.',
        lessonPart: 'Circulation',
      ),
    ),
  );
}

class _ScriptMouth implements QuestMouth {
  @override
  Future<void> speak(String words) async {}

  @override
  Future<String> listenOnce() async => 'two';
}

void main() {
  testWidgets('a joined student sees the quest and chooses fight or listen', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    QuestMode? chosen;
    await tester.pumpWidget(
      MaterialApp(
        theme: chalkTheme(),
        home: ConnectedScreen(
          room: '4821',
          name: 'Priya',
          started: true,
          quests: [_pack()],
          liveQuestId: 'live',
          onPlay: (_, mode) => chosen = mode,
          onAsk: () {},
        ),
      ),
    );

    expect(find.text('Quest'), findsOneWidget);
    expect(find.text('Leaf quest'), findsOneWidget);
    expect(find.text('Waiting for the teacher to open a quest.'), findsNothing);
    await tester.tap(find.text('Listen'));
    expect(chosen, QuestMode.listen);
    expect(find.text('Ask the board'), findsOneWidget);
  });

  testWidgets('a closed quest is not offered again', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        theme: chalkTheme(),
        home: ConnectedScreen(
          room: '4821',
          name: 'Priya',
          started: true,
          quests: [_pack()],
          liveQuestId: 'live',
          liveClosed: true,
        ),
      ),
    );

    expect(find.text('Waiting for the teacher to open a quest.'), findsOneWidget);
    expect(find.text('Fight'), findsNothing);
    expect(find.text('Leaf quest'), findsNothing);
  });

  testWidgets('listen answers with the spoken word and buzzes on the same screen', (tester) async {
    tester.view.physicalSize = const Size(390, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final reports = <QuestAnswerReport>[];
    var buzzes = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: chalkTheme(),
        home: QuestPlayScreen(
          quest: _pack(),
          mode: QuestMode.listen,
          mouth: _ScriptMouth(),
          buzz: (correct) async {
            buzzes += correct ? 1 : 2;
          },
          onAnswer: (report) async => reports.add(report),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('You did it'), findsOneWidget);
    expect(reports, hasLength(5));
    expect(reports.every((report) => report.optionIndex == 1 && report.mode == 'listen'), isTrue);
    expect(reports.last.finished, isTrue);
    expect(buzzes, 5);
    expect(find.text('Heart'), findsNothing);
  });

  testWidgets('fight is taps on the same clay screen', (tester) async {
    tester.view.physicalSize = const Size(390, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final reports = <QuestAnswerReport>[];
    await tester.pumpWidget(
      MaterialApp(
        theme: chalkTheme(),
        home: QuestPlayScreen(
          quest: _pack(),
          mode: QuestMode.fight,
          onAnswer: (report) async => reports.add(report),
        ),
      ),
    );
    await tester.tap(find.text('Start'));
    await tester.pumpAndSettle();
    expect(find.text('vs Clay sprout'), findsOneWidget);
    expect(find.text('Heart'), findsOneWidget);
    await tester.tap(find.text('Heart'));
    await tester.pump();
    expect(reports, hasLength(1));
    expect(reports.single.mode, 'fight');
    expect(reports.single.optionIndex, 1);
    expect(find.textContaining('Hit.'), findsOneWidget);
  });

  testWidgets('the ask screen is one typed line', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    String? sent;
    await tester.pumpWidget(
      MaterialApp(
        theme: chalkTheme(),
        home: AskBoardScreen(
          lessonPart: 'Circulation',
          onSend: (text) async => sent = text,
        ),
      ),
    );
    expect(find.byType(TextField), findsOneWidget);
    expect(find.byIcon(Icons.mic), findsNothing);
    await tester.enterText(find.byType(TextField), 'Why is the heart a pump?');
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    expect(sent, 'Why is the heart a pump?');
  });
}
