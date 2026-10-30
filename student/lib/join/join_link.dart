import 'class_digits.dart';

/// A `chalk://join` target. Host and port are absent when only the class
/// number arrived (the Assistant phrase, or a spoken number).
class JoinTarget {
  const JoinTarget({this.host, this.port, required this.room});

  final String? host;
  final int? port;
  final String room;

  bool get hasEndpoint => host != null && host!.isNotEmpty && port != null;

  @override
  bool operator ==(Object other) =>
      other is JoinTarget &&
      other.host == host &&
      other.port == port &&
      other.room == room;

  @override
  int get hashCode => Object.hash(host, port, room);
}

/// Parses `chalk://join?host=&port=&room=`. Http and https are refused.
JoinTarget? parseChalkJoin(String raw) {
  final text = raw.trim();
  if (text.isEmpty) return null;
  final lower = text.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) return null;

  final uri = Uri.tryParse(text);
  if (uri == null || uri.scheme.toLowerCase() != 'chalk') return null;
  if (uri.host.toLowerCase() != 'join') return null;

  final room = (uri.queryParameters['room'] ?? uri.queryParameters['code'] ?? '')
      .trim();
  if (room.isEmpty) return null;

  final host = uri.queryParameters['host']?.trim();
  if (host != null && host.isNotEmpty) {
    final hostLower = host.toLowerCase();
    if (hostLower.startsWith('http://') ||
        hostLower.startsWith('https://') ||
        host.contains('://')) {
      return null;
    }
  }

  int? port;
  final portText = uri.queryParameters['port']?.trim();
  if (portText != null && portText.isNotEmpty) {
    port = int.tryParse(portText);
    if (port == null || port <= 0 || port > 65535) return null;
  }

  return JoinTarget(
    host: (host == null || host.isEmpty) ? null : host,
    port: port,
    room: room,
  );
}

/// Deep link, or the Assistant extra when the link has no room yet.
/// An http(s) URI is ignored and is never opened.
JoinTarget? mergeJoinTarget({Uri? uri, String? code}) {
  if (uri != null) {
    final scheme = uri.scheme.toLowerCase();
    if (scheme == 'http' || scheme == 'https') return null;
    if (scheme == 'chalk') {
      final parsed = parseChalkJoin(uri.toString());
      if (parsed != null) return parsed;
    }
  }
  if (code != null) {
    final digits = extractFourDigits(code);
    if (digits != null) return JoinTarget(room: digits);
  }
  return null;
}
