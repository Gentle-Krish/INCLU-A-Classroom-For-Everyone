import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../join/join_link.dart';
import '../theme/chalk_theme.dart';

/// On-device scan. A code that is not `chalk://join` with host, port, and room
/// stays on this screen. Nothing is opened in a browser.
class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  bool _done = false;
  bool _rejected = false;

  void _onDetect(BarcodeCapture capture) {
    if (_done) return;
    String? raw;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue;
      if (value != null && value.isNotEmpty) {
        raw = value;
        break;
      }
    }
    if (raw == null) return;
    final target = parseChalkJoin(raw);
    if (target == null || !target.hasEndpoint) {
      if (!_rejected) setState(() => _rejected = true);
      return;
    }
    _done = true;
    Navigator.of(context).pop(raw);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ChalkColors.cream,
      body: Stack(
        children: [
          MobileScanner(onDetect: _onDetect),
          SafeArea(
            child: Align(
              alignment: Alignment.topLeft,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Container(
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: ChalkColors.cream,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close, color: ChalkColors.ink),
                  ),
                ),
              ),
            ),
          ),
          if (_rejected)
            const Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: EdgeInsets.fromLTRB(24, 0, 24, 36),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: ChalkColors.cream,
                    borderRadius: BorderRadius.all(Radius.circular(24)),
                  ),
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                    child: Text(
                      'That code is not a Chalk class.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: ChalkColors.ink,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
