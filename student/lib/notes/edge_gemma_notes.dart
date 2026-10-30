import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_edge_ai/flutter_edge_ai.dart';
import 'package:flutter_edge_ai_litertlm/flutter_edge_ai_litertlm.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'notes_revision.dart';

/// Official Gemma 4 E2B file LiteRT-LM runs on Android.
///
/// The download URL is [gemma4E2bDownloadUrl]. Hugging Face answers that
/// address with 302, then the file bytes. It does not need a token.
/// The plugin's own downloader was reporting HTTP 400 for this redirect,
/// so the phone follows the redirect itself and then hands the file to
/// flutter_edge_ai with fromFile.
const String gemma4E2bFile = 'gemma-4-E2B-it.litertlm';
const String gemma4E2bModelId = 'gemma-4-E2B-it';
const MethodChannel _modelChannel = MethodChannel('app.chalk.chalk_student/join');
const String _downloadIdKey = 'chalk.gemma.downloadId';

class EdgeGemmaNotes implements NotesRevision {
  final _changes = StreamController<NotesSetup>.broadcast();
  NotesSetup _setup = const NotesSetup(kind: NotesSetupKind.needsModel);
  static Future<void>? _engine;
  Future<void>? _active;
  bool _busy = false;

  @override
  NotesSetup get setup => _setup;

  @override
  Stream<NotesSetup> get changes => _changes.stream;

  void _emit(NotesSetup next) {
    _setup = next;
    if (!_changes.isClosed) _changes.add(next);
  }

  static Future<void> _ensureEngine() async {
    final pending = _engine;
    if (pending != null) {
      await pending;
      return;
    }
    final next = FlutterEdgeAi.initialize(
      inferenceEngines: const [LiteRtLmEngine()],
    );
    _engine = next;
    try {
      await next;
    } catch (_) {
      if (identical(_engine, next)) _engine = null;
      rethrow;
    }
  }

  Future<bool> _complete(File file) async {
    if (!await file.exists()) return false;
    return gemmaWeightIsComplete(await file.length());
  }

  Future<File?> _storedModel() async {
    final roots = <Directory>[
      await getApplicationDocumentsDirectory(),
      await getApplicationSupportDirectory(),
      ...?(await getExternalStorageDirectories()),
    ];
    final seen = <String>{};
    for (final root in roots) {
      if (!await root.exists()) continue;
      final named = <File>[
        File('${root.path}${Platform.pathSeparator}$gemma4E2bFile'),
        File(
          '${root.path}${Platform.pathSeparator}flutter_gemma${Platform.pathSeparator}$gemma4E2bFile',
        ),
      ];
      for (final file in named) {
        if (!seen.add(file.path)) continue;
        if (await _complete(file)) return file;
      }
      await for (final entity in root.list(recursive: true, followLinks: false)) {
        if (entity is! File) continue;
        final slash = entity.path.lastIndexOf(Platform.pathSeparator);
        final name = slash == -1 ? entity.path : entity.path.substring(slash + 1);
        if (name != gemma4E2bFile || !seen.add(entity.path)) continue;
        if (await _complete(entity)) return entity;
      }
    }
    return null;
  }

  Future<void> _register(File file) async {
    await FlutterEdgeAi.installModel(
      modelType: ModelType.gemma4,
      fileType: ModelFileType.litertlm,
    ).fromFile(file.path).install();
  }

  Future<File> _downloadWithSystem(void Function(int percent) onProgress) async {
    final prefs = await SharedPreferences.getInstance();
    final savedId = prefs.getString(_downloadIdKey);
    Map<dynamic, dynamic>? status;
    if (savedId != null) {
      status = await _modelChannel.invokeMapMethod<dynamic, dynamic>(
        'modelDownloadStatus',
        {'id': savedId},
      );
    }
    if (status == null || status['state'] == 'missing' || status['state'] == 'failed') {
      _emit(const NotesSetup(kind: NotesSetupKind.started));
      debugPrint('Chalk: Gemma download started');
      status = await _modelChannel.invokeMapMethod<dynamic, dynamic>(
        'downloadModel',
        {'url': gemma4E2bDownloadUrl, 'fileName': gemma4E2bFile},
      );
      final id = status?['id'];
      if (id is String && id.isNotEmpty) {
        await prefs.setString(_downloadIdKey, id);
      }
    }
    while (true) {
      final state = status?['state'];
      if (state == 'complete') {
        await prefs.remove(_downloadIdKey);
        final path = status?['path'];
        if (path is String && await _complete(File(path))) return File(path);
        final stored = await _storedModel();
        if (stored != null) return stored;
        throw const HttpException('The model download did not finish.');
      }
      if (state == 'failed') {
        await prefs.remove(_downloadIdKey);
        throw HttpException(
          status?['message'] as String? ??
              'The model did not download. Check the internet and try again.',
        );
      }
      final percent = status?['percent'];
      onProgress(percent is int ? percent : 0);
      await Future<void>.delayed(const Duration(seconds: 1));
      final id = prefs.getString(_downloadIdKey);
      if (id == null) {
        throw const HttpException('The model download did not start.');
      }
      status = await _modelChannel.invokeMapMethod<dynamic, dynamic>(
        'modelDownloadStatus',
        {'id': id},
      );
    }
  }

