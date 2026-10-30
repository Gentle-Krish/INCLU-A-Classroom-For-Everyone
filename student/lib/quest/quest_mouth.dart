import 'dart:async';

import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';

abstract class QuestMouth {
  Future<void> speak(String words);
  Future<String> listenOnce();
}

class DeviceQuestMouth implements QuestMouth {
  DeviceQuestMouth({SpeechToText? speech, FlutterTts? tts})
    : _speech = speech ?? SpeechToText(),
      _tts = tts ?? FlutterTts();

  final SpeechToText _speech;
  final FlutterTts _tts;
  bool? _ready;
  String _latest = '';
  Completer<String>? _active;

  @override
  Future<void> speak(String words) async {
    try {
      await _tts.awaitSpeakCompletion(true);
      await _tts.speak(words);
    } catch (_) {}
  }

  @override
  Future<String> listenOnce() async {
    if (!await _ensure()) return '';
    try {
      if (_speech.isListening) await _speech.stop();
    } catch (_) {}
    _latest = '';
    final completer = Completer<String>();
    _active = completer;
    try {
      await _speech.listen(
        onResult: (result) {
          _latest = result.recognizedWords;
          if (result.finalResult && !completer.isCompleted) completer.complete(_latest);
        },
        listenOptions: SpeechListenOptions(
          onDevice: true,
          partialResults: true,
          cancelOnError: true,
          listenMode: ListenMode.confirmation,
          listenFor: const Duration(seconds: 6),
          pauseFor: const Duration(seconds: 3),
        ),
      );
    } catch (_) {
      if (!completer.isCompleted) completer.complete(_latest);
      return _latest;
    }
    final heard = await completer.future.timeout(
      const Duration(seconds: 8),
      onTimeout: () => _latest,
    );
    try {
      if (_speech.isListening) await _speech.stop();
    } catch (_) {}
    if (identical(_active, completer)) _active = null;
    return heard;
  }

  Future<bool> _ensure() async {
    if (_ready != null) return _ready!;
    try {
      _ready = await _speech.initialize(
        onError: (_) {
          final pending = _active;
          if (pending != null && !pending.isCompleted) pending.complete(_latest);
        },
      );
    } catch (_) {
      _ready = false;
    }
    return _ready ?? false;
  }
}
