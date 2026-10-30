const _digitWords = <String, String>{
  'zero': '0',
  'oh': '0',
  'o': '0',
  'one': '1',
  'won': '1',
  'two': '2',
  'to': '2',
  'too': '2',
  'three': '3',
  'four': '4',
  'for': '4',
  'five': '5',
  'six': '6',
  'seven': '7',
  'eight': '8',
  'ate': '8',
  'nine': '9',
};

/// Four class-number digits from "4821" or "four eight two one".
/// Returns null when the hearing is not four digits.
String? extractFourDigits(String input) {
  final numeric = RegExp(r'(^|[^\d])(\d{4})(?!\d)').firstMatch(input);
  if (numeric != null) return numeric.group(2);

  final spoken = longestSpokenDigitRun(input);
  if (spoken.length >= 4) return spoken.substring(0, 4);
  return null;
}

/// Digits heard so far, for the four empty boxes. Never longer than four.
String partialClassDigits(String input) {
  final exact = extractFourDigits(input);
  if (exact != null) return exact;
  final spoken = longestSpokenDigitRun(input);
  if (spoken.length <= 4) return spoken;
  return spoken.substring(0, 4);
}

String longestSpokenDigitRun(String input) {
  final tokens = RegExp(
    r'[A-Za-z0-9]+',
  ).allMatches(input.toLowerCase()).map((match) => match.group(0)!);
  var best = '';
  var current = '';
  for (final token in tokens) {
    final digit = _oneDigit(token);
    if (digit == null) {
      if (current.length > best.length) best = current;
      current = '';
      continue;
    }
    current += digit;
    if (current.length >= 4) return current.substring(0, 4);
  }
  if (current.length > best.length) best = current;
  return best;
}

bool isSpokenDigitsOnly(String input) {
  final tokens = RegExp(
    r'[A-Za-z0-9]+',
  ).allMatches(input.toLowerCase()).map((match) => match.group(0)!).toList();
  if (tokens.isEmpty) return true;
  return tokens.every(
    (token) => _oneDigit(token) != null || _isMultiDigit(token),
  );
}

bool _isMultiDigit(String token) => RegExp(r'^\d+$').hasMatch(token);

String? _oneDigit(String token) {
  if (token.length == 1 && RegExp(r'^\d$').hasMatch(token)) return token;
  return _digitWords[token];
}
