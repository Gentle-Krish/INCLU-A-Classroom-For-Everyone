import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'beacon_packet.dart';
import 'join_contract.dart';

class DiscoveredBoard {
  const DiscoveredBoard({required this.host, required this.port});

  final String host;
  final int port;
}

class NearbyClass {
  const NearbyClass({required this.room, required this.host, required this.port});

  final String room;
  final String host;
  final int port;
}

/// Listens for the laptop's UDP broadcast and keeps a packet only when its
/// class number matches. The host is the sender address, not a field in the packet.
class BeaconListener {
  RawDatagramSocket? _socket;
  Completer<DiscoveredBoard?>? _pending;
  int _ticket = 0;

  /// Every class heard on this network before [timeout]. One row per class number.
  Future<List<NearbyClass>> discover({
    Duration timeout = const Duration(seconds: 4),
  }) async {
    final ticket = ++_ticket;
    await _closeSocket();
    final found = <String, NearbyClass>{};
    try {
      final socket = await _bind();
      if (ticket != _ticket) {
        socket.close();
        return const [];
      }
      _socket = socket;
      socket.listen((event) {
        if (event != RawSocketEvent.read || ticket != _ticket) return;
        final hit = _read(socket);
        if (hit == null) return;
        found[hit.room] = hit;
      });
    } catch (_) {
      return const [];
    }

    await Future<void>.delayed(timeout);
    final rows = found.values.toList();
    if (ticket == _ticket) await _closeSocket();
    return rows;
  }

  Future<DiscoveredBoard?> waitForClass(
    String expectedRoom, {
    Duration timeout = const Duration(seconds: 10),
  }) async {
    await cancel();
    final ticket = _ticket;
    final completer = Completer<DiscoveredBoard?>();
    _pending = completer;
    final wanted = expectedRoom.trim().toLowerCase();
    try {
      final socket = await _bind();
      if (ticket != _ticket) {
        socket.close();
        if (!completer.isCompleted) completer.complete(null);
        return completer.future;
      }
      _socket = socket;
      socket.listen(
        (event) {
          if (event != RawSocketEvent.read || completer.isCompleted) return;
          final hit = _read(socket);
          if (hit == null) return;
          if (hit.room.trim().toLowerCase() != wanted) return;
          if (!completer.isCompleted) {
            completer.complete(DiscoveredBoard(host: hit.host, port: hit.port));
          }
        },
        onError: (_) {
          if (!completer.isCompleted) completer.complete(null);
        },
        onDone: () {
          if (!completer.isCompleted) completer.complete(null);
        },
      );
    } catch (_) {
      if (!completer.isCompleted) completer.complete(null);
      return completer.future;
    }

    try {
      return await completer.future.timeout(timeout, onTimeout: () => null);
    } finally {
      if (identical(_pending, completer)) {
        await _closeSocket();
        _pending = null;
      }
    }
  }

  Future<void> cancel() async {
    _ticket++;
    final pending = _pending;
    _pending = null;
    await _closeSocket();
    if (pending != null && !pending.isCompleted) pending.complete(null);
  }

  Future<RawDatagramSocket> _bind() async {
    final socket = await RawDatagramSocket.bind(
      InternetAddress.anyIPv4,
      chalkBeaconPort,
      reuseAddress: true,
    );
    socket.broadcastEnabled = true;
    return socket;
  }

  NearbyClass? _read(RawDatagramSocket socket) {
    final datagram = socket.receive();
    if (datagram == null) return null;
    final text = utf8.decode(datagram.data, allowMalformed: true);
    final packet = parseBeacon(text);
    if (packet == null) return null;
    final host = datagram.address.address;
    if (host.isEmpty || host == '0.0.0.0') return null;
    return NearbyClass(room: packet.room, host: host, port: packet.port);
  }

  Future<void> _closeSocket() async {
    final socket = _socket;
    _socket = null;
    socket?.close();
  }
}