  Future<File> _downloadOfficial(void Function(int percent) onProgress) async {
    final docs = await getApplicationDocumentsDirectory();
    final dest = File('${docs.path}${Platform.pathSeparator}$gemma4E2bFile');
    if (await _complete(dest)) return dest;
    final partial = File('${dest.path}.partial');
    if (await dest.exists() && !await _complete(dest)) {
      if (await partial.exists()) await partial.delete();
      await dest.rename(partial.path);
    }

    Object? lastError;
    for (var attempt = 0; attempt < 8; attempt++) {
      try {
        await _pullAttempt(partial, onProgress);
        if (await _complete(partial)) {
          if (await dest.exists()) await dest.delete();
          return partial.rename(dest.path);
        }
        lastError = const HttpException('The model download did not finish.');
      } catch (error) {
        lastError = error;
        debugPrint('Chalk: Gemma download attempt failed');
      }
      await Future<void>.delayed(const Duration(seconds: 2));
    }
    if (await partial.exists() && await partial.length() > 0) {
      throw const HttpException(
        'The download stopped. Try again. It will continue.',
      );
    }
    throw lastError ?? const HttpException('The model download did not finish.');
  }

  Future<void> _pullAttempt(File partial, void Function(int percent) onProgress) async {
    final client = HttpClient()
      ..autoUncompress = false
      ..connectionTimeout = const Duration(seconds: 30)
      ..idleTimeout = const Duration(minutes: 2)
      ..userAgent = 'ChalkStudent/1.0';
    IOSink? sink;
    try {
      final start = resumeByte(await partial.exists() ? await partial.length() : 0);
      if (gemmaWeightIsComplete(start)) return;
      final response = await _followModel(client, start);
      final code = response.statusCode;
      final rewrite = code == 200 && start > 0;
      if (rewrite && await partial.exists()) await partial.delete();
      sink = partial.openWrite(
        mode: rewrite || start == 0 ? FileMode.write : FileMode.append,
      );
      var received = rewrite || start == 0 ? 0 : start;
      var lastPercent = -1;
      var lastFlush = received;
      onProgress(downloadPercent(received));
      await for (final chunk in response.timeout(const Duration(seconds: 30))) {
        sink.add(chunk);
        received += chunk.length;
        final percent = downloadPercent(received);
        if (percent != lastPercent) {
          lastPercent = percent;
          onProgress(percent);
        }
        if (received - lastFlush >= 1024 * 1024) {
          lastFlush = received;
          await sink.flush();
        }
      }
      await sink.flush();
      await sink.close();
      sink = null;
    } catch (error) {
      if (sink != null) {
        await sink.flush();
        await sink.close();
      }
      rethrow;
    } finally {
      client.close(force: true);
    }
  }

