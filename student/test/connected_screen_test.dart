import 'package:chalk_student/screens/connected_screen.dart';
import 'package:chalk_student/screens/passage_screen.dart';
import 'package:chalk_student/theme/chalk_theme.dart';
import 'package:chalk_student/widgets/clay_bot.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('joining screen centers the bot and the loading line', (
    WidgetTester tester,
  ) async {
    await _phone(tester);
    await tester.pumpWidget(
      MaterialApp(
        theme: chalkTheme(),
        home: const JoiningScreen(message: 'Joining the class'),
      ),
    );
    await tester.pump();

    expect(find.byType(ClayBot), findsOneWidget);
    expect(find.text('Joining the class'), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(AppBar), findsNothing);

    final size = tester.getSize(find.byType(JoiningScreen));
    final bot = tester.getCenter(find.byType(ClayBot));
    final line = tester.getCenter(find.text('Joining the class'));
    expect((bot.dx - size.width / 2).abs(), lessThan(8));
    expect((line.dx - size.width / 2).abs(), lessThan(8));
    final botBox = tester.getRect(find.byType(ClayBot));
    final lineBox = tester.getRect(find.text('Joining the class'));
    final mid = (botBox.top + lineBox.bottom) / 2;
    expect((mid - size.height / 2).abs(), lessThan(48));
    expect(lineBox.left, greaterThan(24));
    expect(lineBox.right, lessThan(size.width - 24));

    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('connected screen shows the bot, class number, and name', (
    WidgetTester tester,
  ) async {
    await _phone(tester);
    await tester.pumpWidget(
      MaterialApp(
        theme: chalkTheme(),
        home: const ConnectedScreen(room: '4821', name: 'Priya'),
      ),
    );

    expect(find.byType(ClayBot), findsOneWidget);
    expect(find.text("You're in"), findsOneWidget);
    expect(find.text('Waiting for the teacher'), findsOneWidget);
    expect(find.text('CLASS CODE'), findsOneWidget);
    expect(find.text('4821'), findsOneWidget);
    expect(find.text('Priya'), findsOneWidget);
    expect(find.text('Class started. Waiting for the teacher.'), findsNothing);
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(BottomNavigationBar), findsNothing);

    final size = tester.getSize(find.byType(ConnectedScreen));
    final code = tester.getCenter(find.text('4821'));
    final nameBox = tester.getRect(find.text('Priya'));
    final starBox = tester.getRect(find.byIcon(Icons.star));
    final pillMid = (starBox.left + nameBox.right) / 2;
    expect((code.dx - size.width / 2).abs(), lessThan(8));
    expect((pillMid - size.width / 2).abs(), lessThan(8));
  });

  testWidgets('started class keeps the bot and says class started', (
    WidgetTester tester,
  ) async {
    await _phone(tester);
    await tester.pumpWidget(
      MaterialApp(
        theme: chalkTheme(),
        home: const ConnectedScreen(room: '4821', name: 'Priya', started: true),
      ),
    );

    expect(find.byType(ClayBot), findsOneWidget);
    expect(find.text("You're in"), findsOneWidget);
    expect(find.text('Class started. Waiting for the teacher.'), findsOneWidget);
    expect(find.text('Waiting for the teacher'), findsNothing);
    expect(find.text('4821'), findsOneWidget);
    expect(find.text('Priya'), findsOneWidget);
  });
}

Future<void> _phone(WidgetTester tester) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}
