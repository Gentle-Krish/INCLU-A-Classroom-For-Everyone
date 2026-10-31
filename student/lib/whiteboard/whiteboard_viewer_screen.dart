import 'package:flutter/material.dart';

import '../join/class_socket.dart';
import '../theme/chalk_theme.dart';
import '../widgets/clay_button.dart';
import 'whiteboard_model.dart';
import 'whiteboard_painter.dart';

class WhiteboardViewerScreen extends StatefulWidget {
  const WhiteboardViewerScreen({
    super.key,
    required this.whiteboardState,
    this.socket,
    this.room = '',
  });

  final WhiteboardState whiteboardState;
  final ClassSocket? socket;
  final String room;

  @override
  State<WhiteboardViewerScreen> createState() => _WhiteboardViewerScreenState();
}

class _WhiteboardViewerScreenState extends State<WhiteboardViewerScreen> {
  final TransformationController _controller = TransformationController();
  static const double _boardWidth = 3600.0;
  static const double _boardHeight = 2400.0;

  @override
  void initState() {
    super.initState();
    _centerBoard();
    // Request latest snapshot upon opening
    widget.socket?.requestCanvasSnapshot();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _centerBoard() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final size = MediaQuery.of(context).size;
      final dx = (size.width - _boardWidth * 0.4) / 2.0;
      final dy = (size.height - _boardHeight * 0.4) / 2.0;
      final translation = Matrix4.translationValues(dx > 0 ? dx : 0.0, dy > 0 ? dy : 0.0, 0.0);
      final scaling = Matrix4.diagonal3Values(0.4, 0.4, 1.0);
      _controller.value = translation * scaling;
    });
  }

  void _followHostViewport() {
    final vpt = widget.whiteboardState.hostViewport;
    if (vpt != null && vpt.length >= 6) {
      final zoom = vpt[0] > 0 ? vpt[0] : 1.0;
      final panX = vpt[4];
      final panY = vpt[5];

      final translation = Matrix4.translationValues(panX * 0.5, panY * 0.5, 0.0);
      final scaling = Matrix4.diagonal3Values(zoom * 0.7, zoom * 0.7, 1.0);
      setState(() {
        _controller.value = translation * scaling;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Aligned to teacher viewport'),
          duration: Duration(seconds: 1),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      _centerBoard();
    }
  }

  void _zoom(double factor) {
    final matrix = _controller.value.clone();
    final scaling = Matrix4.diagonal3Values(factor, factor, 1.0);
    setState(() => _controller.value = matrix * scaling);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ChalkColors.cream,
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            _buildTopBar(context),

            // Main Whiteboard Area
            Expanded(
              child: ClipRect(
                child: ListenableBuilder(
                  listenable: widget.whiteboardState,
                  builder: (context, _) {
                    final objects = widget.whiteboardState.objects;
                    return Stack(
                      children: [
                        InteractiveViewer(
                          transformationController: _controller,
                          minScale: 0.15,
                          maxScale: 4.0,
                          boundaryMargin: const EdgeInsets.all(1200),
                          constrained: false,
                          child: SizedBox(
                            width: _boardWidth,
                            height: _boardHeight,
                            child: CustomPaint(
                              painter: WhiteboardPainter(
                                objects: objects,
                                backgroundColor: const Color(0xFFFAF9F6),
                              ),
                              size: const Size(_boardWidth, _boardHeight),
                            ),
                          ),
                        ),

                        // Empty State Overlay if no objects
                        if (objects.isEmpty)
                          Positioned.fill(
                            child: IgnorePointer(
                              child: Center(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 24,
                                    vertical: 16,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    borderRadius: BorderRadius.circular(24),
                                    boxShadow: const [
                                      BoxShadow(
                                        color: Color(0x12000000),
                                        blurRadius: 16,
                                        offset: Offset(0, 4),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.draw_outlined,
                                        size: 40,
                                        color: ChalkColors.brown,
                                      ),
                                      const SizedBox(height: 8),
                                      const Text(
                                        'Waiting for the board',
                                        style: TextStyle(
                                          color: ChalkColors.ink,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 16,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Anything drawn or written by the teacher\nwill appear here live.',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          color: ChalkColors.ink.withValues(alpha: 0.6),
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),

                        // Floating Quick Controls
                        Positioned(
                          right: 16,
                          bottom: 16,
                          child: _buildFloatingControls(),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: const BoxDecoration(
        color: ChalkColors.cream,
        border: Border(
          bottom: BorderSide(color: Color(0x14000000), width: 1.5),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, color: ChalkColors.ink, size: 20),
            onPressed: () => Navigator.of(context).pop(),
          ),
          const SizedBox(width: 4),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 9,
                    height: 9,
                    decoration: const BoxDecoration(
                      color: ChalkColors.green,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'Live Whiteboard',
                    style: TextStyle(
                      color: ChalkColors.ink,
                      fontWeight: FontWeight.w800,
                      fontSize: 17,
                    ),
                  ),
                ],
              ),
              ListenableBuilder(
                listenable: widget.whiteboardState,
                builder: (context, _) {
                  final count = widget.whiteboardState.objectCount;
                  return Text(
                    count == 1 ? '1 item on board' : '$count items on board',
                    style: TextStyle(
                      color: ChalkColors.ink.withValues(alpha: 0.6),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  );
                },
              ),
            ],
          ),
          const Spacer(),
          // Refresh Button
          IconButton(
            tooltip: 'Refresh Snapshot',
            icon: const Icon(Icons.refresh, color: ChalkColors.brownDeep),
            onPressed: () {
              widget.socket?.requestCanvasSnapshot();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Requested fresh snapshot'),
                  duration: Duration(milliseconds: 700),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
          // Follow teacher button
          ClayButton(
            label: 'Sync',
            color: ChalkColors.green,
            lip: ChalkColors.greenLip,
            onPressed: _followHostViewport,
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingControls() {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x18000000),
            blurRadius: 14,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.add, color: ChalkColors.ink),
            tooltip: 'Zoom in',
            onPressed: () => _zoom(1.25),
          ),
          IconButton(
            icon: const Icon(Icons.remove, color: ChalkColors.ink),
            tooltip: 'Zoom out',
            onPressed: () => _zoom(0.8),
          ),
          const Divider(height: 8, thickness: 1),
          IconButton(
            icon: const Icon(Icons.fit_screen_outlined, color: ChalkColors.brownDeep),
            tooltip: 'Center View',
            onPressed: _centerBoard,
          ),
        ],
      ),
    );
  }
}
