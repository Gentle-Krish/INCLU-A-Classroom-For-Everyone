import 'package:flutter/material.dart';

import '../theme/chalk_theme.dart';
import '../widgets/clay_bot.dart';
import '../widgets/clay_button.dart';
import '../widgets/cream_scaffold.dart';

class JoiningScreen extends StatelessWidget {
  const JoiningScreen({super.key, required this.message, this.onHelp});

  final String message;
  final VoidCallback? onHelp;

  @override
  Widget build(BuildContext context) {
    return CreamScaffold(
      onHelp: onHelp,
      resizeToAvoidBottomInset: false,
      child: CenteredClayBody(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const ClayBot(showDots: true, size: 180),
            const SizedBox(height: 28),
            Text(message, style: chalkTitle, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class FailedScreen extends StatelessWidget {
  const FailedScreen({
    super.key,
    required this.title,
    required this.detail,
    required this.onRetry,
    this.onHelp,
  });

  final String title;
  final String detail;
  final VoidCallback onRetry;
  final VoidCallback? onHelp;

  @override
  Widget build(BuildContext context) {
    return CreamScaffold(
      onHelp: onHelp,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
        child: Column(
          children: [
            const Spacer(),
            const ClayBot(),
            const SizedBox(height: 24),
            Text(title, style: chalkTitle, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(detail, style: chalkSubtitle, textAlign: TextAlign.center),
            const SizedBox(height: 24),
            ClayButton(label: 'Try again', onPressed: onRetry),
            const Spacer(flex: 2),
          ],
        ),
      ),
    );
  }
}
