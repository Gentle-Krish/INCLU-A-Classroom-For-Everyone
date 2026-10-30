import 'dart:async';

import 'package:flutter/material.dart';

import '../notes/edge_gemma_notes.dart';
import '../notes/notes_revision.dart';
import '../theme/chalk_theme.dart';
import '../widgets/clay_bot.dart';
import '../widgets/clay_button.dart';
import '../widgets/cream_scaffold.dart';

class ReviseNotesScreen extends StatefulWidget {
  const ReviseNotesScreen({super.key, this.revision});

  /// When null, the phone uses on-device Gemma. Tests pass a fake.
  final NotesRevision? revision;

  @override
  State<ReviseNotesScreen> createState() => _ReviseNotesScreenState();
}

class _ReviseNotesScreenState extends State<ReviseNotesScreen> {
  late final NotesRevision _notes = widget.revision ?? EdgeGemmaNotes();
  late final TextEditingController _note = TextEditingController();
  StreamSubscription<NotesSetup>? _sub;
  NotesSetup _setup = const NotesSetup(kind: NotesSetupKind.needsModel);
  bool _downloading = false;
  bool _revising = false;
  String? _revised;
  String? _reviseError;

  @override
  void initState() {
    super.initState();
    _setup = _notes.setup;
    _sub = _notes.changes.listen((setup) {
      if (!mounted) return;
      setState(() => _setup = setup);
    });
    unawaited(_notes.look());
  }

  @override
  void dispose() {
    unawaited(_sub?.cancel());
    _note.dispose();
    super.dispose();
  }

  Future<void> _download() async {
    setState(() => _downloading = true);
    try {
      await _notes.startDownload();
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  Future<void> _revise() async {
    final note = _note.text.trim();
    if (note.isEmpty) {
      setState(() {
        _revised = null;
        _reviseError = 'Type or paste a note first.';
      });
      return;
    }
    setState(() {
      _revising = true;
      _reviseError = null;
    });
    try {
      final revised = await _notes.revise(note);
      if (!mounted) return;
      setState(() {
        _revised = revised;
        _revising = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _revised = null;
        _revising = false;
        _reviseError = error is StateError
            ? error.message
            : englishReviseFailure(error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ready = _setup.kind == NotesSetupKind.ready;
    return CreamScaffold(
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight - 36),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      child: const Text(
                        'Back',
                        style: TextStyle(
                          color: ChalkColors.brown,
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ),
                  const ClayBot(size: 120),
                  const SizedBox(height: 12),
                  const Text(
                    'Revise notes',
                    style: chalkTitle,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _statusLine(),
                    style: chalkSubtitle,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  if (_setup.kind == NotesSetupKind.pulling) _progress(),
                  if (_setup.kind == NotesSetupKind.failed &&
                      _setup.message != null) ...[
                    Text(
                      _setup.message!,
                      style: const TextStyle(
                        color: ChalkColors.peachLip,
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                        height: 1.3,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (!ready)
                    ClayButton(
                      label: _setup.kind == NotesSetupKind.failed
                          ? 'Try again'
                          : 'Download Gemma',
                      onPressed: _downloading ||
                              _setup.kind == NotesSetupKind.started ||
                              _setup.kind == NotesSetupKind.pulling
                          ? null
                          : () => unawaited(_download()),
                    ),
                  if (ready) ...[
                    TextField(
                      controller: _note,
                      minLines: 5,
                      maxLines: 8,
                      textCapitalization: TextCapitalization.sentences,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: ChalkColors.ink,
                      ),
                      cursorColor: ChalkColors.peach,
                      decoration: const InputDecoration(
                        hintText: 'Type or paste your note',
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 16,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    ClayButton(
                      label: 'Revise this note',
                      onPressed: _revising ? null : () => unawaited(_revise()),
                    ),
                    if (_revising) ...[
                      const SizedBox(height: 16),
                      const Text(
                        'Revising your note',
                        style: chalkSubtitle,
                        textAlign: TextAlign.center,
                      ),
                    ],
                    if (_reviseError != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        _reviseError!,
                        style: const TextStyle(
                          color: ChalkColors.peachLip,
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          height: 1.3,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                    if (_revised != null) ...[
                      const SizedBox(height: 18),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
                        decoration: BoxDecoration(
                          color: ChalkColors.creamDeep,
                          borderRadius: BorderRadius.circular(28),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Revised note',
                              style: TextStyle(
                                color: ChalkColors.brown,
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                                letterSpacing: 0.4,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _revised!,
                              style: const TextStyle(
                                color: ChalkColors.ink,
                                fontSize: 18,
                                height: 1.35,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _statusLine() {
    if (_downloading && _setup.kind == NotesSetupKind.needsModel) {
      return 'Started';
    }
    return switch (_setup.kind) {
      NotesSetupKind.needsModel =>
        'This phone needs Gemma on the device to revise your notes. The model stays on this phone. It does not call the class cloud.',
      NotesSetupKind.started => 'Started',
      NotesSetupKind.pulling => 'Pulling the model',
      NotesSetupKind.ready => 'Done',
      NotesSetupKind.failed => 'The download did not finish.',
    };
  }

  Widget _progress() {
    final percent = _setup.percent;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: LinearProgressIndicator(
              minHeight: 14,
              value: percent == null ? null : percent / 100,
              backgroundColor: ChalkColors.box,
              color: ChalkColors.peach,
            ),
          ),
          if (percent != null) ...[
            const SizedBox(height: 8),
            Text(
              '$percent%',
              style: const TextStyle(
                color: ChalkColors.brownDeep,
                fontWeight: FontWeight.w800,
                fontSize: 18,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
