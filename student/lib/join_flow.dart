import 'dart:async';

import 'package:flutter/material.dart';

import 'quest/quest_pack.dart';
import 'quest/quest_play_screen.dart';
import 'screens/ask_board_screen.dart';
import 'join/beacon_listener.dart';
import 'screens/nearby_screen.dart';
import 'join/class_digits.dart';
import 'join/class_socket.dart';
import 'join/join_intents.dart';
import 'join/join_link.dart';
import 'join/laptop_address.dart';
import 'join/spoken_name.dart';
import 'join/student_store.dart';
import 'join/voice_join.dart';
import 'screens/connected_screen.dart';
import 'screens/join_screen.dart';
import 'screens/listen_screen.dart';
import 'screens/name_screen.dart';
import 'screens/passage_screen.dart';
import 'screens/scan_screen.dart';

enum _Stage { scanning, nearby, listen, askName, pick, joining, connected, failed }

/// Name, scan or code, socket, and the no-tap voice join.
class JoinFlow extends StatefulWidget {
  const JoinFlow({super.key});

  @override
  State<JoinFlow> createState() => _JoinFlowState();
}

class _JoinFlowState extends State<JoinFlow> {
  final _store = StudentStore();
  final _voice = VoiceJoin();
  final _socket = ClassSocket();
  final _beacons = BeaconListener();
  final _intents = JoinIntents();

  _Stage _stage = _Stage.listen;
  int _epoch = 0;
  String _studentId = '';
  String? _name;
  String _room = '';
  String _partial = '';
  String _headline = 'Say your class number';
  String _joiningMessage = 'Joining the class';
  String _failTitle = "I can't find the class";
  String _failDetail = 'Check you are on the same Wi-Fi as the board.';
  JoinTarget? _pending;
  JoinTarget? _retryTarget;
  JoinTarget? _opening;
  JoinTarget? _queued;
  bool _ready = false;
  bool _classStarted = false;
  List<NearbyClass> _nearby = const [];
  String _notes = '';
  List<QuestPack> _quests = const [];
  String? _liveQuestId;
  bool _liveClosed = false;
  Map<String, int> _scores = const {};

  @override
  void initState() {
    super.initState();
    _intents.listen(_onIntent);
    _socket.onClassStarted = () {
      if (!mounted) return;
      setState(() => _classStarted = true);
    };
    _socket.onQuestList = (data) {
      final update = parseQuestList(data);
      if (!mounted || update == null) return;
      setState(() {
        _quests = update.quests;
        _liveQuestId = update.liveQuestId;
        _liveClosed = update.liveClosed;
      });
    };
    _socket.onClassNotes = (notes) {
      if (!mounted) return;
      setState(() => _notes = notes);
    };
    unawaited(_boot());
  }

  @override
  void dispose() {
    _epoch++;
    unawaited(_voice.dispose());
    unawaited(_socket.close());
    unawaited(_beacons.cancel());
    super.dispose();
  }

  Future<void> _boot() async {
    final identity = await _store.load();
    if (!mounted) return;
    _studentId = identity.studentId;
    _name = identity.displayName;
    final scores = await PhoneQuestScores.load();
    if (!mounted) return;
    _scores = scores;
    final target = await _intents.initialTarget();
    if (!mounted) return;
    _ready = true;
    final queued = _queued;
    _queued = null;
    final chosen = target ?? queued;
    if (chosen != null) {
      _opening = chosen;
      await _begin(chosen);
      return;
    }
    await _lookForClasses();
  }

  void _onIntent(JoinTarget target) {
    if (!_ready) {
      _queued = target;
      return;
    }
    if (_opening != null && _opening == target) {
      _opening = null;
      return;
    }
    unawaited(_begin(target));
  }

  bool _alive(int epoch) => mounted && epoch == _epoch;

  Future<void> _begin(JoinTarget target) async {
    final epoch = ++_epoch;
    _dismissKeyboard();
    if (mounted) setState(() => _classStarted = false);
    await _voice.stop();
    await _beacons.cancel();
    await _socket.close();
    if (!_alive(epoch)) return;

    if (target.hasEndpoint) {
      final name = _name;
      if (name == null) {
        setState(() {
          _pending = target;
          _room = target.room;
          _stage = _Stage.askName;
        });
        return;
      }
      await _connect(
        host: target.host!,
        port: target.port!,
        room: target.room,
        name: name,
        epoch: epoch,
      );
      return;
    }

    final name = _name;
    if (name == null) {
      await _askSpokenName(target.room, epoch);
      return;
    }
    await _beaconAndConnect(target.room, name, epoch);
  }

