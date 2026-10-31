import 'package:flutter/material.dart';

import '../theme/chalk_theme.dart';

/// A persistent, accessible Help button allowing users to replay the spoken and visual
/// onboarding instructions at any time.
class HelpButton extends StatelessWidget {
  const HelpButton({
    super.key,
    required this.onPressed,
    this.compact = false,
  });

  final VoidCallback onPressed;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return Semantics(
        button: true,
        label: 'Help and Onboarding Instructions',
        hint: 'Replay spoken and visual onboarding instructions',
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onPressed,
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: ChalkColors.creamDeep,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: ChalkColors.peach, width: 1.5),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x10000000),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.help_outline_rounded, color: ChalkColors.brownDeep, size: 20),
                  SizedBox(width: 6),
                  Text(
                    'Help',
                    style: TextStyle(
                      color: ChalkColors.brownDeep,
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Semantics(
      button: true,
      label: 'Help and Onboarding Instructions',
      hint: 'Replay spoken and visual onboarding instructions',
      child: OutlinedButton.icon(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: ChalkColors.peach, width: 2),
          backgroundColor: ChalkColors.creamDeep,
          foregroundColor: ChalkColors.brownDeep,
          minimumSize: const Size(48, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        icon: const Icon(Icons.help_outline_rounded, size: 22, color: ChalkColors.peach),
        label: const Text(
          'Help & Instructions',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: ChalkColors.brownDeep,
          ),
        ),
      ),
    );
  }
}
