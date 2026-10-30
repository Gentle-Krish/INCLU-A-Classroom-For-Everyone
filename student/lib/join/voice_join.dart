import 'dart:async';

import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';

import 'class_digits.dart';

/// One short listen after speech. This is the class-number join, not a quiz.
class VoiceJoin {
  VoiceJoin({SpeechToText? speech, FlutterTts? tts})
    : _speech = speech ?? SpeechToText(),
      _tts = tts ?? FlutterTts();

  final SpeechToText _speech;
  final FlutterTts _tts;
  bool? _ready;
  String _latest = '';
  bool _heardListening = false;
  Completer<String>? _activeListen;

  Future<String?> askClassNumber({
    required bool Function() alive,
    void Function(int attempt)? onAttempt,
    void Function(String words)? onPartial,
  }) async {
    if (!alive()) return null;
    onAttempt?.call(0);
    await speak('Say your class number');
    if (!alive()) return null;
    await Future<void>.delayed(const Duration(milliseconds: 700));
    if (!alive()) return null;
    final heard = await listenOnce(onPartial: onPartial);
    if (!alive()) return null;
    return extractFourDigits(heard);
  }

  Future<String> askName({required bool Function() alive}) async {
    if (!alive()) return '';
    await speak('Say your name');
    if (!alive()) return '';
    await Future<void>.delayed(const Duration(milliseconds: 350));
    if (!alive()) return '';
    return listenOnce();
  }

  Future<void> speak(String words) async {
    try {
      await _tts.awaitSpeakCompletion(true);
      await _tts.speak(words);
    } catch (_) {}
  }

  Future<String> listenOnce({void Function(String words)? onPartial}) async {
    if (!await _ensure()) return '';
    try {
      if (_speech.isListening) await _speech.stop();
    } catch (_) {}

    _latest = '';
    _heardListening = false;
    final completer = Completer<String>();
    _activeListen = completer;
    try {
      await _speech.listen(
        onResult: (result) {
          _latest = result.recognizedWords;
          onPartial?.call(_latest);
          if (result.finalResult && !completer.isCompleted) {
            completer.complete(_latest);
          }
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
    if (identical(_activeListen, completer)) _activeListen = null;
    return heard;
  }

  Future<void> stop() async {
    try {
      await _tts.stop();
    } catch (_) {}
    try {
      await _speech.stop();
    } catch (_) {}
    final pending = _activeListen;
    _activeListen = null;
    if (pending != null && !pending.isCompleted) pending.complete(_latest);
  }

  Future<void> dispose() async {
    await stop();
  }

  Future<bool> _ensure() async {
    if (_ready != null) return _ready!;
    try {
      _ready = await _speech.initialize(
        onError: (_) {
          final pending = _activeListen;
          if (pending != null && !pending.isCompleted) pending.complete(_latest);
        },
        onStatus: (status) {
          final pending = _activeListen;
          if (pending == null || pending.isCompleted) return;
          if (status == 'listening') {
            _heardListening = true;
            return;
          }
          if (!_heardListening) return;
          if (status == 'done' || status == 'notListening') {
            pending.complete(_latest);
          }
        },
      );
    } catch (_) {
      _ready = false;
    }
    return _ready ?? false;
  }
}