  Future<void> _lookForClasses() async {
    final epoch = _epoch;
    if (mounted) {
      setState(() {
        _stage = _Stage.scanning;
        _joiningMessage = 'Looking for a class on this network';
      });
    }
    final found = await _beacons.discover();
    if (!_alive(epoch)) return;
    if (found.isNotEmpty) {
      setState(() {
        _nearby = found;
        _stage = _Stage.nearby;
      });
      return;
    }
    await _runVoice();
  }

  Future<void> _sayAgain() async {
    _epoch++;
    await _voice.stop();
    await _beacons.cancel();
    await _runVoice();
  }

  Future<void> _runVoice() async {
    final epoch = _epoch;
    if (!_alive(epoch)) return;
    setState(() {
      _stage = _Stage.listen;
      _headline = 'Say your class number';
      _partial = '';
    });
    final digits = await _voice.askClassNumber(
      alive: () => _alive(epoch),
      onPartial: (words) {
        if (!_alive(epoch)) return;
        setState(() => _partial = partialClassDigits(words));
      },
    );
    if (!_alive(epoch)) return;
    if (digits == null) {
      setState(() => _stage = _nearby.isNotEmpty ? _Stage.nearby : _Stage.pick);
      return;
    }
    setState(() => _partial = digits);
    final name = _name;
    if (name == null) {
      await _askSpokenName(digits, epoch);
    } else {
      await _beaconAndConnect(digits, name, epoch);
    }
  }

  Future<void> _askSpokenName(String room, int epoch) async {
    if (!_alive(epoch)) return;
    setState(() {
      _stage = _Stage.listen;
      _headline = 'Say your name';
      _room = room;
      _partial = room;
    });
    final spoken = await _voice.askName(alive: () => _alive(epoch));
    if (!_alive(epoch)) return;
    final name = cleanSpokenName(spoken);
    if (name == null) {
      setState(() {
        _pending = JoinTarget(room: room);
        _stage = _Stage.askName;
      });
      return;
    }
    await _store.saveName(name);
    if (!_alive(epoch)) return;
    setState(() => _name = name);
    await _beaconAndConnect(room, name, epoch);
  }

  void _dismissKeyboard() {
    FocusManager.instance.primaryFocus?.unfocus();
  }

  Future<void> _beaconAndConnect(String room, String name, int epoch) async {
    if (!_alive(epoch)) return;
    _dismissKeyboard();
    setState(() {
      _stage = _Stage.joining;
      _joiningMessage = 'Looking for the class';
      _room = room;
    });
    final hit = await _beacons.waitForClass(room);
    if (!_alive(epoch)) return;
    if (hit == null) {
      _fail(
        title: "I can't find the class",
        detail: 'Check you are on the same Wi-Fi as the board.',
        speak: true,
        retry: JoinTarget(room: room),
      );
      return;
    }
    await _connect(
      host: hit.host,
      port: hit.port,
      room: room,
      name: name,
      epoch: epoch,
    );
  }

  Future<void> _connect({
    required String host,
    required int port,
    required String room,
    required String name,
    required int epoch,
  }) async {
    if (!_alive(epoch)) return;
    _dismissKeyboard();
    setState(() {
      _stage = _Stage.joining;
      _joiningMessage = 'Joining the class';
      _room = room;
    });
    for (var attempt = 0; attempt < 2; attempt++) {
      if (!_alive(epoch)) return;
      try {
        await _socket.hello(
          host: host,
          port: port,
          roomId: room,
          studentId: _studentId,
          displayName: name,
        );
        if (!_alive(epoch)) return;
        setState(() {
          _stage = _Stage.connected;
          _classStarted = _socket.classStarted;
        });
        unawaited(_voice.speak('Joined'));
        return;
      } catch (_) {
        if (!_alive(epoch)) return;
        if (attempt == 0) {
          await Future<void>.delayed(const Duration(milliseconds: 400));
        }
      }
    }
    if (!_alive(epoch)) return;
    _fail(
      title: "I can't find the class",
      detail: 'Check you are on the same Wi-Fi as the board.',
      speak: true,
      retry: JoinTarget(host: host, port: port, room: room),
    );
  }

  void _fail({
    required String title,
    required String detail,
    required bool speak,
    JoinTarget? retry,
  }) {
    if (!mounted) return;
    setState(() {
      _stage = _Stage.failed;
      _failTitle = title;
      _failDetail = detail;
      _retryTarget = retry;
    });
    if (speak) unawaited(_voice.speak("I can't find the class"));
  }