  Future<HttpClientResponse> _followModel(HttpClient client, int start) async {
    var current = Uri.parse(gemma4E2bDownloadUrl);
    for (var hop = 0; hop < 5; hop++) {
      debugPrint('Chalk: Gemma download request ${current.host}');
      final request = await client.getUrl(current);
      request.followRedirects = false;
      request.headers.set(HttpHeaders.acceptHeader, '*/*');
      request.headers.set(HttpHeaders.acceptEncodingHeader, 'identity');
      final next = await request.close();
      final code = next.statusCode;
      debugPrint('Chalk: Gemma download response $code');
      if (code == 200 || code == 206) return next;
      if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
        final location = next.headers.value(HttpHeaders.locationHeader);
        await next.drain<void>();
        if (location == null || location.isEmpty) {
          throw const HttpException('The model download did not start.');
        }
        current = current.resolve(location);
        if (start > 0) return _rangedGet(client, current, start);
        continue;
      }
      if (code == 416 && gemmaWeightIsComplete(start)) {
        await next.drain<void>();
        throw const HttpException('already complete');
      }
      await next.drain<void>();
      throw HttpException('Server responded $code');
    }
    throw const HttpException('The model download did not start.');
  }

  Future<HttpClientResponse> _rangedGet(HttpClient client, Uri current, int start) async {
    debugPrint('Chalk: Gemma download continue ${current.host}');
    final request = await client.getUrl(current);
    request.followRedirects = false;
    request.headers.set(HttpHeaders.acceptHeader, '*/*');
    request.headers.set(HttpHeaders.acceptEncodingHeader, 'identity');
    request.headers.set(HttpHeaders.rangeHeader, 'bytes=$start-');
    final next = await request.close();
    final code = next.statusCode;
    debugPrint('Chalk: Gemma download response $code');
    if (code == 206 || code == 200) return next;
    await next.drain<void>();
    if (code == 416 && gemmaWeightIsComplete(start)) {
      throw const HttpException('already complete');
    }
    throw HttpException('Server responded $code');
  }

  bool get _downloadOwnsScreen =>
      _busy ||
      _setup.kind == NotesSetupKind.started ||
      _setup.kind == NotesSetupKind.pulling ||
      _setup.kind == NotesSetupKind.ready;

  @override
  Future<void> look() async {
    if (_downloadOwnsScreen) return;
    try {
      final stored = await _storedModel();
      if (_downloadOwnsScreen) return;
      if (stored != null) {
        debugPrint('Chalk: Gemma model already on this phone');
        await _ensureEngine();
        if (_downloadOwnsScreen) return;
        await _register(stored);
        _emit(const NotesSetup(kind: NotesSetupKind.ready));
        return;
      }
      await _ensureEngine();
      if (_downloadOwnsScreen) return;
      if (await _pluginHasModel()) {
        debugPrint('Chalk: Gemma model already on this phone');
        _emit(const NotesSetup(kind: NotesSetupKind.ready));
        return;
      }
      if (_downloadOwnsScreen) return;
      _emit(const NotesSetup(kind: NotesSetupKind.needsModel));
    } catch (error) {
      if (_downloadOwnsScreen) return;
      debugPrint('Chalk: Gemma download failed: $error');
      _emit(
        NotesSetup(
          kind: NotesSetupKind.failed,
          message: englishDownloadFailure(error),
        ),
      );
    }
  }

  Future<bool> _pluginHasModel() async {
    if (await FlutterEdgeAi.isModelInstalled(gemma4E2bModelId)) return true;
    return FlutterEdgeAi.isModelInstalled(gemma4E2bFile);
  }

  @override
  Future<void> startDownload() async {
    final running = _active;
    if (running != null) {
      debugPrint('Chalk: Gemma download already running');
      await running;
      return;
    }
    _busy = true;
    final run = _runDownload();
    _active = run;
    try {
      await run;
    } finally {
      _busy = false;
      if (identical(_active, run)) _active = null;
    }
  }

  Future<void> _runDownload() async {
    try {
      final stored = await _storedModel();
      if (stored != null) {
        debugPrint('Chalk: Gemma model already on this phone');
        await _ensureEngine();
        await _register(stored);
        _emit(const NotesSetup(kind: NotesSetupKind.ready));
        return;
      }
      if (Platform.isAndroid) {
        final file = await _downloadWithSystem((percent) {
          _emit(NotesSetup(kind: NotesSetupKind.pulling, percent: percent));
        });
        debugPrint('Chalk: Gemma download finished');
        await _ensureEngine();
        await _register(file);
        _emit(const NotesSetup(kind: NotesSetupKind.ready));
        return;
      }
      _emit(const NotesSetup(kind: NotesSetupKind.started));
      debugPrint('Chalk: Gemma download started');
      final file = await _downloadOfficial((percent) {
        _emit(
          NotesSetup(
            kind: NotesSetupKind.pulling,
            percent: percent,
          ),
        );
      });
      debugPrint('Chalk: Gemma download finished');
      await _ensureEngine();
      await _register(file);
      _emit(const NotesSetup(kind: NotesSetupKind.ready));
    } catch (error) {
      debugPrint('Chalk: Gemma download failed: $error');
      _emit(
        NotesSetup(
          kind: NotesSetupKind.failed,
          message: englishDownloadFailure(error),
        ),
      );
    }
  }

  @override
  Future<String> revise(String note) async {
    final trimmed = note.trim();
    if (trimmed.isEmpty) {
      throw StateError('empty note');
    }
    try {
      await _ensureEngine();
      final model = await _openModel();
      final chat = await model.createChat(
        modelType: ModelType.gemma4,
        enableThinking: false,
        maxOutputTokens: 512,
        systemInstruction:
            'Revise the student note in the next message. Keep every fact. Use clear English. Return only the revised note.',
      );
      await chat.addQueryChunk(Message.text(text: trimmed, isUser: true));
      final buffer = StringBuffer();
      await for (final response in chat.generateChatResponseAsync()) {
        if (response is TextResponse) buffer.write(response.token);
      }
      final text = revisedNoteText(buffer.toString());
      if (text.isEmpty) {
        throw StateError('empty reply');
      }
      return text;
    } catch (error) {
      throw StateError(englishReviseFailure(error));
    }
  }

  Future<InferenceModel> _openModel() async {
    try {
      return await FlutterEdgeAi.getActiveModel(
        maxTokens: 2048,
        preferredBackend: PreferredBackend.gpu,
      );
    } catch (_) {
      return FlutterEdgeAi.getActiveModel(
        maxTokens: 2048,
        preferredBackend: PreferredBackend.cpu,
      );
    }
  }
}
