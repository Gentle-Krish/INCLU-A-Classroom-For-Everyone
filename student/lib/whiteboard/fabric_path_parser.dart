import 'package:flutter/material.dart';

Path parseFabricPath(dynamic pathData) {
  final path = Path();
  if (pathData == null) return path;

  if (pathData is List) {
    for (final seg in pathData) {
      if (seg is! List || seg.isEmpty) continue;
      final cmd = seg[0].toString().toUpperCase();
      try {
        switch (cmd) {
          case 'M':
            if (seg.length >= 3) {
              final x = (seg[1] as num).toDouble();
              final y = (seg[2] as num).toDouble();
              path.moveTo(x, y);
            }
            break;
          case 'L':
            if (seg.length >= 3) {
              final x = (seg[1] as num).toDouble();
              final y = (seg[2] as num).toDouble();
              path.lineTo(x, y);
            }
            break;
          case 'Q':
            if (seg.length >= 5) {
              final x1 = (seg[1] as num).toDouble();
              final y1 = (seg[2] as num).toDouble();
              final x = (seg[3] as num).toDouble();
              final y = (seg[4] as num).toDouble();
              path.quadraticBezierTo(x1, y1, x, y);
            }
            break;
          case 'C':
            if (seg.length >= 7) {
              final x1 = (seg[1] as num).toDouble();
              final y1 = (seg[2] as num).toDouble();
              final x2 = (seg[3] as num).toDouble();
              final y2 = (seg[4] as num).toDouble();
              final x = (seg[5] as num).toDouble();
              final y = (seg[6] as num).toDouble();
              path.cubicTo(x1, y1, x2, y2, x, y);
            }
            break;
          case 'Z':
            path.close();
            break;
        }
      } catch (_) {}
    }
    return path;
  }

  if (pathData is String) {
    return _parseSvgPathString(pathData);
  }

  return path;
}

Path _parseSvgPathString(String svg) {
  final path = Path();
  final tokenRegExp = RegExp(r'([A-Za-z])|(-?[0-9]+(?:\.[0-9]+)?)');
  final matches = tokenRegExp.allMatches(svg).toList();

  String currentCmd = 'M';
  int i = 0;
  while (i < matches.length) {
    final token = matches[i].group(0)!;
    if (RegExp(r'^[A-Za-z]$').hasMatch(token)) {
      currentCmd = token.toUpperCase();
      i++;
      continue;
    }

    try {
      switch (currentCmd) {
        case 'M':
          if (i + 1 < matches.length) {
            final x = double.parse(matches[i++].group(0)!);
            final y = double.parse(matches[i++].group(0)!);
            path.moveTo(x, y);
            currentCmd = 'L'; // subsequent coordinates in M are implicit L
          } else {
            i++;
          }
          break;
        case 'L':
          if (i + 1 < matches.length) {
            final x = double.parse(matches[i++].group(0)!);
            final y = double.parse(matches[i++].group(0)!);
            path.lineTo(x, y);
          } else {
            i++;
          }
          break;
        case 'Q':
          if (i + 3 < matches.length) {
            final x1 = double.parse(matches[i++].group(0)!);
            final y1 = double.parse(matches[i++].group(0)!);
            final x = double.parse(matches[i++].group(0)!);
            final y = double.parse(matches[i++].group(0)!);
            path.quadraticBezierTo(x1, y1, x, y);
          } else {
            i++;
          }
          break;
        case 'C':
          if (i + 5 < matches.length) {
            final x1 = double.parse(matches[i++].group(0)!);
            final y1 = double.parse(matches[i++].group(0)!);
            final x2 = double.parse(matches[i++].group(0)!);
            final y2 = double.parse(matches[i++].group(0)!);
            final x = double.parse(matches[i++].group(0)!);
            final y = double.parse(matches[i++].group(0)!);
            path.cubicTo(x1, y1, x2, y2, x, y);
          } else {
            i++;
          }
          break;
        case 'Z':
          path.close();
          i++;
          break;
        default:
          i++;
          break;
      }
    } catch (_) {
      i++;
    }
  }

  return path;
}