  Future<void> _onName(String raw) async {
    final name = raw.trim();
    if (name.isEmpty) return;
    await _store.saveName(name);
    if (!mounted) return;
    setState(() => _name = name);
    final pending = _pending;
    _pending = null;
    if (pending != null) {
      await _begin(pending);
      return;
    }
    setState(() => _stage = _Stage.pick);
  }

  Future<void> _onTyped(String room, LaptopAddress address, {String? name}) async {
    final typed = name?.trim();
    if (typed != null && typed.isNotEmpty) {
      await _store.saveName(typed);
      if (!mounted) return;
      setState(() => _name = typed);
    }
    _dismissKeyboard();
    await _begin(JoinTarget(host: address.host, port: address.port, room: room));
  }

  Future<void> _onScan() async {
    final raw = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const ScanScreen()),
    );
    if (!mounted || raw == null) return;
    final target = parseChalkJoin(raw);
    if (target == null || !target.hasEndpoint) {
      _fail(
        title: 'That code is not a Chalk class.',
        detail: 'Point the camera at the code on the board.',
        speak: false,
      );
      return;
    }
    await _begin(target);
  }

  Future<void> _play(QuestPack quest, QuestMode mode) async {
    final score = await Navigator.of(context).push<int>(
      MaterialPageRoute(
        builder: (_) => QuestPlayScreen(
          quest: quest,
          mode: mode,
          onAnswer: (report) async {
            _socket.sendAnswer(
              questId: report.questId,
              runId: report.runId,
              questionIndex: report.questionIndex,
              optionIndex: report.optionIndex,
              mode: report.mode,
              score: report.score,
              finished: report.finished,
            );
          },
          onAsk: (text, lessonPart) => _ask(lessonPart, text),
        ),
      ),
    );
    if (!mounted || score == null) return;
    final next = Map<String, int>.from(_scores);
    next[quest.id] = score;
    setState(() => _scores = next);
    await PhoneQuestScores.save(next);
  }

  Future<void> _ask(String lessonPart, [String? ready]) async {
    if (ready != null) {
      _socket.sendAsk(ready, lessonPart);
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => AskBoardScreen(
          lessonPart: lessonPart,
          onSend: (text) async => _socket.sendAsk(text, lessonPart),
          onBindReply: (show) {
            _socket.onBoardReply = show;
          },
        ),
      ),
    );
  }

  Future<void> _onTryAgain() async {
    final target = _retryTarget;
    if (target != null) {
      await _begin(target);
      return;
    }
    if (!mounted) return;
    setState(() => _stage = _name == null ? _Stage.askName : _Stage.pick);
  }

  @override
  Widget build(BuildContext context) {
    return switch (_stage) {
      _Stage.scanning => JoiningScreen(message: _joiningMessage),
      _Stage.nearby => NearbyScreen(
        classes: _nearby,
        onJoin: (room) => unawaited(_begin(JoinTarget(host: room.host, port: room.port, room: room.room))),
        onSayAgain: () => unawaited(_sayAgain()),
        onType: () => setState(() => _stage = _Stage.pick),
      ),
      _Stage.listen => ListenScreen(
        headline: _headline,
        digits: _partial,
        footnote: _headline == 'Say your name'
            ? 'We will join with that name.'
            : 'Then say your name.',
      ),
      _Stage.askName => NameScreen(onSubmit: (name) => unawaited(_onName(name))),
      _Stage.pick => JoinScreen(
        knownName: _name,
        onScan: () => unawaited(_onScan()),
        onSayAgain: () => unawaited(_sayAgain()),
        onSubmit: (room, address, {name}) => unawaited(_onTyped(room, address, name: name)),
      ),
      _Stage.joining => JoiningScreen(message: _joiningMessage),
      _Stage.connected => ConnectedScreen(
        room: _room,
        name: _name ?? '',
        started: _classStarted,
        quests: _quests,
        liveQuestId: _liveQuestId,
        liveClosed: _liveClosed,
        notes: _notes,
        scores: _scores,
        onPlay: (quest, mode) => unawaited(_play(quest, mode)),
        onAsk: () => unawaited(_ask('Class')),
      ),
      _Stage.failed => FailedScreen(
        title: _failTitle,
        detail: _failDetail,
        onRetry: () => unawaited(_onTryAgain()),
      ),
    };
  }
}
