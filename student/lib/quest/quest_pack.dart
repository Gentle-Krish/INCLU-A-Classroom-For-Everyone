import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class QuestQuestion {
  const QuestQuestion({
    required this.question,
    required this.options,
    required this.correctAnswerIndex,
    required this.explanation,
    required this.lessonPart,
  });

  final String question;
  final List<String> options;
  final int correctAnswerIndex;
  final String explanation;
  final String lessonPart;
}

class QuestPack {
  const QuestPack({
    required this.id,
    required this.questTitle,
    required this.bossName,
    required this.questions,
  });

  final String id;
  final String questTitle;
  final String bossName;
  final List<QuestQuestion> questions;
}

class QuestListUpdate {
  const QuestListUpdate({
    required this.liveQuestId,
    required this.quests,
    this.liveClosed = false,
  });

  final String? liveQuestId;
  final List<QuestPack> quests;
  final bool liveClosed;
}

Map<String, dynamic>? questMap(Object? data) {
  if (data is Map) {
    return data.map((key, value) => MapEntry('$key', value));
  }
  if (data is List && data.isNotEmpty) return questMap(data.first);
  return null;
}

QuestPack? parseQuestPack(Object? data) {
  final map = questMap(data);
  if (map == null) return null;
  final id = map['id'];
  final title = map['questTitle'];
  final boss = map['bossName'];
  final rawQuestions = map['questions'];
  if (id is! String || id.isEmpty || title is! String || boss is! String) return null;
  if (rawQuestions is! List || rawQuestions.length != 5) return null;
  final questions = <QuestQuestion>[];
  for (final item in rawQuestions) {
    final row = questMap(item);
    if (row == null) return null;
    final options = row['options'];
    final index = row['correctAnswerIndex'];
    final question = row['question'];
    final explanation = row['explanation'];
    if (question is! String || question.trim().isEmpty) return null;
    if (explanation is! String || explanation.trim().isEmpty) return null;
    if (options is! List || options.length != 4) return null;
    final cleaned = options.map((option) => '$option'.trim()).toList();
    if (cleaned.any((option) => option.isEmpty)) return null;
    final correct = index is int ? index : int.tryParse('$index');
    if (correct == null || correct < 0 || correct > 3) return null;
    final part = row['lessonPart'];
    questions.add(
      QuestQuestion(
        question: question.trim(),
        options: cleaned,
        correctAnswerIndex: correct,
        explanation: explanation.trim(),
        lessonPart: part is String && part.trim().isNotEmpty ? part.trim() : 'This lesson',
      ),
    );
  }
  return QuestPack(
    id: id,
    questTitle: title.trim(),
    bossName: boss.trim(),
    questions: questions,
  );
}

QuestListUpdate? parseQuestList(Object? data) {
  final map = questMap(data);
  if (map == null || map['quests'] is! List) return null;
  final quests = <QuestPack>[];
  for (final item in map['quests'] as List) {
    final pack = parseQuestPack(item);
    if (pack != null) quests.add(pack);
  }
  final live = map['liveQuestId'];
  return QuestListUpdate(
    liveQuestId: live is String && live.isNotEmpty ? live : null,
    quests: quests,
    liveClosed: map['liveClosed'] == true,
  );
}

class PhoneQuestScores {
  static const key = 'chalk.quest.scores.v1';

  static Future<Map<String, int>> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(key);
      if (raw == null || raw.isEmpty) return {};
      final data = jsonDecode(raw);
      if (data is! Map) return {};
      return data.map(
        (id, value) => MapEntry('$id', value is int ? value : int.tryParse('$value') ?? 0),
      );
    } catch (_) {
      return {};
    }
  }

  static Future<void> save(Map<String, int> scores) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, jsonEncode(scores));
  }
}
