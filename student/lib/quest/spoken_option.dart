final _optionWord = RegExp(r'\b(one|two|three|four|[1-4])\b');

/// The last spoken choice wins, so a correction still counts.
int? optionFromSpeech(String words) {
  final matches = _optionWord.allMatches(words.toLowerCase()).toList();
  if (matches.isEmpty) return null;
  switch (matches.last.group(1)) {
    case '1':
    case 'one':
      return 0;
    case '2':
    case 'two':
      return 1;
    case '3':
    case 'three':
      return 2;
    case '4':
    case 'four':
      return 3;
    default:
      return null;
  }
}

const optionWords = ['one', 'two', 'three', 'four'];

String spokenQuestion({
  required String question,
  required List<String> options,
  int? skipIndex,
}) {
  final lines = <String>['$question.'];
  for (var i = 0; i < options.length && i < optionWords.length; i++) {
    if (i == skipIndex) continue;
    lines.add('${optionWords[i]}. ${options[i]}.');
  }
  return lines.join(' ');
}
