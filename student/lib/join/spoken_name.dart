import 'class_digits.dart';

/// A spoken display name. Empty hearings and a bare class number are dropped.
String? cleanSpokenName(String? raw) {
  if (raw == null) return null;
  var text = raw.replaceAll('\u2019', "'").replaceAll(RegExp(r'\s+'), ' ').trim();
  text = text.replaceAll(RegExp(r'[.!,]+$'), '').trim();
  if (text.isEmpty) return null;

  final lower = text.toLowerCase();
  const prefixes = <String>[
    'my name is ',
    'name is ',
    "i'm ",
    'i am ',
    "it's ",
    'it is ',
    'this is ',
    'call me ',
  ];
  for (final prefix in prefixes) {
    if (lower.startsWith(prefix)) {
      text = text.substring(prefix.length).trim();
      break;
    }
  }
  if (text.isEmpty) return null;
  if (isSpokenDigitsOnly(text)) return null;
  if (text.length > 80) text = text.substring(0, 80).trim();
  return text;
}
