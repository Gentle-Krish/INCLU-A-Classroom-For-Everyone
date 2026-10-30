import 'dart:convert';

class BeaconPacket {
  const BeaconPacket({required this.room, required this.port});

  final String room;
  final int port;
}

/// Reads a class beacon. The matching room is checked by the listener.
/// Laptop shape: {"room":"4821","classNumber":"4821","port":3000}
/// `roomId`, `classNumber`, and `code` are accepted for the class number.
/// `socketPort` is accepted for the Socket.IO port.
BeaconPacket? parseBeacon(String raw) {
  final text = raw.trim();
  if (text.isEmpty) return null;
  if (text.startsWith('{')) {
    try {
      final decoded = jsonDecode(text);
      if (decoded is Map) {
        final room = _roomFrom(decoded);
        final port = _portFrom(decoded);
        if (room != null && port != null) {
          return BeaconPacket(room: room, port: port);
        }
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  final roomMatch = RegExp(
    r'(?:roomId|room|classNumber|code)\s*[=:]\s*([A-Za-z0-9]+)',
    caseSensitive: false,
  ).firstMatch(text);
  final portMatch = RegExp(
    r'(?:socketPort|port)\s*[=:]\s*(\d{2,5})',
    caseSensitive: false,
  ).firstMatch(text);
  if (roomMatch != null && portMatch != null) {
    final port = int.tryParse(portMatch.group(1)!);
    if (port != null && port > 0 && port <= 65535) {
      return BeaconPacket(room: roomMatch.group(1)!, port: port);
    }
  }
  return null;
}

String? _roomFrom(Map<dynamic, dynamic> map) {
  final values = <String>[];
  for (final key in ['room', 'roomId', 'classNumber', 'code']) {
    final value = map[key];
    if (value == null) continue;
    final text = value.toString().trim();
    if (text.isNotEmpty) values.add(text);
  }
  for (final value in values) {
    if (RegExp(r'^\d{4}$').hasMatch(value)) return value;
  }
  if (values.isEmpty) return null;
  return values.first;
}

int? _portFrom(Map<dynamic, dynamic> map) {
  for (final key in ['port', 'socketPort']) {
    final value = map[key];
    if (value == null) continue;
    final port = value is int ? value : int.tryParse(value.toString());
    if (port != null && port > 0 && port <= 65535) return port;
  }
  return null;
}
