import 'dart:math' as math;
import 'package:flutter/material.dart';

import 'fabric_color.dart';

class WhiteboardObject {
  WhiteboardObject({
    required this.id,
    required this.type,
    this.left = 0.0,
    this.top = 0.0,
    this.width = 0.0,
    this.height = 0.0,
    this.scaleX = 1.0,
    this.scaleY = 1.0,
    this.angle = 0.0,
    this.originX = 'left',
    this.originY = 'top',
    this.fill = Colors.transparent,
    this.stroke,
    this.strokeWidth = 0.0,
    this.opacity = 1.0,
    this.rx = 0.0,
    this.ry = 0.0,
    this.radius = 0.0,
    this.x1 = 0.0,
    this.y1 = 0.0,
    this.x2 = 0.0,
    this.y2 = 0.0,
    this.points = const [],
    this.pathData,
    this.pathOffset = Offset.zero,
    this.text = '',
    this.fontSize = 20.0,
    this.fontFamily,
    this.fontWeight = FontWeight.normal,
    this.fontStyle = FontStyle.normal,
    this.textAlign = TextAlign.left,
    this.zIndex = 0,
    this.objects = const [],
    this.raw = const {},
  });

  final String id;
  final String type;
  final double left;
  final double top;
  final double width;
  final double height;
  final double scaleX;
  final double scaleY;
  final double angle;
  final String originX;
  final String originY;
  final Color fill;
  final Color? stroke;
  final double strokeWidth;
  final double opacity;
  final double rx;
  final double ry;
  final double radius;
  final double x1;
  final double y1;
  final double x2;
  final double y2;
  final List<Offset> points;
  final dynamic pathData;
  final Offset pathOffset;
  final String text;
  final double fontSize;
  final String? fontFamily;
  final FontWeight fontWeight;
  final FontStyle fontStyle;
  final TextAlign textAlign;
  final int zIndex;
  final List<WhiteboardObject> objects;
  final Map<String, dynamic> raw;

  factory WhiteboardObject.fromMap(Map<String, dynamic> map, [String? fallbackId]) {
    final id = map['id']?.toString() ?? fallbackId ?? 'obj_${math.Random().nextInt(1000000)}';
    final type = map['type']?.toString().toLowerCase() ?? 'rect';

    final left = _toDouble(map['left'], 0.0);
    final top = _toDouble(map['top'], 0.0);
    final width = _toDouble(map['width'], 0.0);
    final height = _toDouble(map['height'], 0.0);
    final scaleX = _toDouble(map['scaleX'], 1.0);
    final scaleY = _toDouble(map['scaleY'], 1.0);
    final angle = _toDouble(map['angle'], 0.0);
    final originX = map['originX']?.toString().toLowerCase() ?? 'left';
    final originY = map['originY']?.toString().toLowerCase() ?? 'top';

    final fill = parseFabricColor(map['fill'], Colors.transparent);
    final rawStroke = map['stroke'];
    final stroke = rawStroke != null ? parseFabricColor(rawStroke) : null;
    final strokeWidth = _toDouble(map['strokeWidth'], stroke != null ? 1.0 : 0.0);
    final opacity = _toDouble(map['opacity'], 1.0).clamp(0.0, 1.0);

    final rx = _toDouble(map['rx'], 0.0);
    final ry = _toDouble(map['ry'], 0.0);
    final radius = _toDouble(map['radius'], 0.0);

    final x1 = _toDouble(map['x1'], 0.0);
    final y1 = _toDouble(map['y1'], 0.0);
    final x2 = _toDouble(map['x2'], 0.0);
    final y2 = _toDouble(map['y2'], 0.0);

    // Points for polygon / polyline
    final points = <Offset>[];
    if (map['points'] is List) {
      for (final p in map['points'] as List) {
        if (p is Map) {
          points.add(Offset(_toDouble(p['x'], 0.0), _toDouble(p['y'], 0.0)));
        }
      }
    }

    // Path offset
    var pathOffset = Offset.zero;
    if (map['pathOffset'] is Map) {
      final po = map['pathOffset'] as Map;
      pathOffset = Offset(_toDouble(po['x'], 0.0), _toDouble(po['y'], 0.0));
    }

    // Text properties
    final text = map['text']?.toString() ?? '';
    final fontSize = _toDouble(map['fontSize'], 20.0);
    final fontFamily = map['fontFamily']?.toString();
    final isBold = map['fontWeight']?.toString().toLowerCase() == 'bold';
    final isItalic = map['fontStyle']?.toString().toLowerCase() == 'italic';

    TextAlign textAlign = TextAlign.left;
    final ta = map['textAlign']?.toString().toLowerCase();
    if (ta == 'center') {
      textAlign = TextAlign.center;
    } else if (ta == 'right') {
      textAlign = TextAlign.right;
    }

    final zIndex = _toInt(map['zIndex'], 0);

    // Group children
    final groupObjects = <WhiteboardObject>[];
    if (map['objects'] is List) {
      for (final child in map['objects'] as List) {
        if (child is Map) {
          groupObjects.add(WhiteboardObject.fromMap(Map<String, dynamic>.from(child)));
        }
      }
    }

    return WhiteboardObject(
      id: id,
      type: type,
      left: left,
      top: top,
      width: width,
      height: height,
      scaleX: scaleX,
      scaleY: scaleY,
      angle: angle,
      originX: originX,
      originY: originY,
      fill: fill,
      stroke: stroke,
      strokeWidth: strokeWidth,
      opacity: opacity,
      rx: rx,
      ry: ry,
      radius: radius,
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      points: points,
      pathData: map['path'],
      pathOffset: pathOffset,
      text: text,
      fontSize: fontSize,
      fontFamily: fontFamily,
      fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
      fontStyle: isItalic ? FontStyle.italic : FontStyle.normal,
      textAlign: textAlign,
      zIndex: zIndex,
      objects: groupObjects,
      raw: map,
    );
  }

