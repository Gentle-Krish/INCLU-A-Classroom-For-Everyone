import 'dart:math' as math;
import 'package:flutter/material.dart';

import 'fabric_path_parser.dart';
import 'whiteboard_model.dart';

class WhiteboardPainter extends CustomPainter {
  WhiteboardPainter({
    required this.objects,
    this.backgroundColor = const Color(0xFFFBFBFB),
    this.drawGrid = true,
  });

  final List<WhiteboardObject> objects;
  final Color backgroundColor;
  final bool drawGrid;

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw canvas background
    final bgPaint = Paint()..color = backgroundColor;
    canvas.drawRect(Offset.zero & size, bgPaint);

    // 2. Draw subtle grid dots or lines
    if (drawGrid) {
      final gridPaint = Paint()
        ..color = const Color(0x0C000000)
        ..strokeWidth = 1.0;
      const step = 40.0;
      for (double x = 0; x < size.width; x += step) {
        canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
      }
      for (double y = 0; y < size.height; y += step) {
        canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
      }
    }

    // 3. Paint each whiteboard object
    for (final obj in objects) {
      if (obj.opacity <= 0.0) continue;
      _paintObject(canvas, obj);
    }
  }

  void _paintObject(Canvas canvas, WhiteboardObject obj) {
    canvas.save();

    // Fabric coordinates: translation
    canvas.translate(obj.left, obj.top);

    // Rotation around origin
    if (obj.angle != 0.0) {
      canvas.rotate(obj.angle * math.pi / 180.0);
    }

    // Scaling
    if (obj.scaleX != 1.0 || obj.scaleY != 1.0) {
      canvas.scale(obj.scaleX, obj.scaleY);
    }

    // Calculate origin offset
    final double originOffsetX = obj.originX == 'center' ? -obj.width / 2.0 : 0.0;
    final double originOffsetY = obj.originY == 'center' ? -obj.height / 2.0 : 0.0;

    // Build fill and stroke paints
    Paint? fillPaint;
    if (obj.fill != Colors.transparent) {
      final effectiveAlpha = ((obj.fill.a) * obj.opacity).clamp(0.0, 1.0);
      fillPaint = Paint()
        ..color = obj.fill.withValues(alpha: effectiveAlpha)
        ..style = PaintingStyle.fill;
    }

    Paint? strokePaint;
    if (obj.stroke != null && obj.strokeWidth > 0) {
      final effectiveAlpha = ((obj.stroke!.a) * obj.opacity).clamp(0.0, 1.0);
      strokePaint = Paint()
        ..color = obj.stroke!.withValues(alpha: effectiveAlpha)
        ..strokeWidth = obj.strokeWidth
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round;
    }

    switch (obj.type) {
      case 'rect':
        _paintRect(canvas, obj, originOffsetX, originOffsetY, fillPaint, strokePaint);
        break;
      case 'circle':
        _paintCircle(canvas, obj, originOffsetX, originOffsetY, fillPaint, strokePaint);
        break;
      case 'triangle':
        _paintTriangle(canvas, obj, originOffsetX, originOffsetY, fillPaint, strokePaint);
        break;
      case 'line':
        _paintLine(canvas, obj, strokePaint ?? fillPaint);
        break;
      case 'polygon':
      case 'polyline':
        _paintPolygon(canvas, obj, fillPaint, strokePaint, obj.type == 'polygon');
        break;
      case 'path':
        _paintPath(canvas, obj, fillPaint, strokePaint);
        break;
      case 'i-text':
      case 'text':
      case 'textbox':
        _paintText(canvas, obj, originOffsetX, originOffsetY);
        break;
      case 'group':
        _paintGroup(canvas, obj);
        break;
      default:
        // Fallback for custom or unknown shape with path/rect bounds
        if (obj.pathData != null) {
          _paintPath(canvas, obj, fillPaint, strokePaint);
        } else if (obj.width > 0 && obj.height > 0) {
          _paintRect(canvas, obj, originOffsetX, originOffsetY, fillPaint, strokePaint);
        }
        break;
    }

    canvas.restore();
  }

  void _paintRect(
    Canvas canvas,
    WhiteboardObject obj,
    double ox,
    double oy,
    Paint? fill,
    Paint? stroke,
  ) {
    final rect = Rect.fromLTWH(ox, oy, obj.width, obj.height);
    if (obj.rx > 0 || obj.ry > 0) {
      final radius = Radius.circular(obj.rx > 0 ? obj.rx : obj.ry);
      final rrect = RRect.fromRectAndRadius(rect, radius);
      if (fill != null) canvas.drawRRect(rrect, fill);
      if (stroke != null) canvas.drawRRect(rrect, stroke);
    } else {
      if (fill != null) canvas.drawRect(rect, fill);
      if (stroke != null) canvas.drawRect(rect, stroke);
    }
  }

  void _paintCircle(
    Canvas canvas,
    WhiteboardObject obj,
    double ox,
    double oy,
    Paint? fill,
    Paint? stroke,
  ) {
    final r = obj.radius > 0 ? obj.radius : (obj.width > 0 ? obj.width / 2.0 : 20.0);
    final center = obj.originX == 'center' && obj.originY == 'center'
        ? Offset.zero
        : Offset(ox + r, oy + r);
    if (fill != null) canvas.drawCircle(center, r, fill);
    if (stroke != null) canvas.drawCircle(center, r, stroke);
  }

  void _paintTriangle(
    Canvas canvas,
    WhiteboardObject obj,
    double ox,
    double oy,
    Paint? fill,
    Paint? stroke,
  ) {
    final path = Path()
      ..moveTo(ox + obj.width / 2.0, oy)
      ..lineTo(ox + obj.width, oy + obj.height)
      ..lineTo(ox, oy + obj.height)
      ..close();
    if (fill != null) canvas.drawPath(path, fill);
    if (stroke != null) canvas.drawPath(path, stroke);
  }

  void _paintLine(Canvas canvas, WhiteboardObject obj, Paint? stroke) {
    if (stroke == null) return;
    canvas.drawLine(Offset(obj.x1, obj.y1), Offset(obj.x2, obj.y2), stroke);
  }

  void _paintPolygon(
    Canvas canvas,
    WhiteboardObject obj,
    Paint? fill,
    Paint? stroke,
    bool isClosed,
  ) {
    if (obj.points.isEmpty) return;
    canvas.save();
    canvas.translate(-obj.pathOffset.dx, -obj.pathOffset.dy);

    final path = Path()..moveTo(obj.points.first.dx, obj.points.first.dy);
    for (int i = 1; i < obj.points.length; i++) {
      path.lineTo(obj.points[i].dx, obj.points[i].dy);
    }
    if (isClosed) path.close();

    if (fill != null) canvas.drawPath(path, fill);
    if (stroke != null) canvas.drawPath(path, stroke);
    canvas.restore();
  }

  void _paintPath(
    Canvas canvas,
    WhiteboardObject obj,
    Paint? fill,
    Paint? stroke,
  ) {
    if (obj.pathData == null) return;
    canvas.save();
    canvas.translate(-obj.pathOffset.dx, -obj.pathOffset.dy);

    final path = parseFabricPath(obj.pathData);
    if (fill != null) canvas.drawPath(path, fill);
    if (stroke != null) canvas.drawPath(path, stroke);
    canvas.restore();
  }

  void _paintText(
    Canvas canvas,
    WhiteboardObject obj,
    double ox,
    double oy,
  ) {
    if (obj.text.isEmpty) return;

    final color = obj.fill != Colors.transparent ? obj.fill : const Color(0xFF222222);
    final textStyle = TextStyle(
      color: color.withValues(alpha: (color.a * obj.opacity).clamp(0.0, 1.0)),
      fontSize: obj.fontSize > 0 ? obj.fontSize : 20.0,
      fontWeight: obj.fontWeight,
      fontStyle: obj.fontStyle,
      fontFamily: obj.fontFamily,
    );

    final span = TextSpan(text: obj.text, style: textStyle);
    final tp = TextPainter(
      text: span,
      textAlign: obj.textAlign,
      textDirection: TextDirection.ltr,
    );

    final maxWidth = obj.width > 0 ? obj.width * 1.2 : 600.0;
    tp.layout(maxWidth: maxWidth);
    tp.paint(canvas, Offset(ox, oy));
  }

  void _paintGroup(Canvas canvas, WhiteboardObject obj) {
    for (final child in obj.objects) {
      _paintObject(canvas, child);
    }
  }

  @override
  bool shouldRepaint(covariant WhiteboardPainter oldDelegate) {
    return true;
  }
}
