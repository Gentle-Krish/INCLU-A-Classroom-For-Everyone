import 'package:app_links/app_links.dart';
import 'package:flutter/services.dart';

import 'join_link.dart';

const joinChannelName = 'app.chalk.chalk_student/join';

/// Reads `chalk://` links and the Assistant `code` extra. Never opens a browser.
class JoinIntents {
  JoinIntents({AppLinks? links, MethodChannel? channel})
    : _links = links ?? AppLinks(),
      _channel = channel ?? const MethodChannel(joinChannelName);

  final AppLinks _links;
  final MethodChannel _channel;

  Future<JoinTarget?> initialTarget() async {
    Uri? uri;
    String? code;
    try {
      uri = await _links.getInitialLink();
    } catch (_) {}
    try {
      final raw = await _channel.invokeMethod<Object?>('consumeJoinCode');
      if (raw is String) {
        code = raw;
      } else if (raw is Map) {
        final map = raw.cast<Object?, Object?>();
        final extra = map['code'];
        final uriText = map['uri'];
        if (extra is String && extra.isNotEmpty) code = extra;
        if (uri == null && uriText is String && uriText.isNotEmpty) {
          uri = Uri.tryParse(uriText);
        }
      }
    } catch (_) {}
    return mergeJoinTarget(uri: uri, code: code);
  }

  void listen(void Function(JoinTarget target) onTarget) {
    _links.uriLinkStream.listen((uri) {
      final target = mergeJoinTarget(uri: uri);
      if (target != null) onTarget(target);
    }, onError: (_) {});
    _channel.setMethodCallHandler((call) async {
      if (call.method != 'joinIntent') return;
      final args = (call.arguments as Map?)?.cast<Object?, Object?>() ?? {};
      final uriText = args['uri'] as String?;
      final code = args['code'] as String?;
      final target = mergeJoinTarget(
        uri: uriText == null ? null : Uri.tryParse(uriText),
        code: code,
      );
      if (target != null) onTarget(target);
    });
  }
}
