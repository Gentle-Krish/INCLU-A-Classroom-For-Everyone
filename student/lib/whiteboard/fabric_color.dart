import 'package:flutter/material.dart';

Color parseFabricColor(dynamic colorValue, [Color fallback = Colors.transparent]) {
  if (colorValue == null) return fallback;
  if (colorValue is int) return Color(colorValue);
  if (colorValue is! String) return fallback;

  final str = colorValue.trim().toLowerCase();
  if (str.isEmpty || str == 'transparent' || str == 'none') {
    return Colors.transparent;
  }

  // Hex colors: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  if (str.startsWith('#')) {
    final hex = str.substring(1);
    if (hex.length == 3) {
      final r = hex[0];
      final g = hex[1];
      final b = hex[2];
      final fullHex = 'ff$r$r$g$g$b$b';
      final val = int.tryParse(fullHex, radix: 16);
      if (val != null) return Color(val);
    } else if (hex.length == 4) {
      final r = hex[0];
      final g = hex[1];
      final b = hex[2];
      final a = hex[3];
      final fullHex = '$a$a$r$r$g$g$b$b';
      final val = int.tryParse(fullHex, radix: 16);
      if (val != null) return Color(val);
    } else if (hex.length == 6) {
      final fullHex = 'ff$hex';
      final val = int.tryParse(fullHex, radix: 16);
      if (val != null) return Color(val);
    } else if (hex.length == 8) {
      final r = hex.substring(0, 2);
      final g = hex.substring(2, 4);
      final b = hex.substring(4, 6);
      final a = hex.substring(6, 8);
      final fullHex = '$a$r$g$b';
      final val = int.tryParse(fullHex, radix: 16);
      if (val != null) return Color(val);
    }
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  if (str.startsWith('rgb')) {
    final match = RegExp(r'rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)').firstMatch(str);
    if (match != null) {
      final r = int.tryParse(match.group(1)!) ?? 0;
      final g = int.tryParse(match.group(2)!) ?? 0;
      final b = int.tryParse(match.group(3)!) ?? 0;
      final aStr = match.group(4);
      final a = aStr != null ? ((double.tryParse(aStr) ?? 1.0) * 255).round().clamp(0, 255) : 255;
      return Color.fromARGB(a, r, g, b);
    }
  }

  // Common named CSS colors
  const namedColors = <String, int>{
    'white': 0xFFFFFFFF,
    'black': 0xFF000000,
    'red': 0xFFFF0000,
    'green': 0xFF008000,
    'blue': 0xFF0000FF,
    'yellow': 0xFFFFFF00,
    'orange': 0xFFFFA500,
    'purple': 0xFF800080,
    'magenta': 0xFFFF00FF,
    'cyan': 0xFF00FFFF,
    'gray': 0xFF808080,
    'grey': 0xFF808080,
    'lightgray': 0xFFD3D3D3,
    'lightgrey': 0xFFD3D3D3,
    'darkgray': 0xFFA9A9A9,
    'darkgrey': 0xFFA9A9A9,
    'pink': 0xFFFFC0CB,
    'brown': 0xFFA52A2A,
    'navy': 0xFF000080,
    'teal': 0xFF008080,
    'olive': 0xFF808000,
    'maroon': 0xFF800000,
    'indigo': 0xFF4B0082,
    'violet': 0xFFEE82EE,
    'gold': 0xFFFFD700,
    'silver': 0xFFC0C0C0,
    'coral': 0xFFFF7F50,
    'tomato': 0xFFFF6347,
  };

  if (namedColors.containsKey(str)) {
    return Color(namedColors[str]!);
  }

  return fallback;
}
