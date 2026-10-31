import 'package:flutter/material.dart';

import '../theme/chalk_theme.dart';
import 'help_button.dart';

class CreamScaffold extends StatelessWidget {
  const CreamScaffold({
    super.key,
    required this.child,
    this.resizeToAvoidBottomInset = true,
    this.onHelp,
  });

  final Widget child;

  /// Joining and connected screens stay full-height. The keyboard must not
  /// squash them into a strip after the class code is submitted.
  final bool resizeToAvoidBottomInset;

  /// Optional persistent Help button callback allowing the user to replay onboarding.
  final VoidCallback? onHelp;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ChalkColors.cream,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFFFF8F2), ChalkColors.cream, ChalkColors.mint],
            stops: [0, 0.72, 1],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              child,
              if (onHelp != null)
                Positioned(
                  top: 8,
                  right: 12,
                  child: HelpButton(
                    compact: true,
                    onPressed: onHelp!,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Puts [child] in the middle of the portrait screen, horizontally and vertically.
class CenteredClayBody extends StatelessWidget {
  const CenteredClayBody({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minWidth: constraints.maxWidth,
              minHeight: constraints.maxHeight,
            ),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
                child: child,
              ),
            ),
          ),
        );
      },
    );
  }
}
