import 'package:flutter/material.dart';

import '../theme/chalk_theme.dart';

class ClayButton extends StatefulWidget {
  const ClayButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.color = ChalkColors.peach,
    this.lip = ChalkColors.peachLip,
    this.foreground = Colors.white,
    this.icon,
    this.fontSize = 22,
    this.semanticHint,
  });

  final String label;
  final VoidCallback? onPressed;
  final Color color;
  final Color lip;
  final Color foreground;
  final Widget? icon;
  final double fontSize;
  final String? semanticHint;

  @override
  State<ClayButton> createState() => _ClayButtonState();
}

class _ClayButtonState extends State<ClayButton> {
  bool _down = false;

  void _setDown(bool value) {
    if (widget.onPressed == null || _down == value) return;
    setState(() => _down = value);
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null;
    final buttonColor = enabled ? widget.color : ChalkColors.box;
    final lipColor = enabled ? widget.lip : ChalkColors.dash;
    final textColor = enabled ? widget.foreground : ChalkColors.brown;

    return Semantics(
      button: true,
      enabled: enabled,
      label: widget.label,
      hint: widget.semanticHint,
      child: GestureDetector(
        onTapDown: enabled ? (_) => _setDown(true) : null,
        onTapUp: enabled ? (_) => _setDown(false) : null,
        onTapCancel: enabled ? () => _setDown(false) : null,
        onTap: widget.onPressed,
        child: SizedBox(
          height: 70,
          width: double.infinity,
          child: Stack(
            children: [
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  height: 64,
                  decoration: BoxDecoration(
                    color: lipColor,
                    borderRadius: BorderRadius.circular(32),
                  ),
                ),
              ),
              AnimatedPositioned(
                duration: const Duration(milliseconds: 70),
                curve: Curves.easeOut,
                left: 0,
                right: 0,
                top: _down ? 6 : 0,
                height: 64,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: buttonColor,
                    borderRadius: BorderRadius.circular(32),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (widget.icon != null) ...[
                        widget.icon!,
                        const SizedBox(width: 8),
                      ],
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          widget.label,
                          style: TextStyle(
                            color: textColor,
                            fontSize: widget.fontSize,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
