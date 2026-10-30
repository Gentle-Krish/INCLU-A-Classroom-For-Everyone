import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/chalk_theme.dart';

class ClayBot extends StatelessWidget {
  const ClayBot({super.key, this.showDots = false, this.size = 168});

  final bool showDots;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size,
          child: CustomPaint(painter: _ClayBotPainter()),
        ),
        if (showDots) ...[
          const SizedBox(height: 8),
          const BouncingDots(),
        ],
      ],
    );
  }
}

class BouncingDots extends StatefulWidget {
  const BouncingDots({super.key, this.color = ChalkColors.green});

  final Color color;

  @override
  State<BouncingDots> createState() => _BouncingDotsState();
}

class _BouncingDotsState extends State<BouncingDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (index) {
            final t = (_controller.value + index * 0.18) % 1;
            final dy = -7 * math.sin(t * math.pi);
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 5),
              child: Transform.translate(
                offset: Offset(0, dy),
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: widget.color,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

class _ClayBotPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.58);
    final radius = size.width * 0.30;

    final shadow = Paint()
      ..color = const Color(0x33E0B089)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 18);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(center.dx, center.dy + radius * 0.92),
        width: radius * 1.8,
        height: radius * 0.42,
      ),
      shadow,
    );

    final ear = Paint()..color = const Color(0xFFFFC49A);
    canvas.drawCircle(
      Offset(center.dx - radius * 0.95, center.dy - radius * 0.02),
      radius * 0.22,
      ear,
    );
    canvas.drawCircle(
      Offset(center.dx + radius * 0.95, center.dy - radius * 0.02),
      radius * 0.22,
      ear,
    );

    final face = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.35, -0.45),
        radius: 1.05,
        colors: const [Color(0xFFFFE3C8), Color(0xFFFFB27A), Color(0xFFFF9A62)],
        stops: const [0, 0.62, 1],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius, face);

    final foot = Paint()..color = const Color(0xFFFFA56C);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(center.dx - radius * 0.38, center.dy + radius * 0.92),
        width: radius * 0.42,
        height: radius * 0.26,
      ),
      foot,
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(center.dx + radius * 0.38, center.dy + radius * 0.92),
        width: radius * 0.42,
        height: radius * 0.26,
      ),
      foot,
    );

    final cheek = Paint()..color = const Color(0x66FF8B9A);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(center.dx - radius * 0.48, center.dy + radius * 0.22),
        width: radius * 0.36,
        height: radius * 0.22,
      ),
      cheek,
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(center.dx + radius * 0.48, center.dy + radius * 0.22),
        width: radius * 0.36,
        height: radius * 0.22,
      ),
      cheek,
    );

    final eye = Paint()..color = const Color(0xFF2B241C);
    final eyeY = center.dy - radius * 0.08;
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(center.dx - radius * 0.28, eyeY),
        width: radius * 0.16,
        height: radius * 0.22,
      ),
      eye,
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(center.dx + radius * 0.28, eyeY),
        width: radius * 0.16,
        height: radius * 0.22,
      ),
      eye,
    );
    final shine = Paint()..color = Colors.white;
    canvas.drawCircle(
      Offset(center.dx - radius * 0.24, eyeY - radius * 0.05),
      radius * 0.04,
      shine,
    );
    canvas.drawCircle(
      Offset(center.dx + radius * 0.32, eyeY - radius * 0.05),
      radius * 0.04,
      shine,
    );

    final smile = Paint()
      ..color = const Color(0xFF2B241C)
      ..style = PaintingStyle.stroke
      ..strokeWidth = radius * 0.055
      ..strokeCap = StrokeCap.round;
    final path = Path()
      ..moveTo(center.dx - radius * 0.16, center.dy + radius * 0.28)
      ..quadraticBezierTo(
        center.dx,
        center.dy + radius * 0.46,
        center.dx + radius * 0.16,
        center.dy + radius * 0.28,
      );
    canvas.drawPath(path, smile);

    final stem = Paint()
      ..color = const Color(0xFFE09868)
      ..strokeWidth = radius * 0.08
      ..strokeCap = StrokeCap.round;
    final tip = Offset(center.dx, center.dy - radius - radius * 0.34);
    canvas.drawLine(Offset(center.dx, center.dy - radius + 2), tip, stem);
    canvas.drawCircle(tip, radius * 0.13, Paint()..color = const Color(0xFFF6C445));
    canvas.drawCircle(
      Offset(tip.dx - radius * 0.04, tip.dy - radius * 0.04),
      radius * 0.04,
      Paint()..color = const Color(0xFFFFF6D0),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
