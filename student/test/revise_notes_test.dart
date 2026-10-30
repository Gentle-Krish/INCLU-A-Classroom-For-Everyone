import 'dart:async';

import 'package:chalk_student/main.dart';
import 'package:chalk_student/notes/notes_revision.dart';
import 'package:chalk_student/screens/connected_screen.dart';
import 'package:chalk_student/screens/revise_notes_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('download and revise failures stay in plain English', () {
    expect(
      englishDownloadFailure(Exception('SocketException: failed host lookup')),
      'The model did not download. Check the internet and try again.',
    );
    expect(
      englishDownloadFailure(StateError('No space left on device')),
      'This phone does not have enough free space for the model.',
    );
    expect(
      englishReviseFailure(StateError('context length exceeded')),
      'That note is too long for this phone. Try a shorter note.',
    );
    expect(
      revisedNoteText('thinking<channel|>The leaf makes food.'),
      'The leaf makes food.',
    );
    expect(
      gemma4E2bDownloadUrl,
      'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm',
    );
    expect(gemmaWeightIsComplete(gemma4E2bBytes), isTrue);
    expect(gemmaWeightIsComplete(gemma4E2bBytes - 1), isFalse);
    expect(resumeByte(0), 0);
    expect(resumeByte(gemma4E2bBytes - 1), gemma4E2bBytes - 1);
    expect(resumeByte(gemma4E2bBytes), gemma4E2bBytes);
    expect(downloadPercent(0), 0);
    expect(downloadPercent(gemma4E2bBytes ~/ 2), 50);
    expect(
      englishDownloadFailure(
        Exception('The download stopped. Try again. It will continue.'),
      ),
      'The download stopped. Try again. It will continue.',
    );
  });

  testWidgets('setup explains the local model, then started, pulling, and done', (
    WidgetTester tester,
  ) async {
    final notes = FakeNotesRevision(
      download: const [
        NotesSetup(kind: NotesSetupKind.started),
        NotesSetup(kind: NotesSetupKind.pulling, percent: 42),
        NotesSetup(kind: NotesSetupKind.ready),
      ],
    );
    await tester.pumpWidget(
      ChalkStudentApp(home: ReviseNotesScreen(revision: notes)),
    );
    await tester.pump();

    expect(find.text('Revise notes'), findsOneWidget);
    expect(
      find.textContaining('needs Gemma on the device'),
      findsOneWidget,
    );
    expect(find.textContaining('class cloud'), findsOneWidget);

    await tester.tap(find.text('Download Gemma'));
    await tester.pump();
    expect(find.text('Started'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 1));
    expect(find.text('Pulling the model'), findsOneWidget);
    expect(find.text('42%'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 1));
    expect(find.text('Done'), findsOneWidget);
    expect(find.text('Type or paste your note'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 1));
  });

  testWidgets('a failed download shows an English message', (
    WidgetTester tester,
  ) async {
    const message =
        'The model did not download. Check the internet and try again.';
    final notes = FakeNotesRevision(
      download: const [
        NotesSetup(kind: NotesSetupKind.failed, message: message),
      ],
    );
    await tester.pumpWidget(
      ChalkStudentApp(home: ReviseNotesScreen(revision: notes)),
    );
    await tester.pump();

    await tester.tap(find.text('Download Gemma'));
    await tester.pump();

    expect(find.text(message), findsOneWidget);
    expect(find.textContaining('Exception'), findsNothing);
    expect(find.textContaining('Socket'), findsNothing);
    await tester.pump(const Duration(milliseconds: 1));
  });

  testWidgets('a note can be revised once the model is ready', (
    WidgetTester tester,
  ) async {
    final notes = FakeNotesRevision(
      installed: true,
      reply: 'Plants make food in their leaves.',
    );
    await tester.pumpWidget(
      ChalkStudentApp(home: ReviseNotesScreen(revision: notes)),
    );
    await tester.pump();

    expect(find.text('Done'), findsOneWidget);
    await tester.tap(find.text('Revise this note'));
    await tester.pump();
    expect(notes.reviseCount, 0);
    expect(find.text('Type or paste a note first.'), findsOneWidget);

    await tester.enterText(
      find.byType(TextField),
      'leafs do food for the plant',
    );
    await tester.tap(find.text('Revise this note'));
    await tester.pump();

    expect(notes.reviseCount, 1);
    expect(notes.lastNote, 'leafs do food for the plant');
    expect(find.text('Plants make food in their leaves.'), findsOneWidget);
    expect(find.text('Revised note'), findsOneWidget);
  });

  testWidgets('the class screen has one revise notes entry', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const ChalkStudentApp(
        home: ConnectedScreen(room: '1234', name: 'Priya', started: true),
      ),
    );

    expect(find.text('Revise notes'), findsOneWidget);
    expect(find.text("You're in"), findsOneWidget);
    expect(find.text('1234'), findsOneWidget);
  });
}

class FakeNotesRevision implements NotesRevision {
  FakeNotesRevision({
    this.download = const [],
    this.reply = 'A clearer note.',
    this.installed = false,
  });

  final List<NotesSetup> download;
  final String reply;
  final bool installed;
  int reviseCount = 0;
  String? lastNote;

  final _changes = StreamController<NotesSetup>.broadcast();
  NotesSetup _setup = const NotesSetup(kind: NotesSetupKind.needsModel);

  void _emit(NotesSetup next) {
    _setup = next;
    _changes.add(next);
  }

  @override
  NotesSetup get setup => _setup;

  @override
  Stream<NotesSetup> get changes => _changes.stream;

  @override
  Future<void> look() async {
    if (installed) {
      _emit(const NotesSetup(kind: NotesSetupKind.ready));
    }
  }

  @override
  Future<void> startDownload() async {
    for (final step in download) {
      _emit(step);
      await Future<void>.delayed(const Duration(milliseconds: 1));
    }
  }

  @override
  Future<String> revise(String note) async {
    reviseCount += 1;
    lastNote = note;
    return reply;
  }
}
