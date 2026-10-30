import 'package:flutter/material.dart';

import '../theme/chalk_theme.dart';
import '../widgets/cream_scaffold.dart';

class ClassNotesScreen extends StatelessWidget {
  const ClassNotesScreen({super.key, required this.notes});

  final String notes;

  @override
  Widget build(BuildContext context) {
    final body = notes.trim();
    return CreamScaffold(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Class notes', style: chalkTitle, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            const Text(
              'Saved from the board.',
              style: chalkSubtitle,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: ChalkColors.creamDeep,
                  borderRadius: BorderRadius.circular(28),
                ),
                child: SingleChildScrollView(
                  child: Text(
                    body.isEmpty
                        ? 'The teacher has not saved notes for this class yet.'
                        : body,
                    style: const TextStyle(
                      color: ChalkColors.ink,
                      fontSize: 18,
                      height: 1.35,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
