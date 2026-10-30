import 'package:chalk_student/main.dart';
import 'package:chalk_student/screens/name_screen.dart';
import 'package:chalk_student/theme/chalk_theme.dart';
import 'package:chalk_student/widgets/clay_bot.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('name screen shows the bot and no counter or blue app bar', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const ChalkStudentApp(home: NameScreen(onSubmit: _ignoreName)),
    );

    expect(find.byType(ClayBot), findsOneWidget);
    expect(find.text('What is your name?'), findsOneWidget);
    expect(find.text("That's me"), findsOneWidget);
    expect(find.byType(AppBar), findsNothing);
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(BottomNavigationBar), findsNothing);
    expect(find.byType(FloatingActionButton), findsNothing);
    expect(find.text('0'), findsNothing);
    expect(find.text('1'), findsNothing);
    expect(
      find.text('You have pushed the button this many times:'),
      findsNothing,
    );

    final theme = Theme.of(tester.element(find.byType(NameScreen)));
    expect(theme.colorScheme.primary, isNot(Colors.blue));
    expect(theme.colorScheme.primary, isNot(const Color(0xFF2196F3)));
    expect(theme.colorScheme.primary, isNot(Colors.deepPurple));
    expect(theme.scaffoldBackgroundColor, ChalkColors.cream);

    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.appBar, isNull);
    expect(scaffold.backgroundColor, ChalkColors.cream);
  });

  testWidgets('an empty name does not continue', (WidgetTester tester) async {
    var submitted = false;
    await tester.pumpWidget(
      ChalkStudentApp(
        home: NameScreen(onSubmit: (_) => submitted = true),
      ),
    );

    await tester.tap(find.text("That's me"));
    await tester.pump();
    expect(submitted, isFalse);

    await tester.enterText(find.byType(TextField), 'Priya');
    await tester.tap(find.text("That's me"));
    await tester.pump();
    expect(submitted, isTrue);
  });
}

void _ignoreName(String name) {}
