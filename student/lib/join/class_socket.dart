import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import 'join_contract.dart';

/// Socket.IO 3.x client. Connects to `http://host:port` on [chalkSocketPath].
class ClassSocket {
  io.Socket? _socket;
  Completer<void>? _pending;
  Object? lastRoster;
  int _generation = 0;
  bool classStarted = false;
  void Function()? onClassStarted;
  void Function(Object? data)? onQuestList;
  void Function(String answer)? onBoardReply;
  void Function(String notes)? onClassNotes;
  void Function(Object? data)? onCanvasInit;
  void Function(Object? data)? onCanvasUpdate;
  void Function(Map<String, dynamic> delta)? onCanvasDelta;
  void Function(List<double> viewport)? onViewportUpdate;

  Future<void> hello({
    required String host,
    required int port,
    required String roomId,
    required String studentId,
    required String displayName,
  }) async {
    final cleanHost = host.trim();
    final lower = cleanHost.toLowerCase();
    if (cleanHost.isEmpty ||
        lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        cleanHost.contains('://')) {
      throw StateError('refused web address');
    }
    final name = displayName.trim();
    final room = roomId.trim();
    if (name.isEmpty || room.isEmpty) {
      throw StateError('name and room are required');
    }

    await close();
    final generation = ++_generation;
    classStarted = false;
    final completer = Completer<void>();
    _pending = completer;
    final socket = io.io(
      'http://$cleanHost:$port',
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setPath(chalkSocketPath)
          .disableAutoConnect()
          .disableReconnection()
          .enableForceNew()
          .setTimeout(8000)
          .build(),
    );
    _socket = socket;

    socket.on(chalkClassWelcome, (_) {
      if (generation != _generation) return;
      if (!completer.isCompleted) completer.complete();
    });
    socket.on(chalkClassRoster, (data) {
      if (generation != _generation) return;
      lastRoster = data;
    });
    socket.on(chalkClassStarted, (data) {
      if (generation != _generation) return;
      final announced = _roomIdOf(data);
      if (announced != null && announced != room) return;
      classStarted = true;
      onClassStarted?.call();
    });
    socket.on(chalkQuestList, (data) {
      if (generation != _generation) return;
      onQuestList?.call(data);
    });
    socket.on(chalkStudentReply, (data) {
      if (generation != _generation) return;
      final answer = _answerOf(data);
      if (answer == null) return;
      onBoardReply?.call(answer);
    });
    socket.on(chalkClassNotes, (data) {
      if (generation != _generation) return;
      final notes = _notesOf(data);
      if (notes == null) return;
      onClassNotes?.call(notes);
    });
    socket.on(chalkCanvasInit, (data) {
      if (generation != _generation) return;
      onCanvasInit?.call(data);
    });
    socket.on(chalkCanvasUpdate, (data) {
      if (generation != _generation) return;
      onCanvasUpdate?.call(data);
    });
    socket.on(chalkCanvasDelta, (data) {
      if (generation != _generation) return;
      if (data is Map) {
        onCanvasDelta?.call(Map<String, dynamic>.from(data));
      }
    });
    socket.on(chalkViewportUpdate, (data) {
      if (generation != _generation) return;
      if (data is Map && data['viewport'] is List) {
        final list = (data['viewport'] as List)
            .map((e) => (e as num).toDouble())
            .toList();
        onViewportUpdate?.call(list);
      }
    });
    socket.onConnect((_) {
      socket.emit(chalkStudentHello, {
        'roomId': room,
        'studentId': studentId,
        'displayName': name,
      });
    });
    socket.onConnectError((error) {
      if (!completer.isCompleted) {
        completer.completeError(error ?? 'connect_error');
      }
    });
    socket.connect();

    try {
      await completer.future.timeout(const Duration(seconds: 8));
    } catch (_) {
      await close();
      rethrow;
    }
  }

  void sendAnswer({
    required String questId,
    required String runId,
    required int questionIndex,
    required int optionIndex,
    required String mode,
    required int score,
    required bool finished,
  }) {
    _socket?.emit(chalkQuestAnswer, {
      'questId': questId,
      'runId': runId,
      'questionIndex': questionIndex,
      'optionIndex': optionIndex,
      'mode': mode,
      'score': score,
      'finished': finished,
    });
  }

  void sendAsk(String text, String lessonPart) {
    final line = text.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (line.isEmpty) return;
    _socket?.emit(chalkStudentAsk, {'text': line, 'lessonPart': lessonPart});
  }

  void requestCanvasSnapshot() {
    _socket?.emit(chalkCanvasRequest);
  }

  Future<void> close() async {
    _generation++;
    final pending = _pending;
    _pending = null;
    final socket = _socket;
    _socket = null;
    if (pending != null && !pending.isCompleted) {
      pending.future.ignore();
      pending.completeError(StateError('closed'));
    }
    socket?.disconnect();
    socket?.dispose();
  }
}

String? _roomIdOf(Object? data) {
  if (data is Map) {
    final room = data['roomId'];
    if (room is String && room.trim().isNotEmpty) return room.trim();
  }
  if (data is List && data.isNotEmpty) {
    final first = data.first;
    if (first is Object) return _roomIdOf(first);
  }
  return null;
}

String? _answerOf(Object? data) {
  final map = _mapOf(data);
  final answer = map?['answer'];
  if (answer is String && answer.trim().isNotEmpty) return answer.trim();
  return null;
}

String? _notesOf(Object? data) {
  final map = _mapOf(data);
  final text = map?['text'];
  if (text is String) return text;
  return null;
}

Map<dynamic, dynamic>? _mapOf(Object? data) {
  if (data is Map) return data;
  if (data is List && data.isNotEmpty && data.first is Map) {
    return data.first as Map;
  }
  return null;
}
