import 'join_contract.dart';

class LaptopAddress {
  const LaptopAddress({required this.host, required this.port});

  final String host;
  final int port;
}

/// `192.168.1.20:3000`, the `host:port` the board shows.
/// A bare address uses [chalkDefaultSocketPort]. Http and https are refused.
LaptopAddress? parseLaptopAddress(
  String raw, {
  int defaultPort = chalkDefaultSocketPort,
}) {
  final text = raw.trim();
  if (text.isEmpty) return null;
  final lower = text.toLowerCase();
  if (lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      text.contains('://') ||
      text.contains('/') ||
      text.contains(' ')) {
    return null;
  }

  final String host;
  final int port;
  final colon = text.lastIndexOf(':');
  if (colon > 0) {
    host = text.substring(0, colon);
    final parsed = int.tryParse(text.substring(colon + 1));
    if (parsed == null || parsed <= 0 || parsed > 65535) return null;
    port = parsed;
  } else {
    host = text;
    port = defaultPort;
  }
  if (!RegExp(r'^[A-Za-z0-9._-]+$').hasMatch(host)) return null;
  return LaptopAddress(host: host, port: port);
}
