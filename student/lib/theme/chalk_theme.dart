import 'package:flutter/material.dart';

class ChalkColors {
  static const cream = Color(0xFFFFF6EE);
  static const creamDeep = Color(0xFFFFFBF7);
  static const ink = Color(0xFF1C1917);
  static const brown = Color(0xFF8D6A4A);
  static const brownDeep = Color(0xFF7A4E2D);
  static const peach = Color(0xFFFF8F66);
  static const peachLip = Color(0xFFE06A3C);
  static const creamButton = Color(0xFFFFF3E8);
  static const creamLip = Color(0xFFE7D3C0);
  static const green = Color(0xFF1F7A45);
  static const greenLip = Color(0xFF145C32);
  static const greenSoft = Color(0xFFDDF3E4);
  static const mint = Color(0xFFE5F6EC);
  static const field = Color(0xFFFFFFFF);
  static const hint = Color(0xFFC9B8AA);
  static const box = Color(0xFFF7EDE3);
  static const dash = Color(0xFFC4B09A);
}

ThemeData chalkTheme() {
  const scheme = ColorScheme.light(
    primary: ChalkColors.peach,
    onPrimary: Colors.white,
    secondary: ChalkColors.green,
    onSecondary: Colors.white,
    surface: ChalkColors.cream,
    onSurface: ChalkColors.ink,
    error: ChalkColors.peachLip,
    onError: Colors.white,
  );
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: ChalkColors.cream,
    colorScheme: scheme,
    splashFactory: NoSplash.splashFactory,
    splashColor: Colors.transparent,
    highlightColor: Colors.transparent,
    textSelectionTheme: const TextSelectionThemeData(
      cursorColor: ChalkColors.peach,
      selectionColor: Color(0x55FF8F66),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: ChalkColors.cream,
      foregroundColor: ChalkColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: ChalkColors.field,
      hintStyle: const TextStyle(
        color: ChalkColors.hint,
        fontWeight: FontWeight.w700,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(28),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(28),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(28),
        borderSide: const BorderSide(color: ChalkColors.peach, width: 2),
      ),
    ),
  );
}

const chalkTitle = TextStyle(
  fontSize: 28,
  height: 1.15,
  fontWeight: FontWeight.w800,
  color: ChalkColors.ink,
  letterSpacing: -0.4,
);

const chalkSubtitle = TextStyle(
  fontSize: 16,
  height: 1.3,
  fontWeight: FontWeight.w600,
  color: ChalkColors.brown,
);
