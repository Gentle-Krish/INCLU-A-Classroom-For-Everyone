import 'package:flutter/material.dart';

import '../theme/chalk_theme.dart';
import '../widgets/clay_bot.dart';
import '../widgets/cream_scaffold.dart';

class ListenScreen extends StatelessWidget {
  const ListenScreen({
    super.key,
    this.headline = 'Say your class number',
    this.digits = '',
    this.showDigits = true,
    this.footnote = 'Then say your name.',
  });

  final String headline;
  final String digits;
  final bool showDigits;
  final String footnote;

  @override
  Widget build(BuildContext context) {
    return CreamScaffold(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          children: [
            const SizedBox(height: 28),
            const ClayBot(showDots: true),
            const Spacer(),
            Text(headline, style: chalkTitle, textAlign: TextAlign.center),
            if (showDigits) ...[
              const SizedBox(height: 22),
              Row(
                children: List.generate(4, (index) {
                  final glyph = index < digits.length ? digits[index] : '–';
                  final filled = index < digits.length;
                  return Expanded(
                    child: Container(
                    height: 84,
                    margin: const EdgeInsets.symmetric(horizontal: 6),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: ChalkColors.box,
                      borderRadius: BorderRadius.circular(28),
                    ),
                    child: Text(
                      glyph,
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: filled ? ChalkColors.ink : ChalkColors.dash,
                      ),
                    ),
                  ),
                );
                }),
              ),
              const SizedBox(height: 14),
              const Text(
                'Four digits, like 4 8 2 1',
                style: TextStyle(
                  color: ChalkColors.brown,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            const SizedBox(height: 18),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              decoration: BoxDecoration(
                color: ChalkColors.creamDeep,
                borderRadius: BorderRadius.circular(28),
              ),
              child: const Row(
                children: [
                  Icon(Icons.mic, color: ChalkColors.green, size: 26),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'No need to tap. The phone is listening.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: ChalkColors.ink,
                        fontSize: 16,
                        height: 1.25,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              footnote,
              style: const TextStyle(
                color: ChalkColors.brown,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}
