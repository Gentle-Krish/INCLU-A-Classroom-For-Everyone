import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:inclu_student/join_flow.dart';
import 'package:inclu_student/onboarding/onboarding_screen.dart';
import 'package:inclu_student/onboarding/onboarding_step.dart';
import 'package:inclu_student/onboarding/onboarding_store.dart';
import 'package:inclu_student/widgets/help_button.dart';
import 'package:inclu_student/theme/chalk_theme.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('OnboardingStore', () {
    test('persists completion state in SharedPreferences', () async {
      SharedPreferences.setMockInitialValues({});
      final store = OnboardingStore();

      expect(await store.hasCompleted(), isFalse);

      await store.setCompleted(true);
      expect(await store.hasCompleted(), isTrue);

      await store.clear();
      expect(await store.hasCompleted(), isFalse);
    });
  });

  group('HelpButton', () {
    testWidgets('renders compact and standard variants with semantics', (WidgetTester tester) async {
      var tappedCompact = false;
      var tappedStandard = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: chalkTheme(),
          home: Scaffold(
            body: Column(
              children: [
                HelpButton(compact: true, onPressed: () => tappedCompact = true),
                HelpButton(compact: false, onPressed: () => tappedStandard = true),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Help'), findsOneWidget);
      expect(find.text('Help & Instructions'), findsOneWidget);

      await tester.tap(find.text('Help'));
      expect(tappedCompact, isTrue);

      await tester.tap(find.text('Help & Instructions'));
      expect(tappedStandard, isTrue);
    });
  });

  group('OnboardingScreen', () {
    testWidgets('displays spoken instructions and matching text with step controls', (WidgetTester tester) async {
      var completed = false;
      const testSteps = [
        OnboardingStep(
          title: 'Step 1 Title',
          instruction: 'Step 1 Spoken Instruction',
          matchingText: 'Step 1 Matching Visual Text',
          icon: Icons.star,
        ),
        OnboardingStep(
          title: 'Step 2 Title',
          instruction: 'Step 2 Spoken Instruction',
          matchingText: 'Step 2 Matching Visual Text',
          icon: Icons.check,
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          theme: chalkTheme(),
          home: OnboardingScreen(
            steps: testSteps,
            onComplete: () => completed = true,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Verify Step 1
      expect(find.text('STEP 1 OF 2'), findsOneWidget);
      expect(find.text('Step 1 Title'), findsOneWidget);
      expect(find.text('Step 1 Spoken Instruction'), findsOneWidget);
      expect(find.text('Step 1 Matching Visual Text'), findsOneWidget);
      expect(find.text('Next'), findsOneWidget);
      expect(find.text('Repeat'), findsOneWidget);
      expect(find.text('Back'), findsOneWidget);

      // Back is disabled on step 1
      await tester.tap(find.text('Back'));
      await tester.pumpAndSettle();
      expect(find.text('STEP 1 OF 2'), findsOneWidget);

      // Repeat button tap
      await tester.tap(find.text('Repeat'));
      await tester.pumpAndSettle();
      expect(find.text('STEP 1 OF 2'), findsOneWidget);

      // Advance to Step 2
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      expect(find.text('STEP 2 OF 2'), findsOneWidget);
      expect(find.text('Step 2 Title'), findsOneWidget);
      expect(find.text('Step 2 Spoken Instruction'), findsOneWidget);
      expect(find.text('Step 2 Matching Visual Text'), findsOneWidget);
      expect(find.text('Finish'), findsOneWidget);

      // Go back to Step 1
      await tester.tap(find.text('Back'));
      await tester.pumpAndSettle();
      expect(find.text('STEP 1 OF 2'), findsOneWidget);

      // Go to Step 2 and Finish
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Finish'));
      await tester.pumpAndSettle();

      expect(completed, isTrue);
    });

    testWidgets('skip button exits onboarding immediately', (WidgetTester tester) async {
      var completed = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: chalkTheme(),
          home: OnboardingScreen(
            onComplete: () => completed = true,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Skip'), findsOneWidget);
      await tester.tap(find.text('Skip'));
      await tester.pumpAndSettle();

      expect(completed, isTrue);
    });
  });

  group('JoinFlow Onboarding Integration', () {
    testWidgets('launches onboarding on first run and allows replaying via Help', (WidgetTester tester) async {
      SharedPreferences.setMockInitialValues({});

      await tester.pumpWidget(
        MaterialApp(
          theme: chalkTheme(),
          home: const JoinFlow(),
        ),
      );
      await tester.runAsync(() => Future.delayed(const Duration(milliseconds: 100)));
      await tester.pump();

      // First run presents onboarding
      expect(find.byType(OnboardingScreen), findsOneWidget);
      expect(find.text('Welcome to Inclu'), findsOneWidget);

      // Skip onboarding to enter join flow
      await tester.tap(find.text('Skip'));
      await tester.runAsync(() => Future.delayed(const Duration(milliseconds: 100)));
      await tester.pump();

      // Now onboarding is finished and store persisted
      final store = OnboardingStore();
      expect(await store.hasCompleted(), isTrue);

      // Verify persistent Help button is rendered in the app
      expect(find.text('Help'), findsOneWidget);

      // Tap persistent Help button to replay onboarding
      await tester.tap(find.text('Help'));
      await tester.runAsync(() => Future.delayed(const Duration(milliseconds: 100)));
      await tester.pump();

      // Onboarding screen opens in replay mode
      expect(find.byType(OnboardingScreen), findsOneWidget);

      // Skip replay
      await tester.tap(find.text('Skip'));
      await tester.runAsync(() => Future.delayed(const Duration(milliseconds: 100)));
      await tester.pump();

      // Returns to main screen with persistent Help button
      expect(find.text('Help'), findsOneWidget);
    });
  });
}