  static double _toDouble(dynamic val, double fallback) {
    if (val == null) return fallback;
    if (val is num) return val.toDouble();
    if (val is String) return double.tryParse(val) ?? fallback;
    return fallback;
  }

  static int _toInt(dynamic val, int fallback) {
    if (val == null) return fallback;
    if (val is num) return val.toInt();
    if (val is String) return int.tryParse(val) ?? fallback;
    return fallback;
  }
}

class WhiteboardState extends ChangeNotifier {
  final Map<String, WhiteboardObject> _objects = {};
  List<double>? _hostViewport;

  List<WhiteboardObject> get objects {
    final list = _objects.values.toList();
    list.sort((a, b) => a.zIndex.compareTo(b.zIndex));
    return list;
  }

  int get objectCount => _objects.length;
  List<double>? get hostViewport => _hostViewport;

  void loadSnapshot(dynamic data) {
    _objects.clear();
    if (data == null) {
      notifyListeners();
      return;
    }

    List? list;
    if (data is Map && data['objects'] is List) {
      list = data['objects'] as List;
    } else if (data is List) {
      list = data;
    }

    if (list != null) {
      for (var i = 0; i < list.length; i++) {
        final item = list[i];
        if (item is Map) {
          final map = Map<String, dynamic>.from(item);
          final id = map['id']?.toString() ?? 'obj_$i';
          if (id == 'agent_cursor' || id == 'spatial_indicator') continue;
          map['zIndex'] ??= i;
          _objects[id] = WhiteboardObject.fromMap(map, id);
        }
      }
    }
    notifyListeners();
  }

  void applyDelta(Map<String, dynamic> delta) {
    final action = delta['action']?.toString();
    final objectId = delta['objectId']?.toString();
    if (objectId == null || objectId.isEmpty) return;
    if (objectId == 'agent_cursor' || objectId == 'spatial_indicator') return;

    if (action == 'remove') {
      _objects.remove(objectId);
      notifyListeners();
      return;
    }

    if (action == 'add' || action == 'modify') {
      final objData = delta['objectData'];
      if (objData is Map) {
        final existing = _objects[objectId];
        final nextMap = Map<String, dynamic>.from(existing?.raw ?? {});
        nextMap.addAll(Map<String, dynamic>.from(objData));
        nextMap['id'] = objectId;
        _objects[objectId] = WhiteboardObject.fromMap(nextMap, objectId);
        notifyListeners();
      }
    }
  }

  void updateViewport(List<double> viewport) {
    _hostViewport = viewport;
    notifyListeners();
  }

  void clear() {
    _objects.clear();
    _hostViewport = null;
    notifyListeners();
  }
}
